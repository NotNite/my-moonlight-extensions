import spacepack from "@moonlight-mod/wp/spacepack_spacepack";
import React from "@moonlight-mod/wp/react";
import { MediaControlsStore } from "@moonlight-mod/wp/mediaControls_stores";
import { useStateFromStores } from "@moonlight-mod/wp/discord/packages/flux";
import AppPanels from "@moonlight-mod/wp/appPanels_appPanels";
import * as Components from "@moonlight-mod/wp/discord/components/common/index";

const { PlayIcon, PauseIcon, ArrowSmallLeftIcon, ArrowSmallRightIcon, Text } = Components;
let copy: (text: string) => void;

function MediaControlsUI() {
  if (!copy) {
    // TODO: mappings
    const ClipboardUtils = spacepack.require("discord/utils/ClipboardUtils");
    copy = Object.entries(ClipboardUtils).find(([key, value]) => typeof value !== "boolean")?.[1] as (
      text: string
    ) => void;
  }

  const state = useStateFromStores([MediaControlsStore], () => MediaControlsStore.getState());
  const [realElapsed, setRealElapsed] = React.useState(0);
  const [elapsed, setElapsed] = React.useState(0);

  // Basic elapsed time calculation
  React.useEffect(() => {
    const variance = 0.1;
    const nowElapsed = state?.elapsed ?? 0;
    if (Math.abs(nowElapsed - realElapsed) > variance) {
      setRealElapsed(nowElapsed);
    }
  }, [state]);

  React.useEffect(() => {
    setElapsed(realElapsed);

    // seems to drift by a bit
    const recorded = Math.floor(Date.now() / 1000);
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000) - 1;
      const diff = now - recorded;
      if (diff < 1) return;
      setElapsed(realElapsed + diff);
    }, 500);

    return () => clearInterval(interval);
  }, [realElapsed]);

  if (state == null) return <></>;

  return (
    <div
      className="mediaControls"
      style={{
        // @ts-expect-error I know what I am doing
        "--progress": `${(elapsed / state.duration) * 100}%`
      }}
    >
      {state.cover != null && <img src={state.cover} className="mediaControls-cover" />}

      <div className="mediaControls-labels">
        <Text variant="text-sm/bold" className="mediaControls-label" onClick={() => copy(state.title)}>
          {state.title}
        </Text>
        <Text variant="text-xs/normal" className="mediaControls-label" onClick={() => copy(state.artist)}>
          {state.artist}
        </Text>
      </div>

      <div className="mediaControls-interact">
        <ArrowSmallLeftIcon onClick={() => MediaControlsStore.previous()} />
        {state.playing ? (
          <PauseIcon onClick={() => MediaControlsStore.playPause()} />
        ) : (
          <PlayIcon onClick={() => MediaControlsStore.playPause()} />
        )}
        <ArrowSmallRightIcon onClick={() => MediaControlsStore.next()} />
      </div>
    </div>
  );
}

AppPanels.addPanel("Media Controls", MediaControlsUI);
