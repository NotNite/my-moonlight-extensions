import { ExtensionWebExports } from "@moonlight-mod/types";

const themeAttributes = () => moonlight.getConfigOption<boolean>("moonlight-css", "themeAttributes") ?? false;

export const patches: ExtensionWebExports["patches"] = [
  //#region Theme Attributes Patches

  // `data-tab-id` for settings menus
  {
    find: `.querySelectorAll('[role="tab"][aria-disabled="false"]')`,
    replace: {
      match: ",style:this.getStyle(),",
      replacement: (orig: string) => `${orig}"data-tab-id":this.props.id,`
    },
    prerequisite: themeAttributes
  },

  // Messages (`data-author-id`, `data-author-username`, `data-is-self`)
  {
    find: '"Message must not be a thread starter message"',
    replace: {
      match: ',"aria-setsize":-1,',
      replacement: (orig: string) =>
        `${orig}...require("moonlight-css_themeAttributes").messageAttributes(arguments[0].message),`
    },
    prerequisite: themeAttributes
  },

  // Avatar URL CSS vars
  // Message
  {
    find: '},"new-member")),', // keep in sync with component editor
    replace: {
      match: /src:(\i),"aria-hidden":!0,/,
      replacement: (orig, avatar) => `${orig}style:require("moonlight-css_themeAttributes").avatarUrls(${avatar}),`
    },
    prerequisite: themeAttributes
  },
  // Avatar component
  {
    find: '"getMaskId(): Unsupported type, size: "',
    replace: {
      match: /"img",{src:null!=(\i)\?/,
      replacement: (_, avatar) =>
        `"img",{style:require("moonlight-css_themeAttributes").avatarUrls(${avatar}),src:null!=${avatar}?`
    },
    prerequisite: themeAttributes
  }

  //#endregion
];

export const webpackModules: ExtensionWebExports["webpackModules"] = {
  entrypoint: {
    entrypoint: true,
    dependencies: [{ ext: "common", id: "stores" }, { id: "discord/Dispatcher" }]
  },
  themeAttributes: {
    dependencies: [{ ext: "common", id: "stores" }]
  }
};
