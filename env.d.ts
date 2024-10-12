/// <reference types="@moonlight-mod/types" />

declare module "@moonlight-mod/wp/appPanels_appPanels" {
  import { AppPanels } from "src/appPanels/types";
  const AppPanels: AppPanels;
  export = AppPanels;
}

declare module "@moonlight-mod/wp/mediaControls_stores" {
  export * from "src/mediaControls/webpackModules/stores";
}
