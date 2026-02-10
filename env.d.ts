/// <reference types="@moonlight-mod/types" />

declare module "@moonlight-mod/wp/mediaControls_stores" {
  export * from "src/mediaControls/webpackModules/stores";
}

declare module "@moonlight-mod/wp/decor_api" {
  import api from "src/decor/webpackModules/api";
  export default api;
}

declare module "@moonlight-mod/wp/decor_stores" {
  export * from "src/decor/webpackModules/stores";
}
