import React from "@moonlight-mod/wp/react";
import { useStateFromStores } from "@moonlight-mod/wp/discord/packages/flux";
import * as Components from "@moonlight-mod/wp/discord/components/common/index";
import { openContextMenu, closeContextMenu } from "@moonlight-mod/wp/discord/actions/ContextMenuActionCreators";
import { DecorAuthStore, DecorDecorationStore } from "@moonlight-mod/wp/decor_stores";
import { Decoration } from "../../../types";
import { alert, copy, decorationToAvatarDecoration } from "../util";
import { DecorationGridDecoration } from ".";

const { Menu, MenuItem, CopyIcon, TrashIcon } = Components;

interface DecorDecorationGridDecorationProps extends React.HTMLProps<HTMLDivElement> {
  decoration: Decoration;
  isSelected: boolean;
  onSelect: () => void;
}

function DecorationContextMenu({ decoration }: { decoration: Decoration }) {
  // @ts-expect-error TODO: mappings
  const currentUser = useStateFromStores([DecorAuthStore], () => DecorAuthStore.currentUser);

  return (
    <Menu navId="decor-decoration" onClose={closeContextMenu} aria-label="Decoration Options">
      <MenuItem id="copy-hash" label="Copy Decoration Hash" icon={CopyIcon} action={() => copy(decoration.hash)} />
      {decoration.authorId === currentUser && (
        <MenuItem
          id="delete"
          label="Delete Decoration"
          color="danger"
          icon={TrashIcon}
          action={() =>
            alert("Delete Decoration", `Are you sure you want to delete "${decoration.alt}"?`, async () => {
              await DecorAuthStore.deleteDecoration(decoration);
              await DecorDecorationStore.updateForCurrentUser();
            })
          }
        />
      )}
    </Menu>
  );
}

export default function DecorDecorationGridDecoration(props: DecorDecorationGridDecorationProps) {
  const { decoration } = props;

  // TODO: context menu
  return (
    <DecorationGridDecoration
      {...props}
      onContextMenu={(e: React.SyntheticEvent) => {
        e.preventDefault();
        openContextMenu(e, () => <DecorationContextMenu decoration={props.decoration} />);
      }}
      avatarDecoration={decorationToAvatarDecoration(decoration)}
    />
  );
}
