import { Store } from "@moonlight-mod/wp/discord/packages/flux";
import Dispatcher from "@moonlight-mod/wp/discord/Dispatcher";
import type { MediaState, RepeatMode } from "../../types";
import type MediaControlsBaseStore from "./base";

import createMediaFetcherStore from "./mediaFetcher";
import createSpotifyStore from "./spotify";

const logger = moonlight.getLogger("mediaControls/store");

const sources = moonlight.getConfigOption<string[]>("mediaControls", "sources") ?? [];

class MediaControlsStore extends Store<any> {
  private sources: MediaControlsBaseStore[] = [];
  private currentSource: MediaControlsBaseStore | null = null;

  constructor() {
    super(Dispatcher);

    if (sources.includes("mediaFetcher")) this.sources.push(createMediaFetcherStore());
    if (sources.includes("spotify")) this.sources.push(createSpotifyStore());

    for (const fetcher of this.sources) {
      fetcher.addChangeListener(() => {
        // This is very unperformant, but it's fine for now :^)
        this.emitChange();
      });
    }

    let ticking = false;
    setInterval(async () => {
      if (ticking) return;

      ticking = true;
      try {
        await this.tick();
      } catch (e) {
        logger.error("Error ticking media controls", e);
      }
      ticking = false;
    }, 1000);
  }

  async tick() {
    for (const source of this.sources) {
      await source.tick();
    }
  }

  getState(): MediaState | null {
    for (const source of this.sources) {
      const state = source.getState();
      if (state != null) {
        this.currentSource = source;
        return state;
      }
    }

    this.currentSource = null;
    return null;
  }

  previous() {
    this.currentSource?.previous();
  }

  playPause() {
    this.currentSource?.playPause();
  }

  next() {
    this.currentSource?.next();
  }

  setRepeatMode(mode: RepeatMode) {
    this.currentSource?.setRepeatMode(mode);
  }

  setShuffleMode(shuffle: boolean) {
    this.currentSource?.setShuffleMode(shuffle);
  }

  seek(time: number) {
    this.currentSource?.seek(time);
  }
}

const mediaControlsStore = new MediaControlsStore();
export { mediaControlsStore as MediaControlsStore };
