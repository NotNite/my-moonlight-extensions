import type { ExtensionWebExports } from "@moonlight-mod/types";

export const webpackModules: ExtensionWebExports["webpackModules"] = {
  entrypoint: {
    dependencies: [
      { ext: "spacepack", id: "spacepack" },
      { ext: "common", id: "stores" },
      "queryVoiceChannels",
      ':"QUICKSWITCHER_SELECT"'
    ],
    entrypoint: true
  }
};
