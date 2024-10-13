use crate::{
    base::{send_response, MediaFetcher},
    proto::{PlaybackStatus, Request},
};
use async_trait::async_trait;
use base64::Engine;
use std::io::Cursor;
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
    session_manager: Option<GlobalSystemMediaTransportControlsSessionManager>,
}

impl WindowsMediaFetcher {
    async fn run_until_session_closes(
        &self,
        session: GlobalSystemMediaTransportControlsSession,
    ) -> anyhow::Result<()> {
        let mut status = PlaybackStatus::default();

        loop {
            let timeline_properties = session.GetTimelineProperties()?;
            let playback_info = session.GetPlaybackInfo()?;
            let playback_status = playback_info.PlaybackStatus()?;
            if playback_status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Closed {
                // This never triggered for me but just in case
                return Ok(());
            }

            let elapsed = timeline_properties.Position().unwrap_or_default().Duration as f64
                / WHAT_ARE_THEY_DOING_AT_MICROSOFT;
            let duration = timeline_properties.EndTime().unwrap_or_default().Duration as f64
                / WHAT_ARE_THEY_DOING_AT_MICROSOFT;
            if duration == 0. {
                // Detect the scenario the music player was closed
                // For some reason, it still reports data, but all empty
                return Ok(());
            }

            let mut new_status = PlaybackStatus {
                title: String::new(),
                artist: String::new(),
                elapsed,
                duration,
                playing: playback_status
                    == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing,
                repeat: match playback_info.AutoRepeatMode()?.Value()? {
                    MediaPlaybackAutoRepeatMode::List => crate::proto::RepeatMode::All,
                    MediaPlaybackAutoRepeatMode::Track => crate::proto::RepeatMode::One,
                    _ => crate::proto::RepeatMode::None,
                },
                shuffle: playback_info.IsShuffleActive()?.Value()?,
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

            // Timeline properties don't update immediately
            if new_status != status {
                status = new_status.clone();
                send_response(crate::proto::Response::PlaybackStatus(new_status))?;
            }

            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        }
    }
}

#[async_trait]
impl MediaFetcher for WindowsMediaFetcher {
    async fn init(&mut self) -> anyhow::Result<()> {
        self.session_manager =
            Some(GlobalSystemMediaTransportControlsSessionManager::RequestAsync()?.await?);
        Ok(())
    }

    async fn run(&self) -> anyhow::Result<()> {
        let manager = self.session_manager.as_ref().unwrap();
        let mut sent_failure = false;

        loop {
            // GetCurrentSession will return an error of 0 ("The operation completed successfully" lmao)
            // if there is no session (= no media playing atm)
            if let Ok(session) = manager.GetCurrentSession() {
                sent_failure = false;
                if let Err(e) = self.run_until_session_closes(session).await {
                    eprintln!("Error in session: {:?}", e);
                }
            }

            if !sent_failure {
                send_response(crate::proto::Response::PlaybackStatus(
                    PlaybackStatus::default(),
                ))?;
                sent_failure = true;
            }

            // I hate polling but the events from this kinda suck
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        }
    }

    async fn handle_command(&self, request: Request) -> anyhow::Result<()> {
        match request {
            Request::GetAlbumArt => {
                let session = self.session_manager.as_ref().unwrap().GetCurrentSession()?;
                let media_properties = session.TryGetMediaPropertiesAsync()?.await?;
                let thumbnail = media_properties.Thumbnail()?;

                // use .get() here to avoid it complaining about future stuff
                let handle = thumbnail.OpenReadAsync()?.get()?;
                let stream = handle.GetInputStreamAt(0)?;
                let reader = DataReader::CreateDataReader(&stream)?;

                // this api sucks so bad
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
                let session = self.session_manager.as_ref().unwrap().GetCurrentSession()?;

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
                let session = self.session_manager.as_ref().unwrap().GetCurrentSession()?;
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
                let session = self.session_manager.as_ref().unwrap().GetCurrentSession()?;
                session.TryChangeShuffleActiveAsync(shuffle)?.await?;
                Ok(())
            }
        }
    }
}
