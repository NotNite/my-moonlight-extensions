use std::{io::Cursor, time::Duration};

use crate::{
    base::{send_response, MediaFetcher},
    proto::{PlaybackStatus, Request},
};
use async_trait::async_trait;
use base64::Engine;
use mpris::PlayerFinder;

#[derive(Default)]
pub struct LinuxMediaFetcher {}

impl LinuxMediaFetcher {
    async fn get_status(player: &mpris::Player) -> anyhow::Result<PlaybackStatus> {
        let playback_status = player
            .get_playback_status()
            .unwrap_or(mpris::PlaybackStatus::Stopped);

        let mut status = PlaybackStatus {
            player_name: player.identity(),
            title: String::new(),
            artist: String::new(),
            album: String::new(),
            album_artist: String::new(),
            elapsed: 0.,
            duration: 0.,
            playing: playback_status == mpris::PlaybackStatus::Playing,
            repeat: match player.get_loop_status().unwrap_or(mpris::LoopStatus::None) {
                mpris::LoopStatus::Playlist => crate::proto::RepeatMode::All,
                mpris::LoopStatus::Track => crate::proto::RepeatMode::One,
                mpris::LoopStatus::None => crate::proto::RepeatMode::None,
            },
            shuffle: player.get_shuffle().unwrap_or(false),
            track_number: 0,
            total_tracks: 0,
        };

        if let Ok(metadata) = player.get_metadata() {
            status.title = metadata.title().unwrap_or_default().to_string();
            status.artist = metadata
                .artists()
                .unwrap_or_default()
                .iter()
                .map(|x| x.to_string())
                .collect::<Vec<String>>()
                .join(", ");
            status.album = metadata.album_name().unwrap_or_default().to_string();
            status.album_artist = metadata
                .album_artists()
                .unwrap_or_default()
                .iter()
                .map(|x| x.to_string())
                .collect::<Vec<String>>()
                .join(", ");
            status.track_number = metadata.track_number().unwrap_or_default();
            // mpris nor xesam don't have a total track count property :(
            status.total_tracks = status.track_number;

        }

        Ok(status)
    }
}

#[async_trait(?Send)]
impl MediaFetcher for LinuxMediaFetcher {
    async fn init(&mut self) -> anyhow::Result<()> {
        Ok(())
    }

    async fn run(&self) -> anyhow::Result<()> {
        let finder = PlayerFinder::new()?;

        let local = tokio::task::LocalSet::new();
        local
            .run_until(async move {
                tokio::task::spawn_local(async move {
                    let mut prev_session = PlaybackStatus::default();

                    loop {
                        let new_status = {
                            if let Ok(player) = finder.find_first() {
                                if let Ok(result) = LinuxMediaFetcher::get_status(&player).await {
                                    // Everything is playing
                                    result
                                } else {
                                    // Something went wrong, let's pretend nothing is playing
                                    PlaybackStatus::default()
                                }
                            } else {
                                // Nothing is playing
                                PlaybackStatus::default()
                            }
                        };

                        if prev_session != new_status {
                            send_response(crate::proto::Response::PlaybackStatus(
                                new_status.clone(),
                            ))?;
                            prev_session = new_status;
                        }

                        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                    }

                    #[allow(unreachable_code)]
                    anyhow::Result::<()>::Ok(())
                })
                .await?
            })
            .await?;

        Ok(())
    }

    async fn handle_command(&self, request: Request) -> anyhow::Result<()> {
        let player = PlayerFinder::new()?.find_first()?;

        match request {
            Request::GetAlbumArt => {
                let str = player
                    .get_metadata()?
                    .art_url()
                    .unwrap_or_default()
                    .to_string();
                if str.starts_with("file://") {
                    let path = str.trim_start_matches("file://");
                    let path = percent_encoding::percent_decode_str(path).decode_utf8()?;
                    let path = path.to_string();

                    let image = image::load_from_memory(&std::fs::read(&path)?)?;
                    let mut bytes = Vec::new();
                    image.write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::Png)?;

                    let base64 = base64::prelude::BASE64_STANDARD.encode(&bytes);
                    let base64 = format!("data:image/png;base64,{}", base64);
                    send_response(crate::proto::Response::AlbumArt { data: base64 })?;
                }
            }

            Request::Play | Request::Pause => {
                player.play_pause()?;
            }

            Request::SkipBackward => {
                player.previous()?;
            }

            Request::SkipForward => {
                player.next()?;
            }

            Request::SetRepeatMode { mode } => {
                player.set_loop_status(match mode {
                    crate::proto::RepeatMode::All => mpris::LoopStatus::Playlist,
                    crate::proto::RepeatMode::One => mpris::LoopStatus::Track,
                    crate::proto::RepeatMode::None => mpris::LoopStatus::None,
                })?;
            }

            Request::SetShuffle { shuffle } => {
                player.set_shuffle(shuffle)?;
            }

            Request::Seek { position } => {
                let track_list = player.get_track_list()?;
                let track = track_list
                    .get(0)
                    .ok_or_else(|| anyhow::anyhow!("No track is currently playing"))?;
                player.set_position(track.clone(), &Duration::from_secs_f64(position))?;
            }
        }

        Ok(())
    }
}
