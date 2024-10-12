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

export const styles: string[] = [
  `
.imageViewer {
  width: 100vw;
  height: 100vh;
  max-height: 100vh;
  position: absolute;

  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.imageViewer,
.imageViewer-image {
  pointer-events: none;
}

.imageViewer-container,
.imageViewer-toolbar {
  pointer-events: auto;
}

.imageViewer-toolbar {
  position: absolute;
  bottom: 0;
  left: 0;
  width: calc(100% - 2rem);
  padding: 1rem;

  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
}

.imageViewer-toolbar-label {
  display: flex;
  flex-grow: 1;
  flex-direction: row;
  justify-content: end;
  align-items: center;
  z-index: 1;
}

.imageViewer-pixelate {
  image-rendering: pixelated;
}

[class*="modalCarouselWrapper"] {
  cursor: auto !important;
}
`
];
