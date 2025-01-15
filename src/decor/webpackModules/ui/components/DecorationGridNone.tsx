import React from "@moonlight-mod/wp/react";
import { DecorationGridItem } from ".";
import * as Components from "@moonlight-mod/wp/discord/components/common/index";

const { Text, XLargeIcon } = Components;

type DecorationGridNoneProps = React.HTMLProps<HTMLDivElement> & {
  isSelected: boolean;
  onSelect: () => void;
};

export default function DecorationGridNone(props: DecorationGridNoneProps) {
  return (
    <DecorationGridItem {...props}>
      <XLargeIcon />
      <Text variant="text-xs/normal" color="header-primary">
        None
      </Text>
    </DecorationGridItem>
  );
}
