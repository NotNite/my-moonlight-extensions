import spacepack from "@moonlight-mod/wp/spacepack_spacepack";
import React from "@moonlight-mod/wp/react";
import {
  Image,
  Text,
  XLargeIcon,
  CopyIcon,
  LinkIcon,
  PlusLargeIcon,
  MinusIcon,
  FullscreenEnterIcon,
  ArrowAngleLeftUpIcon,
  ArrowAngleRightUpIcon,
  WindowLaunchIcon,
  showToast,
  createToast,
  ToastType
} from "@moonlight-mod/wp/discord/components/common/index";
import { useModalsStore, closeModal } from "@moonlight-mod/wp/discord/modules/modals/Modals";
import { copy } from "@moonlight-mod/wp/discord/utils/ClipboardUtils";
import TextInput from "@moonlight-mod/wp/discord/uikit/TextInput";

const i18n = spacepack.require("discord/intl");
const HeaderBar = spacepack.require("discord/components/common/BaseHeaderBar");
const NativeUtils = spacepack.findByCode("Data fetch" + " unsuccessful")[0].exports.Ay;
const RawVideo = spacepack.findByCode(
  'MOSAIC?{width:"100%",height:"100%",' + 'maxHeight:"inherit",objectFit:"contain"}'
)[0].exports.A;
const Video = spacepack.findByCode(".VIDEO,", ",onVolume" + "Change:")[0].exports.A;
const OverflowTooltip = spacepack.findByCode(/position:\i,delay:\i,\.\.\./)[0].exports.A;

type SourceMetadata = {
  identifier: {
    type: string;
    embedIndex?: number;
    size?: number;
    title?: string;
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
  currentIndex?: number;
};

const logger = moonlight.getLogger("Image Viewer");

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

// partal impl of https://stackoverflow.com/a/14919494
// (discord has their own formatters but they're Bad)
const units = ["KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
function bytesToHumanReadable(bytes: number): string {
  if (Math.abs(bytes) < 1024) {
    return bytes + " B";
  }

  let u = -1;
  do {
    bytes /= 1024;
    ++u;
  } while (Math.round(Math.abs(bytes) * 100) / 100 >= 1024 && u < units.length - 1);

  return bytes.toFixed(2) + " " + units[u];
}

// overengineered style manipulation
type ImageViewerCSSProperty = "scale" | "x" | "y" | "rotate";
const properties: Record<ImageViewerCSSProperty, string> = {
  scale: "--image-viewer-scale",
  x: "--image-viewer-x",
  y: "--image-viewer-y",
  rotate: "--image-viewer-rotate"
};
const suffixes: Record<ImageViewerCSSProperty, string> = {
  scale: "%",
  x: "px",
  y: "px",
  rotate: "deg"
};

function getProperty(element: HTMLElement, prop: ImageViewerCSSProperty) {
  const name = properties[prop];
  const suffix = suffixes[prop];

  const res = element.style.getPropertyValue(name).trim();
  if (!res.endsWith(suffix)) return null;

  const valueStr = res.slice(0, res.length - suffix.length);
  const value = parseFloat(valueStr);
  if (isNaN(value)) return null;

  return value;
}

function setProperty(element: HTMLElement, prop: ImageViewerCSSProperty, value: number) {
  element.style.setProperty(properties[prop], `${value}${suffixes[prop]}`);
}

function calculateScale(zoom: number) {
  return 2 ** (zoom * ZOOM_SCALE);
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
  sourceMetadata,
  currentIndex
}: Props) {
  const initialZoom = calculateInitialZoom(width, height);
  const minZoom = initialZoom - MAX_ZOOM;

  const [zoom, setZoom] = React.useState(initialZoom);
  const [editingZoom, setEditingZoom] = React.useState(false);
  const [zoomEdit, setZoomEdit] = React.useState(100);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const scaleRef = React.useRef(0);
  const draggingRef = React.useRef(false);

  // update this non-reactive ref for the callbacks
  scaleRef.current = calculateScale(zoom);

  const zoomLabel = scaleRef.current < 0.1 ? (scaleRef.current * 100).toFixed(2) : Math.round(scaleRef.current * 100);
  const isVideo = type === "VIDEO";

  const src = (() => {
    if (animated && sourceMetadata?.message != null) {
      const embedIdx = sourceMetadata.identifier?.embedIndex ?? -1;
      const embedProxyUrl = sourceMetadata.message.embeds?.[embedIdx]?.video?.proxyURL;
      if (embedProxyUrl != null) {
        const urlObj = new URL(embedProxyUrl);
        urlObj.searchParams.set("quality", "lossless");
        return urlObj.toString();
      }
    }

    if (proxyUrl != null) {
      const urlObj = new URL(proxyUrl);
      urlObj.searchParams.set("quality", "lossless");
      return urlObj.toString();
    } else {
      if (original) {
        const urlObj = new URL(original);
        if (urlObj.hostname === "cdn.discordapp.com") return original;
      }
      const urlObj = new URL(url);
      if (urlObj.hostname === "media.discordapp.net") urlObj.searchParams.set("quality", "lossless");
      return urlObj.toString();
    }
  })();
  const filename = new URL(src).pathname.split("/").pop();
  const poster = (() => {
    const urlObj = new URL(src);
    urlObj.searchParams.set("format", "webp");
    return urlObj.toString();
  })();
  const altText = (() => {
    const ret = alt ?? sourceMetadata?.identifier?.title;
    if (ret != null) return ret;

    // FIXME: embeds have a default description of "Image", idk if thats localized or not
    // FIXME: support for components v2 alt text
    if (currentIndex != null && sourceMetadata?.message != null) {
      const embedIdx = sourceMetadata.identifier?.embedIndex ?? -1;
      const embedProxyUrl = sourceMetadata.message.embeds?.[embedIdx]?.images?.[currentIndex]?.description;
      if (embedProxyUrl != null) return embedProxyUrl;
    }

    return null;
  })();

  // this uses `zoom` instead of `scale` since it's reactive to the zoom
  React.useEffect(() => {
    if (wrapperRef.current == null) return;
    setProperty(wrapperRef.current, "scale", calculateScale(zoom) * 100);
  }, [wrapperRef, zoom]);

  // Important to keep in mind that this creates a new callback (and thus new event listeners) when the inputs change
  // so if it used `zoom` instead of `scaleRef` it would recreate the events every time you zoomed lol
  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!draggingRef.current || wrapperRef.current == null) return;

      const x = getProperty(wrapperRef.current, "x") ?? 0;
      const y = getProperty(wrapperRef.current, "y") ?? 0;
      const scale = scaleRef.current;

      const diffX = e.movementX / scale;
      const diffY = e.movementY / scale;

      setProperty(wrapperRef.current, "x", x + diffX);
      setProperty(wrapperRef.current, "y", y + diffY);
    },
    [draggingRef, wrapperRef, scaleRef]
  );
  const handleMouseDown = React.useCallback(() => {
    draggingRef.current = true;
  }, [draggingRef]);
  const handleMouseUp = React.useCallback(() => {
    draggingRef.current = false;
  }, [draggingRef]);
  const handleWheel = React.useCallback(
    (e: WheelEvent) => {
      setZoom((zoom) => {
        // clamp delta, for linear scrolling (e.g. trackpads)
        const delta = Math.min(STEP_MAX, Math.max(-STEP_MAX, -e.deltaY));
        return Math.min(MAX_ZOOM, Math.max(minZoom, zoom + delta));
      });
    },
    [setZoom, minZoom]
  );

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
  }, [wrapperRef, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel]);

  return (
    <div className="imageViewer">
      <div className="imageViewer-container" ref={wrapperRef} onClick={stopPropagation}>
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
            className={`imageViewer-image${scaleRef.current >= 1 ? " imageViewer-pixelate" : ""}`}
            src={src}
            placeholder={src}
            alt={altText}
            width={width}
            height={height}
            zoomable={true}
          />
        )}
      </div>
      <div className="imageViewer-toolbar theme-dark">
        <div className="imageViewer-toolbar-buttons" onClick={stopPropagation}>
          {/* @ts-expect-error this type somehow got set to PropsWithChildren guh */}
          <HeaderBar.Icon tooltip={"Close"} tooltipPosition="top" icon={XLargeIcon} onClick={close} />

          <HeaderBar.Divider />

          {/* @ts-expect-error this type somehow got set to PropsWithChildren guh */}
          <HeaderBar.Icon
            tooltip={"Open in Browser"}
            tooltipPosition="top"
            icon={WindowLaunchIcon}
            onClick={() => {
              window.open(original);
            }}
          />
          {/* @ts-expect-error this type somehow got set to PropsWithChildren guh */}
          <HeaderBar.Icon
            tooltip="Copy Link"
            tooltipPosition="top"
            icon={LinkIcon}
            onClick={() => {
              try {
                copy(original);
                showToast(createToast(i18n.intl.string(i18n.t["L/PwZW"]), ToastType.SUCCESS));
              } catch (err) {
                logger.error("Failed to copy link:", err);
                showToast(createToast("Failed to copy link", ToastType.FAILURE));
              }
            }}
          />
          {/* @ts-expect-error missing typing for window.DiscordNative */}
          {!isVideo && !animated && window.DiscordNative != null ? (
            /* @ts-expect-error this type somehow got set to PropsWithChildren guh */
            <HeaderBar.Icon
              tooltip={"Copy Image"}
              tooltipPosition="top"
              icon={CopyIcon}
              onClick={() => {
                try {
                  NativeUtils.copyImage(src);
                  showToast(createToast(i18n.intl.string(i18n.t.bhUpvL), ToastType.SUCCESS));
                } catch (err) {
                  logger.error("Failed to copy link:", err);
                  showToast(createToast(i18n.intl.string(i18n.t.PTPbj4), ToastType.FAILURE));
                }
              }}
            />
          ) : null}

          <HeaderBar.Divider />

          {/* @ts-expect-error this type somehow got set to PropsWithChildren guh */}
          <HeaderBar.Icon
            tooltip="Recenter"
            tooltipPosition="top"
            icon={FullscreenEnterIcon}
            onClick={() => {
              if (wrapperRef.current != null) {
                setProperty(wrapperRef.current, "x", 0);
                setProperty(wrapperRef.current, "y", 0);
              }
              setZoom(initialZoom);
            }}
          />
          {/* @ts-expect-error this type somehow got set to PropsWithChildren guh */}
          <HeaderBar.Icon
            tooltip="Zoom In"
            tooltipPosition="top"
            icon={PlusLargeIcon}
            onClick={() => {
              setZoom((zoom) => Math.min(MAX_ZOOM, zoom + STEP_MAX));
            }}
          />
          {/* @ts-expect-error this type somehow got set to PropsWithChildren guh */}
          <HeaderBar.Icon
            tooltip="Zoom Out"
            tooltipPosition="top"
            icon={MinusIcon}
            onClick={() => {
              setZoom((zoom) => Math.max(minZoom, zoom - STEP_MAX));
            }}
          />

          <HeaderBar.Divider />

          {/* @ts-expect-error this type somehow got set to PropsWithChildren guh */}
          <HeaderBar.Icon
            tooltip="Rotate Counter-clockwise"
            tooltipPosition="top"
            icon={ArrowAngleLeftUpIcon}
            onClick={() => {
              if (wrapperRef.current != null) {
                const prevRotate = getProperty(wrapperRef.current, "rotate") ?? 0;
                setProperty(wrapperRef.current, "rotate", prevRotate - 90);
              }
            }}
          />
          {/* @ts-expect-error this type somehow got set to PropsWithChildren guh */}
          <HeaderBar.Icon
            tooltip="Rotate Clockwise"
            tooltipPosition="top"
            icon={ArrowAngleRightUpIcon}
            onClick={() => {
              if (wrapperRef.current != null) {
                const prevRotate = getProperty(wrapperRef.current, "rotate") ?? 0;
                setProperty(wrapperRef.current, "rotate", prevRotate + 90);
              }
            }}
          />
        </div>

        {altText ? (
          <div className="imageViewer-altText">
            <Text variant="text-sm/medium">{'"'}</Text>
            <Text variant="text-sm/medium" color="text-default">
              <OverflowTooltip>{altText}</OverflowTooltip>
            </Text>
            <Text variant="text-sm/medium">{'"'}</Text>
          </div>
        ) : null}

        <div className="imageViewer-toolbar-label" onClick={stopPropagation}>
          <Text variant="text-sm/medium" color="text-default">
            <OverflowTooltip>{filename}</OverflowTooltip>
          </Text>

          <HeaderBar.Divider />

          <Text variant="text-sm/medium">{`${width}x${height}`}</Text>

          {sourceMetadata?.identifier?.size ? (
            <>
              <HeaderBar.Divider />
              <Text variant="text-sm/medium">{bytesToHumanReadable(sourceMetadata.identifier.size)}</Text>
            </>
          ) : null}

          <HeaderBar.Divider />

          {editingZoom ? (
            <TextInput
              className="imageViewer-edit-zoom"
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
