import type { ExtensionWebExports } from "@moonlight-mod/types";

export const patches: ExtensionWebExports["patches"] = [
  {
    find: ".uyrfYF",
    replace: [
      {
        match: '"staging"===window.GLOBAL_ENV.RELEASE_CHANNEL',
        replacement: "true"
      },
      {
        match: /\i\.intl\.format\(\i\.t\.uyrfYF,{buildNumber:("\d+")}\)/,
        replacement: (_, buildNumber) => `require("devBanner_devBanner").transform(${buildNumber})`
      }
    ]
  }
];

export const webpackModules: ExtensionWebExports["webpackModules"] = {
  devBanner: {}
};
