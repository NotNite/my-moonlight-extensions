import type { ExtensionWebpackModule, Patch } from "@moonlight-mod/types";

export const patches: Patch[] = [
  {
    find: ".zoomedMediaFitWrapper,",
    replace: {
      match: /(?<=\.Fragment,{children:)(\(0,\i\.jsx\))\(\i\.animated\.div,{.+?},(\i)\.url\)/,
      replacement: (_, createElement, media) =>
        `${createElement}(require("imageViewer_imageViewer").default,${media},${media}.url)`
    }
  },

  // media proxy cannot upscale images, prevent fetching images larger than possible
  {
    find: '.startsWith("data:image"))return',
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
      {
        ext: "spacepack",
        id: "spacepack"
      },
      {
        id: "react"
      },
      {
        id: "discord/components/common/index"
      },
      {
        id: "discord/uikit/HeaderBar"
      },
      {
        id: "discord/utils/ClipboardUtils"
      }
    ]
  }
};
