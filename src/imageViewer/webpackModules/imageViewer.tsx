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

type Props = {
  src: string;
  alt?: string;
  width: number;
  height: number;
  children?: React.ReactNode;
  animated: boolean;
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

export default function ImageViewer({
  src,
  width,
  height,
  alt
}: Props): JSX.Element {
  const [x, setX] = React.useState(0);
  const [y, setY] = React.useState(0);
  const [rotate, setRotate] = React.useState(0);
  const [zoom, setZoom] = React.useState(scale(width, height));
  const [dragging, setDragging] = React.useState(false);
  const wrapperRef = React.createRef<HTMLDivElement>();

  const filename = new URL(src).pathname.split("/").pop();

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
      let newZoom = zoom - e.deltaY / 500;
      if (newZoom < 0.1) newZoom = 0.1;
      setZoom(newZoom);
    },
    [zoom]
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
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleWheel]);

  return (
    <div className="imageViewer">
      <div className="imageViewer-container" ref={wrapperRef}>
        <Image
          className="imageViewer-image"
          src={src}
          placeholder={src}
          alt={alt}
          width={width}
          height={height}
          zoomable={true}
          style={{
            transform: `scale(${zoom}) translate(${x}px, ${y}px) rotate(${rotate}deg)`
          }}
        />
      </div>
      <div className="imageViewer-toolbar">
        <HeaderBar.Icon
          tooltip="Close"
          tooltipPosition="top"
          icon={XLargeIcon}
          onClick={() => {
            const ModalStore = useModalsStore.getState();
            closeModal(ModalStore.default[0].key);
          }}
        />

        <HeaderBar.Divider />

        <HeaderBar.Icon
          tooltip="Copy Link"
          tooltipPosition="top"
          icon={LinkIcon}
          onClick={() => {
            copy(src);
          }}
        />
        <HeaderBar.Icon
          tooltip="Copy Image"
          tooltipPosition="top"
          icon={CopyIcon}
          onClick={() => {
            NativeUtils.copyImage(src);
          }}
        />

        <HeaderBar.Divider />

        <HeaderBar.Icon
          tooltip="Recenter"
          tooltipPosition="top"
          icon={FullscreenEnterIcon}
          onClick={() => {
            setX(0);
            setY(0);
            setZoom(scale(width, height));
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

        <HeaderBar.Divider />

        <div className="imageViewer-toolbar-label">
          <Text variant="text-sm/medium">{filename}</Text>

          <HeaderBar.Divider />

          <Text variant="text-sm/medium">{`${width}x${height}`}</Text>

          <HeaderBar.Divider />

          <Text variant="text-sm/medium">{Math.round(zoom * 100)}%</Text>
        </div>
      </div>
    </div>
  );
}
