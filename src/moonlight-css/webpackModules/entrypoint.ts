import createNatives from "../natives";
import type { CSSEvent, CSSFileType, CSSNativesInit } from "../natives/types";

const logger = moonlight.getLogger("moonlight-css");

type CSSEntry = {
  parent?: string;
  fileType: CSSFileType;
  element: HTMLStyleElement;
};

const entries = new Map<string, CSSEntry>();

async function callback(event: CSSEvent) {
  logger.trace("Got CSS event", event);

  const parent = document.documentElement;

  switch (event.type) {
    case "add": {
      // TODO: UserCSS support
      let existing = entries.get(event.file.path);

      if (existing == null) {
        const element = document.createElement("style");
        element.classList.add("moonlight-css");
        parent.appendChild(element);

        const entry: CSSEntry = {
          parent: event.file.parent,
          fileType: event.file.fileType,
          element
        };

        entries.set(event.file.path, entry);
        existing = entry;
      }

      if (existing.parent != null && event.file.parent == null) {
        // File was previously loaded by a recursive directory, but now it's specified directly
        existing.parent = undefined;
      }

      // lmao this is jank
      const safePath = event.file.path.replaceAll("\n", "").replaceAll("*", "");
      const pathBanner = `/* loaded by moonlight-css from ${safePath} */`;
      existing.element.textContent = pathBanner + "\n" + event.file.src;
      break;
    }

    case "remove": {
      const existing = entries.get(event.path);
      if (existing != null) {
        entries.delete(event.path);
        parent.removeChild(existing.element);
      }
      break;
    }

    case "removeDir": {
      for (const [path, entry] of entries.entries()) {
        if (entry.parent === event.path) {
          entries.delete(path);
          parent.removeChild(entry.element);
        }
      }

      break;
    }
  }
}

async function loadNatives() {
  let init: CSSNativesInit = moonlight.getNatives("moonlight-css");

  if (init == null) {
    // Only log on desktop since this code path is always true on browser
    if (!moonlightNode.isBrowser) logger.error("Failed to load natives on desktop, falling back to web-only");
    init = createNatives();
  }

  await init(callback);
}

loadNatives().catch((err) => {
  logger.error("Failed to load", err);
});
