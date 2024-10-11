import type { Patch } from "@moonlight-mod/types";

export const patches: Patch[] = [
  {
    find: ".DEV_NOTICE_STAGING.format",
    replace: [
      {
        match: '"staging"===window.GLOBAL_ENV.RELEASE_CHANNEL',
        replacement: "true"
      },
      {
        match:
          /.\..\.Messages\.DEV_NOTICE_STAGING\.format\({buildNumber:(.+?)}\)/,
        replacement: (_, buildNumber) =>
          `window.GLOBAL_ENV.RELEASE_CHANNEL.charAt(0).toUpperCase() + window.GLOBAL_ENV.RELEASE_CHANNEL.slice(1) + " " + ${buildNumber}`
      }
    ]
  }
];
