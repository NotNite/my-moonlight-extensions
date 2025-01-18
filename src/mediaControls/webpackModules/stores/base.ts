import { Store } from "@moonlight-mod/wp/discord/packages/flux";
import Dispatcher from "@moonlight-mod/wp/discord/Dispatcher";
import type { MediaState, RepeatMode } from "../../types";

export default abstract class MediaControlsBaseStore extends Store<any> {
  constructor(...args: any[]) {
    super(Dispatcher, ...args);
  }

  async tick() {}
  abstract getState(): MediaState | null;

  abstract previous(): void;
  abstract playPause(): void;
  abstract next(): void;
  abstract setRepeatMode(mode: RepeatMode): void;
  abstract setShuffleMode(shuffle: boolean): void;
  abstract seek(time: number): void;
}
