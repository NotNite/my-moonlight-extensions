use serde::{Deserialize, Serialize};

use crate::base::compare_floats;

#[derive(Deserialize)]
#[serde(tag = "type")]
pub enum Request {
    GetAlbumArt,
    Play,
    Pause,
    SkipBackward,
    SkipForward,
}

#[derive(Clone, Serialize, Default)]
pub struct SongStatus {
    pub title: String,
    pub artist: String,
    pub elapsed: f64,
    pub duration: f64,
}

impl PartialEq for SongStatus {
    fn eq(&self, other: &Self) -> bool {
        self.title == other.title
            && self.artist == other.artist
            && compare_floats(self.elapsed, other.elapsed)
            && compare_floats(self.duration, other.duration)
    }
}

#[derive(Serialize)]
#[serde(tag = "type")]
pub enum Response {
    AlbumArt {
        data: String,
    },
    PlaybackStatus {
        song: Option<SongStatus>,
        playing: bool,
    },
}
