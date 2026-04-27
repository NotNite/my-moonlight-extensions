import type { ExtensionWebpackModule, Patch } from "@moonlight-mod/types";

export const patches: Patch[] = [
  {
    find: "renderConnectionStatus(){",
    replace: {
      match: /(?<=childrenAsSubtitle:!0,)children:((\(0,(\i)\.jsx\))\(\i\.\i,{children:.+?children:\i}\)}\)}\)}\))/,
      replacement: (_, children, createElement, ReactJSX) =>
        `children:[${children},${createElement}(require("callTimer_callTimer")?.default??${ReactJSX}.Fragment,{key:"callTimer",...this.props})]`
    }
  }
];

export const webpackModules: Record<string, ExtensionWebpackModule> = {
  callTimer: {
    dependencies: [{ id: "discord/Dispatcher" }, { id: "react" }, { id: "discord/design/components/Text/Text" }]
  }
};

export const styles = [
  `
.callTimer-text {
  color: var(--text-subtle);
}

[class*="connection_"] {
  &:has([class^="rtcConnectionStatusWrapper_"]) {
    padding-bottom: 0 !important;
  }

  & > [class^="inner_"] {
    height: unset !important;

    & > [class^="rtcConnectionStatusWrapper_"] > [class^="rtcConnectionStatus_"] {
      height: unset !important;
      align-items: start !important;
    }
  }
}
  `
];
