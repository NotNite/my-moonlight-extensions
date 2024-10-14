import type { ExtensionWebpackModule } from "@moonlight-mod/types";
export const webpackModules: Record<string, ExtensionWebpackModule> = {
  stores: {
    dependencies: [
      { id: "discord/packages/flux" },
      { id: "discord/Dispatcher" },
      { id: "discord/modules/spotify/SpotifyActionCreators" }
    ]
  },

  ui: {
    dependencies: [
      { ext: "spacepack", id: "spacepack" },
      { ext: "mediaControls", id: "stores" },
      { ext: "appPanels", id: "appPanels" },
      { id: "react" },
      { id: "discord/components/common/index" },
      { id: "discord/uikit/Flex" }
    ],
    entrypoint: true
  }
};
