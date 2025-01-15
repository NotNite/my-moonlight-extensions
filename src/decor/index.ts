import type { ExtensionWebExports } from "@moonlight-mod/types";

export const patches: ExtensionWebExports["patches"] = [
  {
    find: "isAvatarDecorationAnimating:",
    replace: {
      match:
        /(?<=avatarDecorationOverride:(\i)}.+?void 0:(\i)\.avatarDecoration,.+?)return{avatarPlaceholderSrc:\i,avatarDecorationSrc:(\i),isAvatarDecorationAnimating:(\i),/,
      replacement: (orig, avatarDecorationOverride, user, avatarDecorationSrc, isAvatarDecorationAnimating) =>
        `const __decorDecoration = require("decor_cache").default(${user}?.id, ${isAvatarDecorationAnimating});
        if (__decorDecoration != null && !${avatarDecorationOverride}) ${avatarDecorationSrc} = __decorDecoration;
        ${orig}`
    }
  },
  {
    find: "renderAvatarWithPopout(){",
    replace: {
      match:
        /currentUser:(\i).+?(\i)=\(0,\i\.\i\)\({avatarDecoration:\i,size:\(0,\i\.\i\)\(\i\.AvatarSizes\.SIZE_32\)}\);/,
      replacement: (orig, currentUser, avatarDecoration) =>
        `${orig}
        const __decorDecoration = require("decor_cache").default(${currentUser}?.id);
        if (__decorDecoration !== null) ${avatarDecoration} = __decorDecoration;`
    }
  }
];

export const webpackModules: ExtensionWebExports["webpackModules"] = {
  api: {},
  cache: {
    dependencies: [{ ext: "decor", id: "api" }]
  }
};
