import { RepeatMode } from "../../types";
import MediaControlsBaseStore from "./base";
import spacepack from "@moonlight-mod/wp/spacepack_spacepack";

// TODO: types
const SpotifyStore = spacepack.require("discord/modules/spotify/SpotifyStore").default;
const { HTTP } = spacepack.require("discord/utils/HTTPUtils");

type SpotifyTrack = {
  album?: {
    name?: string;
    image?: {
      url: string;
    };
  };
  artists: {
    name: string;
  }[];
  duration: number;
  name: string;
};

type SpotifyPlayerState = {
  isPlaying: boolean;
  position: number;
  repeat: boolean;
  track: SpotifyTrack | null;
};

export class MediaControlsSpotifyStore extends MediaControlsBaseStore {
  private state: SpotifyPlayerState | null = null;

  constructor(...args: any[]) {
    super(...args);
  }

  getState() {
    if (this.state == null) return null;
    if (this.state.track == null) return null;

    return {
      player_name: "Spotify",
      title: this.state?.track?.name ?? "",
      artist: this.state?.track?.artists?.map((a) => a.name).join(", ") ?? "",
      album: this.state?.track?.album?.name ?? "",
      elapsed: this.state.position / 1000,
      duration: this.state.track?.duration != null ? this.state.track.duration / 1000 : 0,
      playing: this.state.isPlaying,
      repeat: this.state.repeat ? RepeatMode.All : RepeatMode.None,
      shuffle: false,
      cover: this.state.track?.album?.image?.url,
      track_number: 0,
      total_tracks: 0
    };
  }

  handleSpotifyPlayerState(event: SpotifyPlayerState) {
    this.state = event;
    this.emitChange();
  }

  previous() {
    this.request("POST", "/me/player/previous");
  }

  playPause() {
    if (this.state == null) return;
    this.request("PUT", "/me/player/" + (this.state.isPlaying ? "pause" : "play"));
    if (this.state != null) {
      this.state.isPlaying = !this.state.isPlaying;
    }
  }

  next() {
    this.request("POST", "/me/player/next");
  }

  setRepeatMode(mode: RepeatMode) {
    this.request("PUT", "/me/player/repeat", {
      query: {
        state: mode === RepeatMode.All ? "context" : mode === RepeatMode.One ? "track" : "off"
      }
    });
    if (mode !== RepeatMode.None && this.state != null) {
      this.state.repeat = true;
    }
  }

  setShuffleMode(shuffle: boolean) {
    this.request("PUT", "/me/player/shuffle", {
      query: {
        state: shuffle
      }
    });
    if (this.state != null) {
      this.state.repeat = shuffle;
    }
  }

  seek(time: number) {
    this.request("PUT", "/me/player/seek", {
      query: {
        position_ms: Math.floor(time * 1000)
      }
    });
    if (this.state != null) {
      this.state.position = time * 1000;
    }
  }

  private request(method: string, url: string, data: any = {}) {
    const socket = SpotifyStore.getActiveSocketAndDevice().socket;
    return HTTP[method.toLowerCase()]({
      url: "https://api.spotify.com/v1" + url,
      headers: {
        Authorization: "Bearer " + socket.accessToken
      },
      ...data
    });
  }
}

export default function createSpotifyStore() {
  const store = new MediaControlsSpotifyStore({
    SPOTIFY_PLAYER_STATE(event: SpotifyPlayerState) {
      store.handleSpotifyPlayerState(event);
    }
  });
  return store;
}
