import { Store } from "@moonlight-mod/wp/discord/packages/flux";
import Dispatcher from "@moonlight-mod/wp/discord/Dispatcher";

import type { MediaState, RepeatMode } from "../../types";
import type MediaControlsBaseStore from "./base";
import { MediaFetcherStore } from "./mediaFetcher";

const logger = moonlight.getLogger("mediaControls/store");

class MediaControlsStore extends Store<any> {
  private fetchers: MediaControlsBaseStore[] = [MediaFetcherStore];
  private currentFetcher: MediaControlsBaseStore | null = null;

  constructor() {
    super(Dispatcher);
    for (const fetcher of this.fetchers) {
      // @ts-expect-error TODO: mappings
      fetcher.addChangeListener(() => {
        // This is very unperformant, but it's fine for now :^)
        this.emitChange();
      });
    }

    let ticking = false;
    setInterval(() => {
      if (ticking) return;

      ticking = true;
      try {
        this.tick();
      } catch (e) {
        logger.error("Error ticking media controls", e);
      }
      ticking = false;
    }, 1000);
  }

  tick() {
    for (const fetcher of this.fetchers) {
      fetcher.tick();
    }
  }

  getState(): MediaState | null {
    for (const fetcher of this.fetchers) {
      const state = fetcher.getState();
      if (state != null) {
        this.currentFetcher = fetcher;
        return state;
      }
    }

    this.currentFetcher = null;
    return null;
  }

  previous() {
    this.currentFetcher?.previous();
  }

  playPause() {
    this.currentFetcher?.playPause();
  }

  next() {
    this.currentFetcher?.next();
  }

  setRepeatMode(mode: RepeatMode) {
    this.currentFetcher?.setRepeatMode(mode);
  }

  setShuffleMode(shuffle: boolean) {
    this.currentFetcher?.setShuffleMode(shuffle);
  }
}

const mediaControlsStore = new MediaControlsStore();
export { mediaControlsStore as MediaControlsStore };
