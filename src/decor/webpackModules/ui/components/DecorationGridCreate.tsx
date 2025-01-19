import React from "@moonlight-mod/wp/react";
import { DecorationGridItem } from ".";
import { Text, PlusLargeIcon } from "@moonlight-mod/wp/discord/components/common/index";

type DecorationGridCreateProps = React.HTMLProps<HTMLDivElement> & {
  onSelect: () => void;
};

export default function DecorationGridCreate(props: DecorationGridCreateProps) {
  return (
    <DecorationGridItem {...props} isSelected={false}>
      <PlusLargeIcon />
      <Text variant="text-xs/normal" color="header-primary">
        Create
      </Text>
    </DecorationGridItem>
  );
}
