import React from "@moonlight-mod/wp/react";
import { useStateFromStores } from "@moonlight-mod/wp/discord/packages/flux";
import { DecorAuthStore, DecorCacheStore, DecorDecorationStore } from "@moonlight-mod/wp/decor_stores";
import { Button } from "@moonlight-mod/wp/discord/components/common/index";
import { CustomizationSection } from "./components";
import Flex from "@moonlight-mod/wp/discord/uikit/Flex";
import openChangeDecorationModal from "./change";
import { Snowflake } from "@moonlight-mod/types";
import { DiscordDecoration, RAW_SKU_ID, SKU_ID } from "../../types";

export function DecorSection() {
  const { authorized, selectedDecoration } = useStateFromStores([DecorAuthStore, DecorDecorationStore], () => ({
    authorized: DecorAuthStore.authorized,
    selectedDecoration: DecorDecorationStore.userCurrentDecoration
  }));

  React.useEffect(() => {
    if (authorized) DecorDecorationStore.updateForCurrentUser();
  }, [DecorAuthStore.token]);

  return (
    <CustomizationSection title="Decor">
      <Flex>
        <Button
          onClick={() => {
            if (authorized) {
              openChangeDecorationModal();
            } else {
              const onChange = () => {
                openChangeDecorationModal();
                DecorAuthStore.removeChangeListener(onChange);
              };
              DecorAuthStore.addChangeListener(onChange);
              DecorAuthStore.authorize().catch(() => {});
            }
          }}
          size={Button.Sizes.SMALL}
        >
          Change Decoration
        </Button>

        {selectedDecoration && authorized && (
          <Button
            onClick={async () => {
              await DecorAuthStore.selectDecoration(null);
              DecorCacheStore.setUser(DecorAuthStore.currentUser, null);
              DecorDecorationStore.setDecoration(null);
            }}
            color={Button.Colors.PRIMARY}
            size={Button.Sizes.SMALL}
            look={Button.Looks.LINK}
          >
            Remove Decoration
          </Button>
        )}
      </Flex>
    </CustomizationSection>
  );
}

export function useDecorDecoration(id: Snowflake, canAnimate: boolean = true) {
  return useStateFromStores([DecorCacheStore], () => (id != null ? DecorCacheStore.getUser(id, canAnimate) : null));
}

export function getDecorAvatarDecorationURL({
  avatarDecoration,
  canAnimate
}: {
  avatarDecoration: DiscordDecoration | null;
  canAnimate?: boolean;
}) {
  if (avatarDecoration?.skuId === SKU_ID) {
    const parts = avatarDecoration.asset.split("_");
    // Remove a_ prefix if it's animated and animation is disabled
    if (avatarDecoration.asset.startsWith("a_") && !canAnimate) parts.shift();
    return moonlight.getConfigOption<string>("decor", "cdnUrl")! + `${parts.join("_")}.png`;
  } else if (avatarDecoration?.skuId === RAW_SKU_ID) {
    return avatarDecoration.asset;
  }
}
