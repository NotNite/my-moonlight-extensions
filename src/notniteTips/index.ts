import { ExtensionWebExports } from "@moonlight-mod/types";

export const webpackModules: ExtensionWebExports["webpackModules"] = {
  notniteTips: {
    entrypoint: true,
    dependencies: [
      {
        id: "react"
      },
      {
        id: "discord/components/common/index"
      },
      {
        ext: "spacepack",
        id: "spacepack"
      },
      {
        id: "discord/modules/markup/MarkupUtils"
      },
      {
        id: "discord/Dispatcher"
      },
      {
        ext: "commands",
        id: "commands"
      }
    ]
  }
};
