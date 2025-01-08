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
  MenuCheckboxItem,
  MenuSeparator
} = Components;
const ContextMenuActionCreators = spacepack.require("discord/actions/ContextMenuActionCreators");
let copy: (text: string) => void;
let IconButton: React.ComponentType<any>;
let NativeUtils: {
  copyImage: (src: string) => void;
};
let MediaBar: React.ComponentType<any> & { Types: { DURATION: "DURATION"; VOLUME: "VOLUME" } };

function MediaControlsContextMenu() {
  const state = useStateFromStores([MediaControlsStore], () => MediaControlsStore.getState());

  return (
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

        {state?.cover != null ? (
          <>
            <MenuSeparator />
            <MenuItem
              id="media-controls-copy-cover"
              label="Copy Cover"
              action={() => {
                NativeUtils.copyImage(state.cover as string);
              }}
            />
          </>
        ) : null}
      </MenuGroup>
    </Menu>
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
    MediaBar = spacepack.findByCode(".mediaBarInteractionVolume:null")[0].exports.Z;
  }

  const disableBar = moonlight.getConfigOption("mediaControls", "disableBar") ?? false;

  const state = useStateFromStores([MediaControlsStore], () => MediaControlsStore.getState());
  const [realElapsed, setRealElapsed] = React.useState(0);
  const [elapsed, setElapsed] = React.useState(0);
  const barRef = React.useRef<any>(null);
  const [dragging, setDragging] = React.useState(false);
  const [seekPercent, setSeekPercent] = React.useState(0);

  // Basic elapsed time calculation
  React.useEffect(() => {
    const variance = 0.1;
    const nowElapsed = state?.elapsed ?? 0;
    if (Math.abs(nowElapsed - realElapsed) > variance) {
      setRealElapsed(nowElapsed);
    }
  }, [state]);

  React.useEffect(() => {
    if (!dragging && state != null) barRef.current?.setGrabber(elapsed / state.duration, true);
  }, [elapsed, dragging, state]);

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

  const onDragStart = React.useCallback(() => setDragging(true), [setDragging]);
  const onDrag = React.useCallback(
    (percent: number) => {
      barRef.current.setGrabber(percent);
      setSeekPercent(percent);
    },
    [barRef, setSeekPercent]
  );
  const onDragEnd = React.useCallback(() => {
    setDragging(false);
    if (state == null) return;
    const time = state.duration * seekPercent;
    MediaControlsStore.seek(time);
  }, [setDragging, seekPercent, state, MediaControlsStore]);

  if (state == null) return <></>;

  const artistAndAlbum = `${state.artist}${state.album && state.album !== "" ? ` • ${state.album}` : ""}`;

  return (
    <div
      className="mediaControls"
      onContextMenu={(event) => {
        event.preventDefault();
        ContextMenuActionCreators.openContextMenu(event, () => <MediaControlsContextMenu />);
      }}
    >
      <div className="mediaControls-controls">
        {state.cover != null ? <img src={state.cover} className="mediaControls-cover" /> : null}

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
      {disableBar ? null : (
        <MediaBar
          type={MediaBar.Types.DURATION}
          value={state.duration === 0 ? 1 : state.duration}
          ref={barRef}
          onDragStart={onDragStart}
          onDrag={onDrag}
          onDragEnd={onDragEnd}
        />
      )}
    </div>
  );
}

AppPanels.addPanel("Media Controls", MediaControlsUI);
