export enum MediaFetcherRequestType {
  GetAlbumArt = "GetAlbumArt",
  Play = "Play",
  Pause = "Pause",
  SkipBackward = "SkipBackward",
  SkipForward = "SkipForward",
  SetRepeatMode = "SetRepeatMode",
  SetShuffle = "SetShuffle"
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
  type: MediaFetcherResponseType.PlaybackStatus;
  title: string;
  artist: string;
  elapsed: number;
  duration: number;
  playing: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
};

export type MediaFetcherResponse = MediaFetcherResponseAlbumArt | MediaFetcherResponsePlaybackStatus;

export type MediaControlsNatives = {
  spawnMediaFetcher: (cb: (response: MediaFetcherResponse) => void) => void;
  sendMediaFetcherRequest: (request: MediaFetcherRequest) => void;
};

export type MediaState = {
  title: string;
  artist: string;
  elapsed: number;
  duration: number;
  cover?: string;
  playing: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
};
