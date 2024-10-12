export enum MediaFetcherRequestType {
  GetAlbumArt = "GetAlbumArt",
  Play = "Play",
  Pause = "Pause",
  SkipBackward = "SkipBackward",
  SkipForward = "SkipForward"
}

export type MediaFetcherRequest = {
  type: MediaFetcherRequestType;
};

export enum MediaFetcherResponseType {
  AlbumArt = "AlbumArt",
  PlaybackStatus = "PlaybackStatus"
}

export type SongStatus = {
  title: string;
  artist: string;
  elapsed: number;
  duration: number;
};

export type MediaFetcherResponseAlbumArt = {
  type: MediaFetcherResponseType.AlbumArt;
  data: string;
};

export type MediaFetcherResponsePlaybackStatus = {
  type: MediaFetcherResponseType.PlaybackStatus;
  song?: SongStatus;
  playing: boolean;
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
};
