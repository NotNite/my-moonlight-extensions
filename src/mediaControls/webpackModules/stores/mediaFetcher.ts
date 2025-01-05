import {
  MediaFetcherRequestType,
  MediaFetcherResponseType,
  type MediaFetcherResponsePlaybackStatus,
  type RepeatMode,
  type MediaControlsNatives
} from "../../types";
import MediaControlsBaseStore from "./base";

const logger = moonlight.getLogger("mediaControls/mediaFetcher");
const natives: MediaControlsNatives = moonlight.getNatives("mediaControls");

export class MediaControlsMediaFetcherStore extends MediaControlsBaseStore {
  private status: MediaFetcherResponsePlaybackStatus | null = null;

  private coverSong: [string, string] | null = null;
  private cover: string | null = null;

  constructor() {
    super();

    if (natives != null) {
      natives.spawnMediaFetcher((data) => {
        logger.silly("Received media fetcher response", data);

        if (data.type === MediaFetcherResponseType.PlaybackStatus) {
          const newCoverSong = [data?.title ?? "", data?.artist ?? ""] as [string, string];

          // Reset album art if the song has changed
          if (this.coverSong != null && this.status != null) {
            const [title, artist] = this.coverSong;
            const [newTitle, newArtist] = newCoverSong;
            if (newTitle !== title || newArtist !== artist) {
              this.cover = null;
              this.coverSong = null;
            }
          }

          this.status = data ?? null;

          // Only make a request for album art if we don't already have it
          // For some reason asking immediately after the engine starts explodes
          if (this.coverSong == null) {
            this.coverSong = newCoverSong;
            logger.debug("Requesting album art for", this.coverSong);
            natives.sendMediaFetcherRequest({ type: MediaFetcherRequestType.GetAlbumArt });
          }

          this.emitChange();
        } else if (data.type === MediaFetcherResponseType.AlbumArt) {
          logger.debug("Received album art", data);
          this.cover = data.data;
          this.emitChange();
        }
      });
    }
  }

  getState() {
    if (this.status == null) return null;
    if (this.status.artist === "" && this.status.title === "") return null;

    return {
      //title: "REALLY LONG TITLE THAT CLIPS OFF THE SCREEN kjhasdhfjhkahsdjhf]asdjhf",
      title: this.status.title,
      artist: this.status.artist,
      album: this.status.album,
      album_artist: this.status.album_artist,
      elapsed: this.status.elapsed,
      duration: this.status.duration,
      cover: this.cover ?? undefined,
      playing: this.status.playing,
      repeat: this.status.repeat,
      shuffle: this.status.shuffle,
      track_number: this.status.track_number,
      total_tracks: this.status.total_tracks
    };
  }

  previous() {
    if (natives == null) return;
    natives.sendMediaFetcherRequest({ type: MediaFetcherRequestType.SkipBackward });
  }

  playPause() {
    if (natives == null) return;
    // there are two defined but it does the same thing
    natives.sendMediaFetcherRequest({ type: MediaFetcherRequestType.Play });
    if (this.status != null) {
      this.status.playing = !this.status.playing;
      this.emitChange();
    }
  }

  next() {
    if (natives == null) return;
    natives.sendMediaFetcherRequest({ type: MediaFetcherRequestType.SkipForward });
  }

  setRepeatMode(mode: RepeatMode) {
    if (natives == null) return;
    natives.sendMediaFetcherRequest({ type: MediaFetcherRequestType.SetRepeatMode, mode });
  }

  setShuffleMode(shuffle: boolean) {
    if (natives == null) return;
    natives.sendMediaFetcherRequest({ type: MediaFetcherRequestType.SetShuffle, shuffle });
  }

  seek(time: number) {
    if (natives == null) return;
    natives.sendMediaFetcherRequest({ type: MediaFetcherRequestType.Seek, position: time });
    if (this.status != null) {
      this.status.elapsed = time;
      this.emitChange();
    }
  }
}

export default function createMediaFetcherStore() {
  return new MediaControlsMediaFetcherStore();
}
