import { ExtensionWebExports } from "@moonlight-mod/types";

export const webpackModules: ExtensionWebExports["webpackModules"] = {
  notniteTips: {
    entrypoint: true,
    dependencies: [
      { id: "react" },
      { id: "discord/design/components/Text/Text" },
      { id: "discord/design/components/Toast/web/Toast" },
      { id: "discord/design/components/Toast/web/ToastAPI" },
      { ext: "spacepack", id: "spacepack" },
      { id: "discord/modules/markup/MarkupUtils" },
      { id: "discord/Dispatcher" },
      { ext: "commands", id: "commands" }
    ]
  }
};
