import {
  MediaFetcherRequestType,
  MediaFetcherResponsePlaybackStatus,
  MediaFetcherResponseType,
  MediaState,
  type MediaControlsNatives
} from "../../types";
import MediaControlsBaseStore from "./base";

const logger = moonlight.getLogger("mediaControls/mediaFetcher");
const natives: MediaControlsNatives = moonlight.getNatives("mediaControls");

class MediaFetcherStore extends MediaControlsBaseStore {
  private status: MediaFetcherResponsePlaybackStatus | null = null;

  private coverSong: [string, string] | null = null;
  private cover: string | null = null;
  private waitingToSendAlbumArt: boolean | null = false;

  constructor() {
    super();

    if (natives != null) {
      natives.spawnMediaFetcher((data) => {
        logger.silly("Received media fetcher response", data);

        if (data.type === MediaFetcherResponseType.PlaybackStatus) {
          const newCoverSong = [data?.song?.title ?? "", data?.song?.artist ?? ""] as [string, string];

          // Reset album art if the song has changed
          if (this.coverSong != null && this.status != null) {
            const [title, artist] = this.coverSong;
            const [newTitle, newArtist] = newCoverSong;
            if (newTitle !== title || newArtist !== artist) {
              this.cover = null;
              this.coverSong = null;
              this.waitingToSendAlbumArt = false;
            }
          }

          this.status = data ?? null;

          // Only make a request for album art if we don't already have it
          // For some reason asking immediately after the engine starts explodes
          if (this.waitingToSendAlbumArt) {
            logger.debug("Requesting album art for", this.coverSong);
            natives.sendMediaFetcherRequest({ type: MediaFetcherRequestType.GetAlbumArt });
            this.waitingToSendAlbumArt = null;
          } else if (this.coverSong == null) {
            this.coverSong = newCoverSong;
            logger.debug("Waiting to request album art for", this.coverSong);

            if (this.waitingToSendAlbumArt == null) {
              natives.sendMediaFetcherRequest({ type: MediaFetcherRequestType.GetAlbumArt });
            } else {
              this.waitingToSendAlbumArt = true;
            }
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

  getState(): MediaState | null {
    if (this.status == null) return null;
    if (this.status.song == null) return null;

    return {
      //title: "REALLY LONG TITLE THAT CLIPS OFF THE SCREEN kjhasdhfjhkahsdjhf]asdjhf",
      title: this.status.song.title,
      artist: this.status.song.artist,
      elapsed: this.status.song.elapsed,
      duration: this.status.song.duration,
      cover: this.cover ?? undefined,
      playing: this.status.playing
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
}

const mediaFetcherStore = new MediaFetcherStore();
export { mediaFetcherStore as MediaFetcherStore };
