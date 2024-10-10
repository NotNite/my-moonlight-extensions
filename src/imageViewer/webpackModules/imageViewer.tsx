import spacepack from "@moonlight-mod/wp/spacepack_spacepack";
import React from "@moonlight-mod/wp/react";
import * as Components from "@moonlight-mod/wp/discord/components/common/index";

const {
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

  closeModal,
  useModalsStore
} = Components;
const HeaderBar = spacepack.require("discord/uikit/HeaderBar").default;
const ClipboardUtils = spacepack.require("discord/utils/ClipboardUtils");
const copy = Object.entries(ClipboardUtils).find(
  ([key, value]) => typeof value !== "boolean"
)?.[1] as (text: string) => void;
const NativeUtils = spacepack.findByCode("Data fetch unsuccessful")[0].exports
  .ZP;
const Video = spacepack.findByCode(".Messages.VIDEO", ",onVolumeChange:")[0]
  .exports.Z;
const { Messages } = spacepack.require("discord/i18n").default;

type Props = {
  src: string;
  alt?: string;
  width: number;
  height: number;
  children?: React.ReactNode;
  animated: boolean;
  poster?: string;
  onClose: () => void;
};

function scale(width: number, height: number) {
  const padding = 128;
  const maxWidth = window.innerWidth - padding;
  const maxHeight = window.innerHeight - padding;

  if (width <= maxWidth && height <= maxHeight) return 1;

  const widthScale = maxWidth / width;
  const heightScale = maxHeight / height;
  return Math.min(widthScale, heightScale);
}

function close() {
  const ModalStore = useModalsStore.getState();
  closeModal(ModalStore.default[0].key);
}

const noop = () => {};

export default function ImageViewer({
  src,
  width,
  height,
  alt,
  poster
}: Props): JSX.Element {
  const calculatedScale = React.useMemo(
    () => scale(width, height),
    [width, height]
  );

  const [x, setX] = React.useState(0);
  const [y, setY] = React.useState(0);
  const [rotate, setRotate] = React.useState(0);
  const [zoom, setZoom] = React.useState(calculatedScale);
  const [dragging, setDragging] = React.useState(false);
  const wrapperRef = React.createRef<HTMLDivElement>();

  const filename = React.useMemo(
    () => new URL(src).pathname.split("/").pop(),
    [src]
  );
  const isVideo = React.useMemo(() => poster != null, [poster]);

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!dragging) return;

      setX((prevX) => prevX + e.movementX / zoom);
      setY((prevY) => prevY + e.movementY / zoom);
    },
    [dragging, zoom]
  );
  const handleMouseDown = React.useCallback(() => {
    setDragging(true);
  }, []);
  const handleMouseUp = React.useCallback(() => {
    setDragging(false);
  }, []);
  const handleWheel = React.useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      let deltaY = e.deltaY;

      // clamp delta, for linear scrolling (e.g. trackpads)
      if (deltaY > 20) {
        deltaY = 20;
      } else if (deltaY < -20) {
        deltaY = -20;
      }

      // * zoom here to make it more smooth when scrolling in farther
      const newZoom = zoom + (-deltaY / 100) * zoom;
      const newZoomClamped = Math.min(
        20,
        Math.max(calculatedScale / 10, newZoom)
      );
      setZoom(newZoomClamped);
    },
    [zoom, calculatedScale]
  );

  React.useEffect(() => {
    // FIXME: this seems to be re-registering events every time the component updates. not great
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
  }, [
    wrapperRef.current,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel
  ]);

  const transformStyle = React.useMemo(
    () => `scale(${zoom}) translate(${x}px, ${y}px) rotate(${rotate}deg)`,
    [zoom, x, y, rotate]
  );

  return (
    <div className="imageViewer">
      <div
        className="imageViewer-container"
        ref={wrapperRef}
        style={{
          transform: transformStyle
        }}
      >
        {isVideo ? (
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
            className={`imageViewer-image${
              zoom > 1 ? " imageViewer-pixelate" : ""
            }`}
            src={src}
            placeholder={src}
            alt={alt}
            width={width}
            height={height}
            zoomable={true}
          />
        )}
      </div>
      <div className="imageViewer-toolbar">
        <HeaderBar.Icon
          tooltip={Messages.CLOSE}
          tooltipPosition="top"
          icon={XLargeIcon}
          onClick={close}
        />

        <HeaderBar.Divider />

        <HeaderBar.Icon
          tooltip={Messages.OPEN_IN_BROWSER}
          tooltipPosition="top"
          icon={WindowLaunchIcon}
          onClick={() => {
            window.open(src);
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
        {!isVideo && window.DiscordNative != null ? (
          <HeaderBar.Icon
            tooltip={Messages.COPY_IMAGE_MENU_ITEM}
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
            setZoom(calculatedScale);
          }}
        />
        <HeaderBar.Icon
          tooltip="Zoom In"
          tooltipPosition="top"
          icon={PlusLargeIcon}
          onClick={() => {
            setZoom((prevZoom) => prevZoom + 0.1);
          }}
        />
        <HeaderBar.Icon
          tooltip="Zoom Out"
          tooltipPosition="top"
          icon={MinusIcon}
          onClick={() => {
            setZoom((prevZoom) => prevZoom - 0.1);
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

        <div className="imageViewer-toolbar-label">
          <Text variant="text-sm/medium">{filename}</Text>

          <HeaderBar.Divider />

          <Text variant="text-sm/medium">{`${width}x${height}`}</Text>

          <HeaderBar.Divider />

          <Text variant="text-sm/medium">
            {zoom < 0.1 ? (zoom * 100).toFixed(2) : Math.round(zoom * 100)}%
          </Text>
        </div>
      </div>
    </div>
  );
}
