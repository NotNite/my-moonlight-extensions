import spacepack from "@moonlight-mod/wp/spacepack_spacepack";
import { Decoration, DiscordDecoration, GUILD_INVITE, SKU_ID } from "../../types";

export function decorationToAsset(decoration: Decoration) {
  return `${decoration.animated ? "a_" : ""}${decoration.hash}`;
}

export function decorationToAvatarDecoration(decoration: Decoration): DiscordDecoration {
  return { asset: decorationToAsset(decoration), skuId: SKU_ID };
}

export function joinGuild() {
  // TODO: copied from moonlight
  // kind of hides the invite we should probably do this better
  try {
    const openLink = spacepack.findFunctionByStrings(
      spacepack.findByCode(".trackAnnouncementMessageLinkClicked({messageId:")[0].exports,
      ".trackAnnouncementMessageLinkClicked({messageId:"
    ) as ({ href }: { href: string }) => void;
    openLink({ href: GUILD_INVITE });
  } catch {
    window.open(GUILD_INVITE);
  }
}

export function copy(str: string) {
  const ClipboardUtils = spacepack.require("discord/utils/ClipboardUtils");
  const copy = Object.entries(ClipboardUtils).find(([key, value]) => typeof value !== "boolean")?.[1] as (
    text: string
  ) => void;
  copy(str);
}

export function alert(title: string, body: string, onConfirm: () => void) {
  const Alerts = spacepack.findByCode("secondaryConfirmText:", "this.show({")[0].exports.Z;
  Alerts.show({
    title,
    body,
    confirmColor: "decor-danger-btn",
    confirmText: "Yes",
    cancelText: "No",
    onConfirm
  });
}
