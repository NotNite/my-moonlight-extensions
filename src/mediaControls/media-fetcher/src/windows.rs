use crate::{
    base::{send_response, MediaFetcher},
    proto::{PlaybackStatus, Request},
};
use async_trait::async_trait;
use base64::Engine;
use image::{imageops::FilterType::Triangle, GenericImageView, Pixel};
use std::{io::Cursor, sync::Arc};
use tokio::sync::Mutex;
use windows::{
    Media::{
        Control::{
            GlobalSystemMediaTransportControlsSession,
            GlobalSystemMediaTransportControlsSessionManager,
            GlobalSystemMediaTransportControlsSessionPlaybackStatus,
        },
        MediaPlaybackAutoRepeatMode,
    },
    Storage::Streams::DataReader,
};

const WHAT_ARE_THEY_DOING_AT_MICROSOFT: f64 = 10_000_000.;

#[derive(Default)]
pub struct WindowsMediaFetcher {
    session_manager: Option<Arc<Mutex<GlobalSystemMediaTransportControlsSessionManager>>>,
}

impl WindowsMediaFetcher {
    async fn get_status(
        &self,
        session: GlobalSystemMediaTransportControlsSession,
    ) -> anyhow::Result<PlaybackStatus> {
        let timeline_properties = session.GetTimelineProperties()?;
        let playback_info = session.GetPlaybackInfo()?;
        let playback_status = playback_info.PlaybackStatus()?;
        let app_media_id = session.SourceAppUserModelId()?;

        let elapsed = timeline_properties.Position().unwrap_or_default().Duration as f64
            / WHAT_ARE_THEY_DOING_AT_MICROSOFT;
        let duration = timeline_properties.EndTime().unwrap_or_default().Duration as f64
            / WHAT_ARE_THEY_DOING_AT_MICROSOFT;

        let mut new_status = PlaybackStatus {
            player_name: app_media_id.to_string_lossy(),
            title: String::new(),
            artist: String::new(),
            album: String::new(),
            album_artist: String::new(),
            elapsed,
            duration,
            playing: playback_status
                == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing,
            repeat: match playback_info
                .AutoRepeatMode()
                .ok()
                .map(|x| x.Value().ok())
                .flatten()
                .unwrap_or(MediaPlaybackAutoRepeatMode::None)
            {
                MediaPlaybackAutoRepeatMode::List => crate::proto::RepeatMode::All,
                MediaPlaybackAutoRepeatMode::Track => crate::proto::RepeatMode::One,
                _ => crate::proto::RepeatMode::None,
            },
            shuffle: playback_info
                .IsShuffleActive()
                .ok()
                .map(|x| x.Value().ok())
                .flatten()
                .unwrap_or(false),
            track_number: 0,
            total_tracks: 0,
        };

        if let Ok(media_properties) = session.TryGetMediaPropertiesAsync()?.await {
            new_status.title = media_properties
                .Title()
                .unwrap_or_default()
                .to_string_lossy();
            new_status.artist = media_properties
                .Artist()
                .unwrap_or_default()
                .to_string_lossy();
            new_status.album = media_properties
                .AlbumTitle()
                .unwrap_or_default()
                .to_string_lossy();
            new_status.album_artist = media_properties
                .AlbumArtist()
                .unwrap_or_default()
                .to_string_lossy();
            new_status.track_number = media_properties.TrackNumber().unwrap_or_default();
            new_status.total_tracks = media_properties.AlbumTrackCount().unwrap_or_default();
        }

        Ok(new_status)
    }
}

#[async_trait(?Send)]
impl MediaFetcher for WindowsMediaFetcher {
    async fn init(&mut self) -> anyhow::Result<()> {
        let session_manager =
            GlobalSystemMediaTransportControlsSessionManager::RequestAsync()?.await?;
        self.session_manager = Some(Arc::new(Mutex::new(session_manager)));
        Ok(())
    }

    async fn run(&self) -> anyhow::Result<()> {
        let manager = self.session_manager.as_ref().unwrap();
        let mut prev_session = PlaybackStatus::default();

        loop {
            let new_status = {
                let manager = manager.lock().await;
                if let Ok(session) = manager.GetCurrentSession() {
                    if let Ok(result) = self.get_status(session).await {
                        // Everything is playing
                        result
                    } else {
                        // Something went wrong, let's pretend nothing is playing
                        // GetCurrentSession likes to return error 0 ("The operation completed successfully" lmao) sometimes
                        PlaybackStatus::default()
                    }
                } else {
                    // Nothing is playing
                    PlaybackStatus::default()
                }
            };

            if prev_session != new_status {
                send_response(crate::proto::Response::PlaybackStatus(new_status.clone()))?;
                prev_session = new_status;
            }

            // I hate polling but the events from this kinda suck
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        }
    }

    async fn handle_command(&self, request: Request) -> anyhow::Result<()> {
        let session = self
            .session_manager
            .as_ref()
            .unwrap()
            .lock()
            .await
            .GetCurrentSession()?;

        match request {
            Request::GetAlbumArt => {
                let mut media_properties = None;

                // Try to get the media properties multiple times since thie API returns cryptic errors
                // (more of that error 0 stuff)
                for _ in 0..5 {
                    if let Ok(request) = session.TryGetMediaPropertiesAsync() {
                        if let Ok(data) = request.await {
                            media_properties = Some(data);
                            break;
                        }
                        break;
                    }

                    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                }

                if media_properties.is_none() {
                    return Ok(());
                }
                let media_properties = media_properties.unwrap();

                let thumbnail = media_properties.Thumbnail()?;
                let app_media_id = session.SourceAppUserModelId()?.to_string_lossy();

                // Use .get() here to avoid it complaining about future stuff
                let handle = thumbnail.OpenReadAsync()?.get()?;
                let stream = handle.GetInputStreamAt(0)?;
                let reader = DataReader::CreateDataReader(&stream)?;

                // This API sucks so bad
                reader.LoadAsync(handle.Size()? as u32)?.get()?;
                let mut buf = vec![0u8; handle.Size()? as usize];
                reader.ReadBytes(&mut buf)?;

                // API gives us many formats, let's only send PNG
                let mut image = image::load_from_memory(&buf)?;

                // Spotify free accounts give a watermarked image
                match app_media_id.as_str() {
                    "Spotify.exe" | "SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify" => {
                        let top_left = image.get_pixel(0, 0);
                        let col = top_left.to_rgba();
                        if col[0] == 0 && col[1] == 0 && col[2] == 0 && col[3] == 0 {
                            image = image.crop_imm(34, 1, 233, 233);
                        }
                    }
                    _ => {}
                }

                if image.width() > 1000 {
                    let ratio = image.height() as f32 / image.width() as f32;
                    image = image.resize(1000, (1000_f32 * ratio).ceil() as u32, Triangle);
                } else if image.height() > 1000 {
                    let ratio = image.width() as f32 / image.height() as f32;
                    image = image.resize((1000_f32 * ratio).ceil() as u32, 1000, Triangle);
                }

                let mut bytes = Vec::new();
                image.write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::Png)?;

                let base64 = base64::prelude::BASE64_STANDARD.encode(&bytes);
                let base64 = format!("data:image/png;base64,{}", base64);
                send_response(crate::proto::Response::AlbumArt { data: base64 })?;

                Ok(())
            }

            Request::Play | Request::Pause | Request::SkipBackward | Request::SkipForward => {
                match request {
                    Request::Play | Request::Pause => {
                        let status = session.GetPlaybackInfo()?.PlaybackStatus()?;
                        if status
                            == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing
                        {
                            session.TryPauseAsync()?.await?;
                        } else {
                            session.TryPlayAsync()?.await?;
                        }
                    }

                    Request::SkipBackward => {
                        session.TrySkipPreviousAsync()?.await?;
                    }

                    Request::SkipForward => {
                        session.TrySkipNextAsync()?.await?;
                    }

                    _ => unreachable!(),
                }

                Ok(())
            }

            Request::SetRepeatMode { mode } => {
                session
                    .TryChangeAutoRepeatModeAsync(match mode {
                        crate::proto::RepeatMode::None => MediaPlaybackAutoRepeatMode::None,
                        crate::proto::RepeatMode::All => MediaPlaybackAutoRepeatMode::List,
                        crate::proto::RepeatMode::One => MediaPlaybackAutoRepeatMode::Track,
                    })?
                    .await?;
                Ok(())
            }

            Request::SetShuffle { shuffle } => {
                session.TryChangeShuffleActiveAsync(shuffle)?.await?;
                Ok(())
            }

            Request::Seek { position } => {
                let position = position * WHAT_ARE_THEY_DOING_AT_MICROSOFT;
                session
                    .TryChangePlaybackPositionAsync(position as i64)?
                    .await?;
                Ok(())
            }
        }
    }
}
