import spacepack from "@moonlight-mod/wp/spacepack_spacepack";
import React from "@moonlight-mod/wp/react";
import Grid, { GridProps } from "./Grid";

const ScrollerClasses = spacepack.findByCode("managedReactiveScroller:")[0].exports;

type Section<SectionT, ItemT> = SectionT & {
  items: Array<ItemT>;
};

interface SectionedGridListProps<ItemT, SectionT, SectionU = Section<SectionT, ItemT>>
  extends Omit<GridProps<ItemT>, "items"> {
  renderSectionHeader: (section: SectionU) => JSX.Element;
  getSectionKey: (section: SectionU) => string;
  sections: SectionU[];
}

export default function SectionedGridList<ItemT, SectionU>(props: SectionedGridListProps<ItemT, SectionU>) {
  return (
    <div className={`decor-sectioned-grid-list-container ${ScrollerClasses.thin}`}>
      {props.sections.map((section) => (
        <div key={props.getSectionKey(section)}>
          {props.renderSectionHeader(section)}
          <Grid
            renderItem={props.renderItem}
            getItemKey={props.getItemKey}
            itemKeyPrefix={props.getSectionKey(section)}
            items={section.items}
          />
        </div>
      ))}
    </div>
  );
}