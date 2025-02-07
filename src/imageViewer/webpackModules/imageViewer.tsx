import spacepack from "@moonlight-mod/wp/spacepack_spacepack";
import React from "@moonlight-mod/wp/react";
import {
  Image,
  Text,
  TextInput,
  XLargeIcon,
  CopyIcon,
  LinkIcon,
  PlusLargeIcon,
  MinusIcon,
  FullscreenEnterIcon,
  ArrowAngleLeftUpIcon,
  ArrowAngleRightUpIcon,
  WindowLaunchIcon
} from "@moonlight-mod/wp/discord/components/common/index";
import { useModalsStore, closeModal } from "@moonlight-mod/wp/discord/modules/modals/Modals";
import { copy } from "@moonlight-mod/wp/discord/utils/ClipboardUtils";

const HeaderBar = spacepack.require("discord/uikit/HeaderBar").default;
const NativeUtils = spacepack.findByCode("Data fetch" + " unsuccessful")[0].exports.ZP;
const RawVideo = spacepack.findByCode(
  'MOSAIC?{width:"100%",height:"100%",' + 'maxHeight:"inherit",objectFit:"contain"}'
)[0].exports.Z;
const Video = spacepack.findByCode(".VIDEO,", ",onVolume" + "Change:")[0].exports.Z;

type SourceMetadata = {
  identifier: {
    type: string;
    embedIndex?: number;
  };
  message: {
    embeds?: any[];
  };
};

type Props = {
  src: string;
  url: string;
  original: string;
  proxyUrl?: string;
  alt?: string;
  width: number;
  height: number;
  children?: React.ReactNode;
  animated: boolean;
  onClose: () => void;
  type: "IMAGE" | "VIDEO";
  sourceMetadata: SourceMetadata;
};

const STEP_MAX = 50;
const ZOOM_SCALE = 1 / (4 * STEP_MAX);
const MAX_ZOOM = Math.log2(32) / ZOOM_SCALE;

function calculateInitialZoom(width: number, height: number) {
  const padding = 128;
  const maxWidth = window.innerWidth - padding;
  const maxHeight = window.innerHeight - padding;

  if (width <= maxWidth && height <= maxHeight) return 0;

  const widthScale = maxWidth / width;
  const heightScale = maxHeight / height;

  const zoom = Math.log2(Math.min(widthScale, heightScale)) / ZOOM_SCALE;
  return Math.floor(zoom / STEP_MAX) * STEP_MAX;
}

function close() {
  const ModalStore = useModalsStore.getState();
  closeModal(ModalStore.default[0].key);
}

const noop = () => {};

function stopPropagation(event: any) {
  event.stopPropagation();
}

export default function ImageViewer({
  proxyUrl,
  url,
  original,
  width,
  height,
  alt,
  type,
  animated,
  sourceMetadata
}: Props) {
  const initialZoom = calculateInitialZoom(width, height);
  const minZoom = initialZoom - MAX_ZOOM;

  const [x, setX] = React.useState(0);
  const [y, setY] = React.useState(0);
  const [rotate, setRotate] = React.useState(0);
  const [zoom, setZoom] = React.useState(initialZoom);
  const scale = 2 ** (zoom * ZOOM_SCALE);
  const [dragging, setDragging] = React.useState(false);
  const [editingZoom, setEditingZoom] = React.useState(false);
  const [zoomEdit, setZoomEdit] = React.useState(100);
  const wrapperRef = React.createRef<HTMLDivElement>();

  let src = proxyUrl ?? url;
  if (animated) {
    src = sourceMetadata.message.embeds?.[sourceMetadata.identifier.embedIndex ?? -1]?.video?.proxyURL ?? src;
  }
  const filename = React.useMemo(() => {
    return new URL(src).pathname.split("/").pop();
  }, [src]);
  const isVideo = type === "VIDEO";
  const poster = React.useMemo(() => {
    const urlObj = new URL(src);
    urlObj.searchParams.set("format", "webp");
    return urlObj.toString();
  }, [src]);

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!dragging) return;

      setX((prevX) => prevX + e.movementX / (scale * window.devicePixelRatio));
      setY((prevY) => prevY + e.movementY / (scale * window.devicePixelRatio));
    },
    [dragging, zoom]
  );
  const handleMouseDown = React.useCallback(() => {
    setDragging(true);
  }, []);
  const handleMouseUp = React.useCallback(() => {
    setDragging(false);
  }, []);
  const handleWheel = React.useCallback((e: WheelEvent) => {
    setZoom((zoom) => {
      // clamp delta, for linear scrolling (e.g. trackpads)
      const delta = Math.min(STEP_MAX, Math.max(-STEP_MAX, -e.deltaY));
      return Math.min(MAX_ZOOM, Math.max(minZoom, zoom + delta));
    });
  }, []);

  React.useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    wrapper.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("wheel", handleWheel);

    return () => {
      wrapper.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("wheel", handleWheel);
    };
  }, [wrapperRef.current, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel]);

  const transformStyle = `scale(${scale}) translate(${x}px, ${y}px) rotate(${rotate}deg)`;
  const zoomLabel = scale < 0.1 ? (scale * 100).toFixed(2) : Math.round(scale * 100);

  return (
    <div className="imageViewer">
      <div
        className="imageViewer-container"
        ref={wrapperRef}
        style={{
          transform: transformStyle
        }}
        onClick={stopPropagation}
      >
        {animated ? (
          <RawVideo
            src={src}
            width={width}
            height={height}
            autoPlay={true}
            loop={true}
            muted={true}
            preload="none"
            aria-label={alt}
          />
        ) : isVideo ? (
          <Video
            src={src}
            width={width}
            height={height}
            naturalWidth={width}
            naturalHeight={height}
            maxWidth={width}
            maxHeight={height}
            poster={poster}
            autoPlay={true}
            renderLinkComponent={noop}
          />
        ) : (
          <Image
            className={`imageViewer-image${scale >= 1 ? " imageViewer-pixelate" : ""}`}
            src={src}
            placeholder={src}
            alt={alt}
            width={width}
            height={height}
            zoomable={true}
          />
        )}
      </div>
      <div className="imageViewer-toolbar theme-dark">
        <div className="imageViewer-toolbar-buttons" onClick={stopPropagation}>
          <HeaderBar.Icon tooltip={"Close"} tooltipPosition="top" icon={XLargeIcon} onClick={close} />

          <HeaderBar.Divider />

          <HeaderBar.Icon
            tooltip={"Open in Browser"}
            tooltipPosition="top"
            icon={WindowLaunchIcon}
            onClick={() => {
              window.open(original);
            }}
          />
          <HeaderBar.Icon
            tooltip="Copy Link"
            tooltipPosition="top"
            icon={LinkIcon}
            onClick={() => {
              copy(src);
            }}
          />
          {/* @ts-expect-error missing typing for window.DiscordNative */}
          {!isVideo && !animated && window.DiscordNative != null ? (
            <HeaderBar.Icon
              tooltip={"Copy Image"}
              tooltipPosition="top"
              icon={CopyIcon}
              onClick={() => {
                NativeUtils.copyImage(src);
              }}
            />
          ) : null}

          <HeaderBar.Divider />

          <HeaderBar.Icon
            tooltip="Recenter"
            tooltipPosition="top"
            icon={FullscreenEnterIcon}
            onClick={() => {
              setX(0);
              setY(0);
              setZoom(initialZoom);
            }}
          />
          <HeaderBar.Icon
            tooltip="Zoom In"
            tooltipPosition="top"
            icon={PlusLargeIcon}
            onClick={() => {
              setZoom((zoom) => Math.min(MAX_ZOOM, zoom + STEP_MAX));
            }}
          />
          <HeaderBar.Icon
            tooltip="Zoom Out"
            tooltipPosition="top"
            icon={MinusIcon}
            onClick={() => {
              setZoom((zoom) => Math.max(minZoom, zoom - STEP_MAX));
            }}
          />

          <HeaderBar.Divider />

          <HeaderBar.Icon
            tooltip="Rotate Counter-clockwise"
            tooltipPosition="top"
            icon={ArrowAngleLeftUpIcon}
            onClick={() => {
              setRotate((prevRotate) => prevRotate - 90);
            }}
          />
          <HeaderBar.Icon
            tooltip="Rotate Clockwise"
            tooltipPosition="top"
            icon={ArrowAngleRightUpIcon}
            onClick={() => {
              setRotate((prevRotate) => prevRotate + 90);
            }}
          />
        </div>

        <div className="imageViewer-toolbar-label" onClick={stopPropagation}>
          <Text variant="text-sm/medium">{filename}</Text>

          <HeaderBar.Divider />

          <Text variant="text-sm/medium">{`${width}x${height}`}</Text>

          <HeaderBar.Divider />

          {editingZoom ? (
            <TextInput
              className="imageViewer-edit-zoom"
              size={TextInput.Sizes.MINI}
              type="number"
              autoFocus={true}
              value={zoomEdit.toString()}
              placeholder="100"
              onChange={(value: string) => {
                if (!Number.isNaN(value)) setZoomEdit(Number(value));
              }}
              onFocus={() => {
                setZoomEdit(Number(zoomLabel));
              }}
              onBlur={() => {
                setZoom(Math.log2(zoomEdit / 100) / ZOOM_SCALE);
                setEditingZoom(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setZoom(Math.log2(zoomEdit / 100) / ZOOM_SCALE);
                  setEditingZoom(false);
                }
              }}
            />
          ) : (
            <Text variant="text-sm/medium" onClick={() => setEditingZoom(true)}>
              {zoomLabel}%
            </Text>
          )}
        </div>
      </div>
    </div>
  );
}
