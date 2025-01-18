import React from "@moonlight-mod/wp/react";
import { DecorAuthStore } from "@moonlight-mod/wp/decor_stores";
import spacepack from "@moonlight-mod/wp/spacepack_spacepack";
import { Preset } from "../../../types";

const decorationModule = spacepack.findByCode(".decorationGridItem,")[0].exports;

export const DecorationGridItem = decorationModule.__decor_DecorationGridItem;
export const DecorationGridDecoration = decorationModule.__decor_DecorationGridDecoration;
export const AvatarDecorationModalPreview = spacepack.findByCode(".shopPreviewBanner")[0].exports.Z;
export const CustomizationSection = spacepack.findByCode(".customizationSectionBackground")[0].exports.Z;
export const DecorationModalStyles = spacepack.findByCode("modalFooterShopButton:")[0].exports;
export const Margins = spacepack.require("discord/styles/shared/Margins.css");
export const UserSummaryItem = spacepack.findByCode("defaultRenderUser", "showDefaultAvatarsForNullUsers")[0].exports.Z;

export function usePresets() {
  const [presets, setPresets] = React.useState<Preset[]>([]);
  React.useEffect(() => {
    DecorAuthStore.getPresets().then(setPresets);
  }, []);
  return presets;
}
