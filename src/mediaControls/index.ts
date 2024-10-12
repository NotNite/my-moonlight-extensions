import type { ExtensionWebpackModule } from "@moonlight-mod/types";
export const webpackModules: Record<string, ExtensionWebpackModule> = {
  stores: {
    dependencies: [{ id: "discord/packages/flux" }, { id: "discord/Dispatcher" }]
  },

  ui: {
    dependencies: [
      { ext: "spacepack", id: "spacepack" },
      { ext: "mediaControls", id: "stores" },
      { ext: "appPanels", id: "appPanels" },
      { id: "react" },
      { id: "discord/components/common/index" },
      { id: "discord/uikit/Flex" }
    ],
    entrypoint: true
  }
};

export const styles: string[] = [
  `
@property --progress {
  syntax: "<percentage>";
  inherits: false;
  initial-value: 0%;
}

.mediaControls {
  display: flex;
  flex-direction: row;
  align-items: center;

  padding: 0.5rem;
  height: 2.5rem;
  gap: 0.5rem;
  padding-top: 0.75rem;

  background: linear-gradient(
      to right,
      var(--interactive-normal) var(--progress),
      rgba(0, 0, 0, 0) 0%,
      rgba(0, 0, 0, 0) 100%
    )
    no-repeat 0 0/100%;
  background-size: 100% 0.25rem;

.mediaControls-cover {
  height: 100%;

  flex-grow: 0;
  flex-shrink: 1;
  flex-basis: auto;
}

.mediaControls-labels {
  width: 100%;
}

.mediaControls-labels, .mediaControls-labels div {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.mediaControls-labels div:hover {
  text-decoration: underline;
}

.mediaControls-interact {
  display: flex;
  align-items: center;

  flex-grow: 0;
  flex-shrink: 1;
  flex-basis: auto;
}
  `
];
