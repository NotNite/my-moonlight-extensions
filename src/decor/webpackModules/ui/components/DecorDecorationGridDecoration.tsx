import { MenuItem } from "@moonlight-mod/wp/contextMenu_contextMenu";
import { DecorAuthStore, DecorDecorationStore } from "@moonlight-mod/wp/decor_stores";
import { closeContextMenu, openContextMenu } from "@moonlight-mod/wp/discord/actions/ContextMenuActionCreators";
import { CopyIcon, Menu, TrashIcon } from "@moonlight-mod/wp/discord/components/common/index";
import { useStateFromStores } from "@moonlight-mod/wp/discord/packages/flux";
import React from "@moonlight-mod/wp/react";
import { Decoration } from "../../../types";
import { alert, copy, decorationToAvatarDecoration } from "../util";
import { DecorationGridDecoration } from ".";

interface DecorDecorationGridDecorationProps extends React.HTMLProps<HTMLDivElement> {
  decoration: Decoration;
  isSelected: boolean;
  onSelect: () => void;
}

function DecorationContextMenu({ decoration }: { decoration: Decoration }) {
  const currentUser = useStateFromStores([DecorAuthStore], () => DecorAuthStore.currentUser);

  return (
    <Menu navId="decor-decoration" onClose={closeContextMenu} aria-label="Decoration Options">
      <MenuItem id="copy-hash" label="Copy Decoration Hash" icon={<CopyIcon />} action={() => copy(decoration.hash)} />
      {decoration.authorId === currentUser && (
        <MenuItem
          id="delete"
          label="Delete Decoration"
          color="danger"
          icon={<TrashIcon />}
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
