import React from "@moonlight-mod/wp/react";
import { decorationToAvatarDecoration } from "../util";
import { Decoration } from "../../../types";
import { DecorationGridDecoration } from ".";

interface DecorDecorationGridDecorationProps extends React.HTMLProps<HTMLDivElement> {
  decoration: Decoration;
  isSelected: boolean;
  onSelect: () => void;
}

export default function DecorDecorationGridDecoration(props: DecorDecorationGridDecorationProps) {
  const { decoration } = props;

  // TODO: context menu
  return <DecorationGridDecoration {...props} avatarDecoration={decorationToAvatarDecoration(decoration)} />;
}
