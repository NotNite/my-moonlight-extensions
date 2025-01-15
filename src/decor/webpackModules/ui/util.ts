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
