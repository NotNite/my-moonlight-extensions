export enum MediaFetcherRequestType {
  GetAlbumArt = "GetAlbumArt",
  Play = "Play",
  Pause = "Pause",
  SkipBackward = "SkipBackward",
  SkipForward = "SkipForward",
  SetRepeatMode = "SetRepeatMode",
  SetShuffle = "SetShuffle",
  Seek = "Seek"
}

export enum RepeatMode {
  None = "None",
  All = "All",
  One = "One"
}

export type MediaFetcherRequest =
  | {
      type: MediaFetcherRequestType.GetAlbumArt;
    }
  | {
      type: MediaFetcherRequestType.Play;
    }
  | {
      type: MediaFetcherRequestType.Pause;
    }
  | {
      type: MediaFetcherRequestType.SkipBackward;
    }
  | {
      type: MediaFetcherRequestType.SkipForward;
    }
  | {
      type: MediaFetcherRequestType.SetRepeatMode;
      mode: RepeatMode;
    }
  | {
      type: MediaFetcherRequestType.SetShuffle;
      shuffle: boolean;
    }
  | {
      type: MediaFetcherRequestType.Seek;
      position: number;
    };

export enum MediaFetcherResponseType {
  AlbumArt = "AlbumArt",
  PlaybackStatus = "PlaybackStatus"
}

export type MediaFetcherResponseAlbumArt = {
  type: MediaFetcherResponseType.AlbumArt;
  data: string;
};

export type MediaFetcherResponsePlaybackStatus = {
  player_name?: string;
  type: MediaFetcherResponseType.PlaybackStatus;
  title: string;
  artist: string;
  album?: string;
  album_artist?: string;
  elapsed: number;
  duration: number;
  playing: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
  track_number: number;
  total_tracks: number;
};

export type MediaFetcherResponse = MediaFetcherResponseAlbumArt | MediaFetcherResponsePlaybackStatus;

export type MediaControlsNatives = {
  spawnMediaFetcher: (cb: (response: MediaFetcherResponse) => void) => void;
  sendMediaFetcherRequest: (request: MediaFetcherRequest) => void;
};

export type MediaState = {
  player_name?: string;
  title: string;
  artist: string;
  album?: string;
  album_artist?: string;
  elapsed: number;
  duration: number;
  cover?: string;
  playing: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
  track_number: number;
  total_tracks: number;
};
