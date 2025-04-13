use crate::{
    base::{send_response, MediaFetcher},
    proto::{PlaybackStatus, Request},
};
use async_trait::async_trait;
use base64::Engine;
use media_remote::{
    get_now_playing_info, send_command, set_elapsed_time, Command, InfoTypes, NowPlaying, Number,
};
use std::io::Cursor;

#[derive(Default)]
pub struct MacMediaFetcher {}

impl MacMediaFetcher {
    fn get_status(now_playing: &NowPlaying) -> anyhow::Result<PlaybackStatus> {
        let mut status = PlaybackStatus {
            player_name: String::new(),
            title: String::new(),
            artist: String::new(),
            album: String::new(),
            album_artist: String::new(),
            elapsed: 0.,
            duration: 0.,
            playing: false,
            repeat: crate::proto::RepeatMode::None,
            shuffle: false,
            track_number: 0,
            total_tracks: 0,
        };

        if let Some(info) = now_playing.get_info().as_ref() {
            if let Some(bundle_name) = &info.bundle_name {
                // trim off ".app" on app bundle
                status.player_name = bundle_name
                    .strip_suffix(".app")
                    .unwrap_or(bundle_name)
                    .to_string();
            }
            if let Some(title) = &info.title {
                status.title = title.clone().to_string();
            }
            if let Some(artists) = &info.artist {
                // multiple artists will be comma-separated
                status.artist = artists.clone().to_string();
                // album artist not provided by MediaRemote
                status.album_artist = artists.clone().to_string();
            }
            if let Some(album) = &info.album {
                status.album = album.clone().to_string();
            }
            if let Some(elapsed) = info.elapsed_time {
                status.elapsed = elapsed;
            }
            if let Some(dur) = info.duration {
                status.duration = dur;
            }
            if let Some(playing) = info.is_playing {
                status.playing = playing;
            }
        } else {
            anyhow::bail!("Failed to get now playing info");
        }

        // fields not present in NowPlayingInfo
        if let Some(info_map) = get_now_playing_info() {
            if let Some(InfoTypes::Number(Number::Signed(mode))) =
                info_map.get(&format_mr_key("ShuffleMode"))
            {
                match mode {
                    1 => {
                        status.shuffle = false;
                    }
                    // yes really, three
                    3 => {
                        status.shuffle = true;
                    }
                    // unsure if other "modes" exist, the ios version of this api which is actually documented seems to suggest so
                    _ => {
                        status.shuffle = true;
                    }
                }
            }
            if let Some(InfoTypes::Number(Number::Signed(mode))) =
                info_map.get(&format_mr_key("RepeatMode"))
            {
                match mode {
                    1 => {
                        status.repeat = crate::proto::RepeatMode::None;
                    }
                    2 => {
                        status.repeat = crate::proto::RepeatMode::One;
                    }
                    3 => {
                        status.repeat = crate::proto::RepeatMode::All;
                    }
                    _ => (),
                }
            }
            if let Some(InfoTypes::Number(Number::Signed(track))) =
                info_map.get(&format_mr_key("TrackNumber"))
            {
                status.track_number = *track as i32;
            }
            if let Some(InfoTypes::Number(Number::Signed(tracks))) =
                info_map.get(&format_mr_key("TotalTrackCount"))
            {
                status.total_tracks = *tracks as i32;
            }
        }

        Ok(status)
    }
}

#[async_trait(?Send)]
impl MediaFetcher for MacMediaFetcher {
    async fn init(&mut self) -> anyhow::Result<()> {
        Ok(())
    }

    async fn run(&self) -> anyhow::Result<()> {
        let now_playing = NowPlaying::new();

        let local = tokio::task::LocalSet::new();
        local
            .run_until(async move {
                tokio::task::spawn_local(async move {
                    let mut prev_session = PlaybackStatus::default();

                    loop {
                        let new_status =
                            MacMediaFetcher::get_status(&now_playing).unwrap_or_default();

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
        let now_playing = media_remote::NowPlaying::new();

        match request {
            Request::GetAlbumArt => {
                if let Some(info) = now_playing.get_info().as_ref() {
                    if let Some(image) = &info.album_cover {
                        let mut bytes = Vec::new();
                        image.write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::Png)?;
                        let base64 = base64::prelude::BASE64_STANDARD.encode(&bytes);
                        let data = format!("data:image/png;base64,{}", base64);
                        send_response(crate::proto::Response::AlbumArt { data })?;
                    } else {
                        anyhow::bail!("Failed to get cover image");
                    }
                } else {
                    anyhow::bail!("Failed to get now playing info");
                }
            }

            Request::Play | Request::Pause => {
                if !now_playing.toggle() {
                    anyhow::bail!("Failed to toggle play/pause");
                }
            }

            Request::SkipBackward => {
                if !now_playing.previous() {
                    anyhow::bail!("Failed to skip backward");
                }
            }

            Request::SkipForward => {
                if !now_playing.next() {
                    anyhow::bail!("Failed to skip forward");
                }
            }

            Request::SetRepeatMode { mode } => {
                let target = match mode {
                    crate::proto::RepeatMode::None => 1,
                    crate::proto::RepeatMode::One => 2,
                    crate::proto::RepeatMode::All => 3,
                };

                if let Some(info) = get_now_playing_info() {
                    if let Some(InfoTypes::Number(Number::Signed(cur))) =
                        info.get(&format_mr_key("RepeatMode"))
                    {
                        // ToggleRepeat literally doesn't do anything even with Music.app so I don't know what the command actually does
                        // i'm assuming it goes 1 -> 2 -> 3
                        for _ in 0..(target - cur).rem_euclid(3) {
                            if !send_command(Command::ToggleRepeat) {
                                anyhow::bail!("Failed to skip forward");
                            }
                        }
                    } else {
                        anyhow::bail!("Failed to get repeat mode");
                    }
                } else {
                    anyhow::bail!("Failed to get now playing info");
                }
            }

            Request::SetShuffle { shuffle } => {
                if let Some(info) = get_now_playing_info() {
                    if let Some(InfoTypes::Number(Number::Signed(cur))) =
                        info.get(&format_mr_key("ShuffleMode"))
                    {
                        // ToggleShuffle also does absolutely nothing
                        if (*cur == 3) != shuffle && !send_command(Command::ToggleShuffle) {
                            anyhow::bail!("Failed to skip forward");
                        }
                    } else {
                        anyhow::bail!("Failed to get shuffle mode");
                    }
                } else {
                    anyhow::bail!("Failed to get now playing info");
                }
            }

            Request::Seek { position } => {
                set_elapsed_time(position);
            }
        }

        Ok(())
    }
}

// see table at bottom: https://github.com/kirtan-shah/nowplaying-cli/blob/main/README.md
fn format_mr_key(suffix: &str) -> String {
    format!("kMRMediaRemoteNowPlayingInfo{}", suffix)
}
