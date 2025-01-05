import spacepack from "@moonlight-mod/wp/spacepack_spacepack";
import React from "@moonlight-mod/wp/react";
import { MediaControlsStore } from "@moonlight-mod/wp/mediaControls_stores";
import { useStateFromStores } from "@moonlight-mod/wp/discord/packages/flux";
import AppPanels from "@moonlight-mod/wp/appPanels_appPanels";
import * as Components from "@moonlight-mod/wp/discord/components/common/index";
import { RepeatMode } from "../types";
import { NextTrackIcon } from "./NextTrackIcon";
import { PreviousTrackIcon } from "./PreviousTrackIcon";

const {
  PlayIcon,
  PauseIcon,

  Text,
  Tooltip,

  Menu,
  MenuItem,
  MenuGroup,
  MenuRadioItem,
  MenuCheckboxItem
} = Components;
const ContextMenuActionCreators = spacepack.require("discord/actions/ContextMenuActionCreators");
let copy: (text: string) => void;
let IconButton: React.ComponentType<any>;
let NativeUtils: {
  copyImage: (src: string) => void;
};

const disableBar = moonlight.getConfigOption("mediaControls", "disableBar") ?? false;

function MediaControlsContextMenu() {
  const state = useStateFromStores([MediaControlsStore], () => MediaControlsStore.getState());

  return (
    <div>
      <Menu navId="media-controls" onClose={ContextMenuActionCreators.closeContextMenu}>
        <MenuGroup>
          <MenuItem id="media-controls-repeat" label="Repeat">
            <MenuRadioItem
              id="media-controls-repeat-none"
              label="None"
              checked={state?.repeat === RepeatMode.None}
              action={() => {
                MediaControlsStore.setRepeatMode(RepeatMode.None);
              }}
            />

            <MenuRadioItem
              id="media-controls-repeat-all"
              label="All"
              checked={state?.repeat === RepeatMode.All}
              action={() => {
                MediaControlsStore.setRepeatMode(RepeatMode.All);
              }}
            />

            <MenuRadioItem
              id="media-controls-repeat-one"
              label="One"
              checked={state?.repeat === RepeatMode.One}
              action={() => {
                MediaControlsStore.setRepeatMode(RepeatMode.One);
              }}
            />
          </MenuItem>

          <MenuCheckboxItem
            id="media-controls-shuffle"
            label="Shuffle"
            checked={state?.shuffle}
            action={() => MediaControlsStore.setShuffleMode(!state?.shuffle)}
          />

          <MenuItem
            id="media-controls-copy-cover"
            label="Copy Cover"
            action={() => {
              if (state?.cover != null) {
                NativeUtils.copyImage(state.cover);
              }
            }}
          />
        </MenuGroup>
      </Menu>
    </div>
  );
}

function MediaControlsUI() {
  if (!copy) {
    // TODO: mappings
    const ClipboardUtils = spacepack.require("discord/utils/ClipboardUtils");
    copy = Object.entries(ClipboardUtils).find(([key, value]) => typeof value !== "boolean")?.[1] as (
      text: string
    ) => void;
    IconButton = spacepack.findByCode(".PANEL_BUTTON,")[0].exports.Z;
    NativeUtils = spacepack.findByCode("Data fetch unsuccessful")[0].exports.ZP;
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
    if (disableBar) return;
    setElapsed(realElapsed);

    // seems to drift by a bit
    const recorded = Math.floor(Date.now() / 1000);
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000) - 1;
      const diff = now - recorded;
      if (diff < 1 || !state?.playing || state.duration === 0) return;
      setElapsed(realElapsed + diff);
    }, 500);

    return () => clearInterval(interval);
  }, [realElapsed]);

  if (state == null) return <></>;

  const artistAndAlbum = `${state.artist}${state.album && state.album !== "" ? ` • ${state.album}` : ""}`;

  return (
    <div
      className="mediaControls"
      style={{
        // @ts-expect-error I know what I am doing
        "--progress": `${(elapsed / state.duration) * 100}%`
      }}
      onClick={(e) => {
        if (disableBar) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // This fires for any click anywhere on the element
        // Only allow clicks that were near the progress bar
        const leeway = 2;
        const progressBarSize =
          parseInt(window.getComputedStyle(e.currentTarget).backgroundSize.split(" ")[1].replace("px", "")) * leeway;
        if (y > progressBarSize) return;

        const percentage = x / rect.width;
        const time = state.duration * percentage;

        MediaControlsStore.seek(time);
      }}
    >
      {state.cover != null && (
        <img
          src={state.cover}
          className="mediaControls-cover"
          onContextMenu={(e) => {
            e.preventDefault();
            ContextMenuActionCreators.openContextMenu(e, () => <MediaControlsContextMenu />);
          }}
        />
      )}

      <div className="mediaControls-labels">
        <Tooltip text={state.title} position="top">
          {(props: any) => (
            <Text {...props} variant="text-sm/bold" className="mediaControls-label" tooltipText={state.title}>
              {state.title}
            </Text>
          )}
        </Tooltip>

        <Tooltip text={artistAndAlbum} position="top">
          {(props: any) => (
            <Text {...props} variant="text-xs/normal" className="mediaControls-label">
              {artistAndAlbum}
            </Text>
          )}
        </Tooltip>
      </div>

      <div className="mediaControls-interact">
        <IconButton icon={PreviousTrackIcon} tooltipText="Previous" onClick={() => MediaControlsStore.previous()} />
        <IconButton
          icon={state.playing ? PauseIcon : PlayIcon}
          tooltipText={state.playing ? "Pause" : "Play"}
          onClick={() => MediaControlsStore.playPause()}
        />
        <IconButton icon={NextTrackIcon} tooltipText="Next" onClick={() => MediaControlsStore.next()} />
      </div>
    </div>
  );
}

AppPanels.addPanel("Media Controls", MediaControlsUI);
