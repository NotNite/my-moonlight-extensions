use crate::{
    base::{send_response, MediaFetcher},
    proto::{PlaybackStatus, Request},
};
use async_trait::async_trait;
use base64::Engine;
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

        let elapsed = timeline_properties.Position().unwrap_or_default().Duration as f64
            / WHAT_ARE_THEY_DOING_AT_MICROSOFT;
        let duration = timeline_properties.EndTime().unwrap_or_default().Duration as f64
            / WHAT_ARE_THEY_DOING_AT_MICROSOFT;

        let mut new_status = PlaybackStatus {
            title: String::new(),
            artist: String::new(),
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
        }

        Ok(new_status)
    }
}

#[async_trait]
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
                    let result = self.get_status(session).await;
                    if let Ok(result) = result {
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

                // Use .get() here to avoid it complaining about future stuff
                let handle = thumbnail.OpenReadAsync()?.get()?;
                let stream = handle.GetInputStreamAt(0)?;
                let reader = DataReader::CreateDataReader(&stream)?;

                // This API sucks so bad
                reader.LoadAsync(handle.Size()? as u32)?.get()?;
                let mut buf = vec![0u8; handle.Size()? as usize];
                reader.ReadBytes(&mut buf)?;

                // API gives us many formats, let's only send PNG
                let image = image::load_from_memory(&buf)?;
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
        }
    }
}
