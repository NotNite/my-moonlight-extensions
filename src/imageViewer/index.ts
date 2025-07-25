import type { ExtensionWebpackModule, Patch } from "@moonlight-mod/types";

export const patches: Patch[] = [
  {
    find: /startIndex:\i=0,/,
    replace: {
      match:
        /(\(0,\i\.jsx\)\(\i\.\i,{items:\i,currentIndex:(\i),children:\(\i,\i\)=>)(\(0,\i\.jsx\))(\(\i,{isObscured:.+?media:(\i).+?onContextMenu:\i}\)}\)}\),)/,
      replacement: (_, beginning, currentIndex, createElement, body, media) =>
        `require("imageViewer_imageViewer")?.default!=null?${createElement}(require("imageViewer_imageViewer").default,{...${media},currentIndex:${currentIndex}}):${beginning}${createElement}${body}`
    }
  },
  {
    find: ':"MediaViewerModal",',
    replace: [
      {
        match:
          /children:(\(0,\i\.jsxs\)\(\i\.\i\.Provider,{value:\i,children:\[.+?)(\(0,\i\.jsx\)\(\i\.\i,{items:\i.+?shouldHideMediaOptions:\i}\))]}\)/,
        replacement: (_, start, modal) =>
          `children:require("imageViewer_imageViewer")?.default!=null?${modal}:${start}${modal}]})`
      },
      {
        match: /(className:\i\(\)\(\i\.carouselModal,\i)\),/,
        replacement: (_, orig) => `${orig},"imageViewer-modal"),`
      }
    ]
  },

  // media proxy cannot upscale images, prevent fetching images larger than possible
  {
    find: '.startsWith("data:image")',
    replace: {
      match: /function( \i)?\((\i)\){(let{src:\i,sourceWidth:\i,sourceHeight:\i,targetWidth:\i,targetHeight:\i)/,
      replacement: (_, name, props, orig) =>
        `function${
          name ?? ""
        }(${props}){if(${props}.sourceWidth<${props}.targetWidth){${props}.targetWidth=${props}.sourceWidth;${props}.targetHeight=${props}.sourceHeight;}${orig}`
    }
  }
];

export const webpackModules: Record<string, ExtensionWebpackModule> = {
  imageViewer: {
    dependencies: [
      { ext: "spacepack", id: "spacepack" },
      { id: "react" },
      { id: "discord/components/common/index" },
      { id: "discord/components/common/BaseHeaderBar" },
      { id: "discord/uikit/TextInput" },
      { id: "discord/utils/ClipboardUtils" },
      { id: "discord/modules/modals/Modals" }
    ]
  }
};
