import { Store } from "@moonlight-mod/wp/discord/packages/flux";
import Dispatcher from "@moonlight-mod/wp/discord/Dispatcher";
import { MediaState } from "../../types";

export default abstract class MediaControlsBaseStore extends Store<any> {
  constructor() {
    super(Dispatcher);
  }

  tick() {}
  abstract getState(): MediaState | null;

  abstract previous(): void;
  abstract playPause(): void;
  abstract next(): void;
}
