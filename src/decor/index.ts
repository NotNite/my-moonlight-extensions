import type { Patch, ExtensionWebpackModule } from "@moonlight-mod/types";
import { SKU_ID } from "./types";

export const patches: Patch[] = [
  // Patch MediaResolver to return correct URL for Decor avatar decorations
  {
    find: "getAvatarDecorationURL:",
    replace: {
      match: /(?<=function \i\(\i\){)(?=let{avatarDecoration)/,
      replacement: `const __decorDecoration = require("decor_ui").getDecorAvatarDecorationURL(arguments[0]); if (__decorDecoration) return __decorDecoration;`
    }
  },

  // Render decorations in UI
  {
    find: "isAvatarDecorationAnimating:",
    replace: {
      match:
        /(?<=avatarDecorationOverride:(\i)}.+?void 0:(\i)\.avatarDecoration,.+?)return{avatarPlaceholderSrc:\i,avatarDecorationSrc:(\i),isAvatarDecorationAnimating:(\i),/,
      replacement: (orig, avatarDecorationOverride, user, avatarDecorationSrc, isAvatarDecorationAnimating) =>
        `const __decorDecoration = require("decor_ui").useDecorDecoration(${user}?.id, ${isAvatarDecorationAnimating});
        if (__decorDecoration != null && !${avatarDecorationOverride}) ${avatarDecorationSrc} = __decorDecoration;
        ${orig}`
    }
  },
  {
    find: '("Account")',
    replace: {
      match: /(\i)=\(0,\i\.\i\)\({avatarDecoration:\i,size:.+?\.SIZE_32\)}\),/,
      replacement: (orig, avatarDecoration) =>
        `${orig}
        __decorDecoration = require("decor_ui").useDecorDecoration(arguments[0].currentUser?.id);
        if (__decorDecoration != null) ${avatarDecoration} = __decorDecoration;
        let `
    }
  },

  // Add section to profile customization
  {
    find: '"DefaultCustomizationSections"',
    replace: {
      match: /"decoration"\),(?=.*?(\(0,\i\.jsx\)))/,
      replacement: (orig, createElement) => `${orig}${createElement}(require("decor_ui").DecorSection,{}),`
    }
  },

  // Export some components
  {
    find: ".decorationGridItem,",
    replace: [
      {
        match: /=(\i=>{.+?\.decorationGridItem,.+?children:\i}\)\)},)/,
        replacement: (_, DecorationGridItem) => `=exports.__decor_DecorationGridItem=${DecorationGridItem}`
      },
      {
        match: /=(\i=>{var{user:\i,avatarDecoration:)/,
        replacement: (_, DecorationGridDecoration) =>
          `=exports.__decor_DecorationGridDecoration=${DecorationGridDecoration}`
      },
      // Remove "NEW" label from Decor decorations
      {
        match: /(?<=avatarDecorationOverride:(\i),.+?=>)\i===\i\.\i\.PURCHASE/,
        replacement: (orig, decoration) => `${decoration}.skuId==="${SKU_ID}"||${orig}`
      }
    ]
  }
];

export const webpackModules: Record<string, ExtensionWebpackModule> = {
  stores: {
    dependencies: [
      {
        id: "discord/packages/flux"
      },
      {
        id: "discord/Dispatcher"
      },
      {
        ext: "spacepack",
        id: "spacepack"
      },
      {
        ext: "common",
        id: "stores"
      }
    ]
  },

  ui: {
    dependencies: [
      {
        id: "discord/components/common/index"
      },
      {
        id: "react"
      },
      {
        id: "discord/packages/flux"
      },
      {
        ext: "decor",
        id: "stores"
      },
      {
        ext: "spacepack",
        id: "spacepack"
      },
      {
        ext: "common",
        id: "stores"
      },
      {
        id: "discord/uikit/Flex"
      },
      {
        ext: "contextMenu",
        id: "contextMenu"
      }
    ]
  }
};
