import type { ExtensionWebpackModule, Patch } from "@moonlight-mod/types";

export const patches: Patch[] = [
  {
    find: ".Messages.OPEN_IN_BROWSER",
    replace: {
      match: /,{(.):function\(\){return (.)},(.):function\(\){return (.)}}\)/,
      replacement: (_, exp1, func1, exp2, func2) =>
        `,{${exp1}:function(){return(props)=>require("imageViewer_imageViewer").default(props,${func1})},${exp2}:function(){return(props)=>require("imageViewer_imageViewer").default(props,${func2})}})`
    }
  },

  // media proxy cannot upscale images, prevent fetching images larger than possible
  {
    find: /\(.{1,2}\+="\?"\+.{1,2}\.stringify\(.{1,2}\)\)/,
    replace: {
      // two replacements one patch: the sequel
      match: /function( .)?\((.)\){(let{src:.,sourceWidth:.,sourceHeight:.,targetWidth:.,targetHeight:.)/g,
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
