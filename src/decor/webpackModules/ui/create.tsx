import React from "@moonlight-mod/wp/react";
import {
  ModalRoot,
  ModalHeader,
  ModalSize,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  Text,
  TextInput,
  HelpMessage,
  HelpMessageTypes,
  FormSection,
  FormText
} from "@moonlight-mod/wp/discord/components/common/index";
import { Button } from "@moonlight-mod/wp/discord/uikit/legacy/Button";
import { openModal } from "@moonlight-mod/wp/discord/modules/modals/Modals";
import { UserStore } from "@moonlight-mod/wp/common_stores";
import { DecorAuthStore, DecorDecorationStore } from "@moonlight-mod/wp/decor_stores";
import { AvatarDecorationModalPreview, DecorationModalStyles, Margins } from "./components";
import { Decoration, GUILD_INVITE, RAW_SKU_ID } from "../../types";
import type { ModalProps } from "@moonlight-mod/mappings/types/discord/components/common/index";
import spacepack from "@moonlight-mod/wp/spacepack_spacepack";

import { joinGuild } from "./util";

let FileUpload: typeof import("@moonlight-mod/wp/discord/components/common/FileUpload").default;
spacepack
  .lazyLoad(
    `${".CREATE_STICKER_MODAL,"}${"location:"}`,
    /Promise\.all\((\[\i\.\i\("\d+"\).+?\])\)\.then\(\i\.bind\(\i,(\d+)\)\)/,
    /\.bind\(\i,(\d+)\)\);/
  )
  .then(() => (FileUpload = spacepack.require("discord/components/common/FileUpload").default));

function useObjectURL(object: Blob | MediaSource | null) {
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!object) return;

    const objectUrl = URL.createObjectURL(object);
    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [object]);

  return url;
}

function CreateDecorationModal(props: ModalProps) {
  const [name, setName] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) setError(null);
  }, [file]);

  const fileUrl = useObjectURL(file);

  const decoration = React.useMemo(() => (fileUrl ? { asset: fileUrl, skuId: RAW_SKU_ID } : null), [fileUrl]);

  return (
    <ModalRoot transitionState={props.transitionState} size={ModalSize.MEDIUM} className={DecorationModalStyles.modal}>
      <ModalHeader separator={false} className="decor-modal-header">
        <Text color="header-primary" variant="heading-lg/semibold" tag="h1" style={{ flexGrow: 1 }}>
          Create Decoration
        </Text>
        <ModalCloseButton onClick={props.onClose} />
      </ModalHeader>

      <ModalContent className="decor-create-decoration-modal-content" scrollbarType="none">
        <HelpMessage messageType={HelpMessageTypes.WARNING}>
          Make sure your decoration does not violate{" "}
          <a
            href="https://github.com/decor-discord/.github/blob/main/GUIDELINES.md"
            rel="noreferrer noopener"
            target="_blank"
            tabIndex={-1}
          >
            the guidelines
          </a>{" "}
          before submitting it.
        </HelpMessage>
        <div className="decor-create-decoration-modal-form-preview-container">
          <div className="decor-create-decoration-modal-form">
            {error !== null && (
              <Text color="text-danger" variant="text-xs/normal">
                {error.message}
              </Text>
            )}

            <FormSection title="File">
              <FileUpload
                filename={file?.name}
                placeholder="Choose a file"
                buttonText="Browse"
                filters={[{ name: "Decoration file", extensions: ["png", "apng"] }]}
                onFileSelect={setFile}
              />
              <FormText
                // @ts-expect-error TODO: mappings
                type="description"
                className={Margins.marginTop8}
              >
                File should be APNG or PNG.
              </FormText>
            </FormSection>
            <FormSection title="Name">
              <TextInput placeholder="Companion Cube" value={name} onChange={setName} />
              <FormText
                // @ts-expect-error TODO: mappings
                type="description"
                className={Margins.marginTop8}
              >
                This name will be used when referring to this decoration.
              </FormText>
            </FormSection>
          </div>
          <div>
            <AvatarDecorationModalPreview avatarDecorationOverride={decoration} user={UserStore.getCurrentUser()} />
          </div>
        </div>
        <HelpMessage messageType={HelpMessageTypes.INFO} className={Margins.marginBottom8}>
          To receive updates on your decoration's review, join{" "}
          <a
            href={GUILD_INVITE}
            rel="noreferrer noopener"
            target="_blank"
            tabIndex={-1}
            onClick={async (e) => {
              e.preventDefault();
              await props.onClose();
              joinGuild();
            }}
          >
            Decor's Discord server
          </a>{" "}
          and allow direct messages.
        </HelpMessage>
      </ModalContent>

      <ModalFooter className="decor-modal-footer">
        <Button
          onClick={async () => {
            setSubmitting(true);
            try {
              const decoration = await DecorAuthStore.selectDecoration({ alt: name, file: file! });
              DecorDecorationStore.addDecoration(decoration as Decoration);
              await props.onClose();
            } catch (e) {
              setSubmitting(false);
              if (e instanceof Error) setError(e);
            }
          }}
          disabled={!file || !name}
          submitting={submitting}
        >
          Submit for Review
        </Button>
        <Button onClick={props.onClose} color={Button.Colors.PRIMARY} look={Button.Looks.LINK}>
          Cancel
        </Button>
      </ModalFooter>
    </ModalRoot>
  );
}

export default function openCreateDecorationModal() {
  openModal((props: ModalProps) => {
    return <CreateDecorationModal {...props} />;
  });
}
