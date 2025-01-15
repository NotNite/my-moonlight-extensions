import React from "@moonlight-mod/wp/react";
import * as Components from "@moonlight-mod/wp/discord/components/common/index";
import { DecorationModalStyles, ModalProps } from "./components";
import { DecorAuthStore } from "@moonlight-mod/wp/decor_stores";
import openCreateDecorationModal from "./create";

const {
  ModalRoot,
  ModalSize,
  ModalHeader,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  Text,
  FormText,
  openModalLazy,
  Button
} = Components;

function GuidelinesModal(props: ModalProps) {
  return (
    <ModalRoot transitionState={props.transitionState} size={ModalSize.SMALL} className={DecorationModalStyles.modal}>
      <ModalHeader separator={false} className="decor-modal-header">
        <Text color="header-primary" variant="heading-lg/semibold" tag="h1" style={{ flexGrow: 1 }}>
          Hold on
        </Text>
        <ModalCloseButton onClick={() => props.onClose()} />
      </ModalHeader>
      <ModalContent scrollbarType="none">
        <FormText>
          By submitting a decoration, you agree to{" "}
          <a
            href="https://github.com/decor-discord/.github/blob/main/GUIDELINES.md"
            rel="noreferrer noopener"
            target="_blank"
            tabIndex={-1}
          >
            the guidelines
          </a>
          . Not reading these guidelines may get your account suspended from creating more decorations in the future.
        </FormText>
      </ModalContent>
      <ModalFooter className="decor-modal-footer">
        <Button
          onClick={async () => {
            DecorAuthStore.agreeToGuidelines();
            await props.onClose();
            setTimeout(openCreateDecorationModal, 0);
          }}
        >
          Continue
        </Button>
        <Button onClick={() => props.onClose()} color={Button.Colors.PRIMARY} look={Button.Looks.LINK}>
          Go Back
        </Button>
      </ModalFooter>
    </ModalRoot>
  );
}

export default async function openGuidelinesModal() {
  // @ts-expect-error TODO: mappings
  await openModalLazy(async () => {
    return (props: ModalProps) => {
      return <GuidelinesModal {...props} />;
    };
  });
}
