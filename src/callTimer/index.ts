import type { ExtensionWebpackModule, Patch } from "@moonlight-mod/types";

export const patches: Patch[] = [
  {
    find: "renderConnectionStatus(){",
    replace: {
      match: /children:this\.renderConnectionStatus\(\)(?=}\),(\(0,\i\.jsxs\)))/,
      replacement: (_, createElement) =>
        `children:[this.renderConnectionStatus(),${createElement}(require("callTimer_callTimer").default,{key:"callTimer"})]`
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

export const styles = [
  `
.callTimer-text {
  color: var(--header-secondary);
}

[class*="connection_"]:has([class*="rtcConnectionStatusWrapper_"]) {
  padding-bottom: 0 !important;
}
  `
];
