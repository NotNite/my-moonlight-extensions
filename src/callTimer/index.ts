import type { ExtensionWebpackModule, Patch } from "@moonlight-mod/types";

export const patches: Patch[] = [
  {
    find: "renderConnectionStatus(){",
    replace: {
      match: /(.)\.jsx(.+?)channel,children:(.)\}/,
      replacement: (_, react, filler, children) =>
        `${react}.jsx${filler}channel,children:${react}.jsx(
  require("callTimer_callTimer").default,
  { children: ${children} }
)}`
    }
  }
];

export const webpackModules: Record<string, ExtensionWebpackModule> = {
  callTimer: {
    dependencies: [
      {
        id: "discord/Dispatcher"
      },
      {
        id: "react"
      }
    ]
  }
};
