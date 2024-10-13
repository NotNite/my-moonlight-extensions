use serde::{Deserialize, Serialize};

use crate::base::compare_floats;

#[derive(Deserialize, Serialize, Default, PartialEq, Clone)]
pub enum RepeatMode {
    #[default]
    None,
    All,
    One,
}

#[derive(Deserialize)]
#[serde(tag = "type")]
pub enum Request {
    GetAlbumArt,
    Play,
    Pause,
    SkipBackward,
    SkipForward,
    SetRepeatMode { mode: RepeatMode },
    SetShuffle { shuffle: bool },
}

#[derive(Serialize, Default, Clone)]
pub struct PlaybackStatus {
    pub title: String,
    pub artist: String,
    pub elapsed: f64,
    pub duration: f64,
    pub playing: bool,
    pub repeat: RepeatMode,
    pub shuffle: bool,
}

impl PartialEq for PlaybackStatus {
    fn eq(&self, other: &Self) -> bool {
        self.title == other.title
            && self.artist == other.artist
            && compare_floats(self.elapsed, other.elapsed)
            && compare_floats(self.duration, other.duration)
            && self.playing == other.playing
            && self.repeat == other.repeat
            && self.shuffle == other.shuffle
    }
}

#[derive(Serialize)]
#[serde(tag = "type")]
pub enum Response {
    AlbumArt { data: String },
    PlaybackStatus(PlaybackStatus),
}
