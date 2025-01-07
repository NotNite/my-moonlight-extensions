import type { ExtensionWebpackModule, Patch } from "@moonlight-mod/types";

export const patches: Patch[] = [
  {
    find: '"displayName","SpotifyStore"',
    replace: {
      match: /hasConnectedAccount\(\){return Object.keys\((.)\)/,
      replacement: (orig, accounts) => `__getAccounts(){return ${accounts}}${orig}`
    }
  }
];

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
  },

  richPresence: {
    dependencies: [
      { ext: "spacepack", id: "spacepack" },
      { ext: "mediaControls", id: "stores" },
      { ext: "common", id: "stores" },
      { id: "discord/Dispatcher" },
      { id: "discord/Constants" },
      { id: "discord/utils/HTTPUtils" },
      { id: "discord/modules/spotify/SpotifyActionCreators" }
    ],
    entrypoint: true
  }
};
