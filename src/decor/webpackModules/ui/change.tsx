import React from "@moonlight-mod/wp/react";
import {
  ModalRoot,
  ModalSize,
  ModalHeader,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  Text,
  Tooltip,
  FormTitle,
  FormText
} from "@moonlight-mod/wp/discord/components/common/index";
import { Button } from "@moonlight-mod/wp/discord/uikit/legacy/Button";
import { openModal } from "@moonlight-mod/wp/discord/modules/modals/Modals";
import { useStateFromStores } from "@moonlight-mod/wp/discord/packages/flux";
import { DecorAuthStore, DecorCacheStore, DecorDecorationStore } from "@moonlight-mod/wp/decor_stores";
import Flex from "@moonlight-mod/wp/discord/uikit/Flex";
import { UserStore } from "@moonlight-mod/wp/common_stores";

import { Decoration } from "../../types";
import { alert, copy, decorationToAvatarDecoration, joinGuild } from "./util";
import SectionedGridList from "./components/SectionedGridList";
import DecorationGridNone from "./components/DecorationGridNone";
import DecorationGridCreate from "./components/DecorationGridCreate";
import DecorDecorationGridDecoration from "./components/DecorDecorationGridDecoration";
import {
  AvatarDecorationModalPreview,
  DecorationModalStyles,
  Margins,
  UserSummaryItem,
  usePresets
} from "./components";
import openGuidelinesModal from "./guidelines";
import openCreateDecorationModal from "./create";
import MarkupUtils from "@moonlight-mod/wp/discord/modules/markup/MarkupUtils";
import type { ModalProps } from "@moonlight-mod/mappings/types/discord/components/common/index";

type Section = {
  title: string;
  subtitle?: string;
  sectionKey: string;
  items: ("none" | "create" | Decoration)[];
  authorIds?: string[];
};

function SectionHeader({ section }: { section: Section }) {
  const hasSubtitle = typeof section.subtitle !== "undefined";
  const hasAuthorIds = typeof section.authorIds !== "undefined";

  const [authors, setAuthors] = React.useState<unknown[]>([]);

  React.useEffect(() => {
    if (!section.authorIds) return;

    for (const authorId of section.authorIds) {
      const author = UserStore.getUser(authorId);
      if (author == null) continue;
      setAuthors((authors) => [...authors, author]);
    }
  }, [section.authorIds]);

  return (
    <div>
      <Flex>
        <FormTitle style={{ flexGrow: 1 }}>{section.title}</FormTitle>

        {hasAuthorIds && (
          <UserSummaryItem
            users={authors}
            guildId={undefined}
            renderIcon={false}
            max={5}
            size={16}
            showUserPopout={true}
            className={Margins.marginBottom8}
          />
        )}
      </Flex>

      {hasSubtitle && (
        <FormText
          // @ts-expect-error TODO: mappings
          type="description"
          className={Margins.marginBottom8}
        >
          {section.subtitle}
        </FormText>
      )}
    </div>
  );
}

function ChangeDecorationModal(props: ModalProps) {
  const [tryingDecoration, setTryingDecoration] = React.useState<Decoration | null | undefined>(undefined);
  const isTryingDecoration = typeof tryingDecoration !== "undefined";

  const avatarDecorationOverride =
    tryingDecoration != null ? decorationToAvatarDecoration(tryingDecoration) : tryingDecoration;

  const { userCreatedDecorations, userCurrentDecoration, agreedToGuidelines } = useStateFromStores(
    [DecorDecorationStore, DecorAuthStore],
    () => ({
      userCreatedDecorations: DecorDecorationStore.userCreatedDecorations,
      userCurrentDecoration: DecorDecorationStore.userCurrentDecoration,
      agreedToGuidelines: DecorAuthStore.getState().agreedToGuidelines
    })
  );

  React.useEffect(() => {
    DecorDecorationStore.updateForCurrentUser();
  }, []);

  const activeSelectedDecoration = isTryingDecoration ? tryingDecoration : userCurrentDecoration;
  const activeDecorationHasAuthor = typeof activeSelectedDecoration?.authorId !== "undefined";
  const decorationAuthor = useStateFromStores([UserStore], () =>
    activeDecorationHasAuthor ? UserStore.getUser(activeSelectedDecoration.authorId) : null
  );
  const hasDecorationPendingReview = userCreatedDecorations.some((d) => d.reviewed === false);

  const presets = usePresets();
  const presetDecorations = presets.flatMap((preset) => preset.decorations);

  const activeDecorationPreset = presets.find((preset) => preset.id === activeSelectedDecoration?.presetId);
  const isActiveDecorationPreset = typeof activeDecorationPreset !== "undefined";

  const ownDecorations = userCreatedDecorations.filter((d) => !presetDecorations.some((p) => p.hash === d.hash));

  const data = [
    {
      title: "Your Decorations",
      subtitle: "You can delete your own decorations by right clicking on them.",
      sectionKey: "ownDecorations",
      items: ["none", ...ownDecorations, "create"]
    },
    ...presets.map((preset) => ({
      title: preset.name,
      subtitle: preset.description || undefined,
      sectionKey: `preset-${preset.id}`,
      items: preset.decorations,
      authorIds: preset.authorIds
    }))
  ] as Section[];

  return (
    <ModalRoot transitionState={props.transitionState} size={ModalSize.DYNAMIC} className={DecorationModalStyles.modal}>
      <ModalHeader separator={false} className="decor-modal-header">
        <Text color="header-primary" variant="heading-lg/semibold" tag="h1" style={{ flexGrow: 1 }}>
          Change Decoration
        </Text>
        <ModalCloseButton onClick={() => props.onClose()} />
      </ModalHeader>

      <ModalContent className="decor-change-decoration-modal-content" scrollbarType="none">
        <SectionedGridList
          renderItem={(item) => {
            if (typeof item === "string") {
              switch (item) {
                case "none":
                  return (
                    <DecorationGridNone
                      className="decor-change-decoration-modal-decoration"
                      isSelected={activeSelectedDecoration === null}
                      onSelect={() => setTryingDecoration(null)}
                    />
                  );
                case "create":
                  return (
                    <Tooltip
                      text="You already have a decoration pending review"
                      shouldShow={hasDecorationPendingReview}
                    >
                      {(tooltipProps) => (
                        <DecorationGridCreate
                          className="decor-change-decoration-modal-decoration"
                          {...tooltipProps}
                          onSelect={
                            !hasDecorationPendingReview
                              ? agreedToGuidelines
                                ? openCreateDecorationModal
                                : openGuidelinesModal
                              : () => {}
                          }
                        />
                      )}
                    </Tooltip>
                  );
              }
            } else {
              return (
                <Tooltip text={"Pending review"} shouldShow={item.reviewed === false}>
                  {(tooltipProps) => (
                    <DecorDecorationGridDecoration
                      {...tooltipProps}
                      className="decor-change-decoration-modal-decoration"
                      onSelect={item.reviewed !== false ? () => setTryingDecoration(item) : () => {}}
                      isSelected={activeSelectedDecoration?.hash === item.hash}
                      decoration={item}
                    />
                  )}
                </Tooltip>
              );
            }
          }}
          getItemKey={(item) => (typeof item === "string" ? item : item.hash)}
          getSectionKey={(section) => section.sectionKey}
          renderSectionHeader={(section) => <SectionHeader section={section} />}
          sections={data}
        />

        <div className="decor-change-decoration-modal-preview">
          <AvatarDecorationModalPreview
            avatarDecorationOverride={avatarDecorationOverride}
            user={UserStore.getCurrentUser()}
          />
          {isActiveDecorationPreset && (
            <FormTitle className="">Part of the {activeDecorationPreset.name} Preset</FormTitle>
          )}
          {typeof activeSelectedDecoration === "object" && (
            <Text variant="text-sm/semibold" color="header-primary">
              {activeSelectedDecoration?.alt}
            </Text>
          )}
          {activeDecorationHasAuthor && (
            <div
              onMouseOver={() => {
                DecorCacheStore.ensureOrLookupUser(activeSelectedDecoration.authorId!);
              }}
            >
              <Text key={`createdBy-${activeSelectedDecoration.authorId}`} variant="text-sm/normal">
                Created by{" "}
                {MarkupUtils.parse(
                  `<@${activeSelectedDecoration.authorId}>` + (decorationAuthor == null ? " (hover to lookup)" : ""),
                  true
                )}
              </Text>
            </div>
          )}
          {isActiveDecorationPreset && (
            <Button
              onClick={() => {
                copy(activeDecorationPreset.id);
              }}
            >
              Copy Preset ID
            </Button>
          )}
        </div>
      </ModalContent>

      <ModalFooter className="decor-change-decoration-modal-footer decor-modal-footer">
        <div className="decor-change-decoration-modal-footer-btn-container">
          <Button
            onClick={async () => {
              await DecorAuthStore.selectDecoration(tryingDecoration!);
              DecorCacheStore.setUser(DecorAuthStore.currentUser, tryingDecoration!.hash);
              DecorDecorationStore.setDecoration(tryingDecoration!);
              await props.onClose();
            }}
            disabled={!isTryingDecoration || tryingDecoration?.hash === userCurrentDecoration?.hash}
          >
            Apply
          </Button>
          <Button onClick={() => props.onClose()} color={Button.Colors.PRIMARY} look={Button.Looks.LINK}>
            Cancel
          </Button>
        </div>
        <div className="decor-change-decoration-modal-footer-btn-container">
          <Button
            onClick={() => {
              alert("Log Out", "Are you sure you want to log out of Decor?", () => {
                DecorAuthStore.logout();
                props.onClose();
              });
            }}
            color={Button.Colors.PRIMARY}
            look={Button.Looks.LINK}
          >
            Log Out
          </Button>
          <Tooltip text="Join Decor's Discord Server for notifications on your decoration's review, and when new presets are released">
            {(tooltipProps) => (
              <Button
                {...tooltipProps}
                onClick={async () => {
                  await props.onClose();
                  joinGuild();
                }}
                color={Button.Colors.PRIMARY}
                look={Button.Looks.LINK}
              >
                Discord Server
              </Button>
            )}
          </Tooltip>
        </div>
      </ModalFooter>
    </ModalRoot>
  );
}

export default function openChangeDecorationModal() {
  openModal((props) => {
    return <ChangeDecorationModal {...props} />;
  });
}
