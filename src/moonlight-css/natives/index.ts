// Little bit of context for what's going on here: This code is bundled twice,
// in the Node environment and in the Webpack module. If this extension is used
// in the browser, it'll call createNatives from the web, else it'll grab the
// natives using moonlight.getNatives like normal. Node-specific things like
// filesystem watching and Sass are passed in to this function, so we can
// *maybe* use it, depending on which environment is in use. Moonbase also does
// this trick: https://github.com/moonlight-mod/moonlight/blob/main/packages/core-extensions/src/moonbase/native.ts

import { NodeEventType } from "@moonlight-mod/types/core/event";
import type { CSSEvent, CSSEventCallback, CSSFile, CSSNativesInit, CSSNodeNatives, CSSState } from "./types";
import { determineFileType, diffSets, fetchCss, isValidString, parseUrl, scuffedBasename } from "./utils";

const logger = moonlightNode.getLogger("moonlight-css/natives");

export async function getFiles(dir: string, recursive: boolean): Promise<string[]> {
  const fs = moonlightNodeSandboxed.fs;

  if (!(await fs.exists(dir)) || !(await fs.isDir(dir))) {
    throw new Error("Tried to recursively search invalid path: " + dir);
  }

  const result = [];
  const entries = await fs.readdir(dir);

  for (const entry of entries) {
    const filePath = fs.join(dir, entry);

    if ((await fs.isDir(filePath)) && recursive) {
      const files = await getFiles(filePath, recursive);
      result.push(...files);
    } else if ((await fs.isFile(filePath)) && determineFileType(entry) != null) {
      result.push(filePath);
    }
  }

  return result;
}

async function migrateConfig() {
  const fs = moonlightNodeSandboxed.fs;

  // Already configured paths to the new format, do nothing
  const existingPaths = moonlightNode.getConfigOption<string[]>("moonlight-css", "paths");
  if (existingPaths != null) return;

  const cssPath = moonlightNode.getConfigOption<string>("moonlight-css", "cssPath");
  if (!isValidString(cssPath)) return;
  let outputPaths = [cssPath];

  // Migrate file selector by adding individual files
  try {
    const recurseDirectory = moonlightNode.getConfigOption<boolean>("moonlight-css", "recurseDirectory") ?? false;
    const fileSelector = moonlightNode.getConfigOption<string>("moonlight-css", "fileSelector");

    if (isValidString(fileSelector) && (await fs.exists(cssPath)) && (await fs.isDir(cssPath))) {
      const selectionRegex = new RegExp(fileSelector, "g");
      const paths = await getFiles(cssPath, recurseDirectory);

      // Reset the directory or else it'll ignore our file selector anyways
      outputPaths = [];

      for (const path of paths) {
        const filename = scuffedBasename(path);
        if (filename.match(selectionRegex) != null) {
          outputPaths.push(path);
        }
      }
    }
  } catch (e) {
    logger.warn("Failed to migrate file selector", e);
  }

  logger.info("Migrated config:", outputPaths);

  // Apply and wipe old config options to keep it clean
  // This is technically four disk writes in one which uhh sorry
  await moonlightNode.setConfigOption("moonlight-css", "paths", outputPaths);
  await moonlightNode.setConfigOption("moonlight-css", "cssPath", undefined);
  await moonlightNode.setConfigOption("moonlight-css", "fileSelector", undefined);
}

async function loadFile(path: string): Promise<CSSFile | null> {
  const fs = moonlightNodeSandboxed.fs;

  if (!(await fs.exists(path))) {
    logger.warn("Tried to load file that doesn't exist?", path);
    return null;
  }

  if (!(await fs.isFile(path))) {
    logger.warn("Tried to load directory as a file?", path);
    return null;
  }

  const filename = scuffedBasename(path);
  const fileType = determineFileType(filename);
  if (fileType == null) {
    // Unlike URLs, we enforce file extensions on the local filesystem
    logger.warn("Couldn't determine file type", path);
    return null;
  }

  const src = await fs.readFileString(path);
  return { path, src, fileType };
}

async function loadUrl(urlStr: string): Promise<CSSFile | null> {
  const url = parseUrl(urlStr);
  if (url == null) {
    logger.warn("Tried to load URL but couldn't parse it?", urlStr);
    return null;
  }

  const src = await fetchCss(url);
  const filename = scuffedBasename(url.pathname);
  const fileType = determineFileType(filename) ?? "css"; // file extension in the URL might not be .css

  return { path: urlStr, src, fileType };
}

async function processFile(file: CSSFile, callback: CSSEventCallback, node?: CSSNodeNatives) {
  let src = file.src;

  if (file.fileType === "sass") {
    if (node == null) {
      logger.warn("Refusing to load", file.path, "because there's no Node environment");
      return;
    }

    try {
      src = await node.compileSass(file.path);
    } catch (e) {
      logger.error("Failed to compile Sass for file", file.path, e);
      return;
    }
  }

  await callback({
    type: "add",
    file: {
      ...file,
      src
    }
  });
}

async function updateConfig(callback: CSSEventCallback, oldState?: CSSState, node?: CSSNodeNatives) {
  const fs = moonlightNodeSandboxed.fs;

  const newState: CSSState = {
    files: new Set(),
    dirs: new Set(),
    urls: new Set()
  };

  const recurseDirectory = moonlightNode.getConfigOption<boolean>("moonlight-css", "recurseDirectory") ?? false;
  const rawPaths = moonlightNode.getConfigOption<string[]>("moonlight-css", "paths") ?? [];

  for (const path of rawPaths) {
    try {
      if (parseUrl(path) != null) {
        newState.urls.add(path); // add string instead of parsed URL because of Set comparisons
      } else if (await fs.exists(path)) {
        if (await fs.isDir(path)) {
          newState.dirs.add(path);
        } else if (await fs.isFile(path)) {
          newState.files.add(path);
        }
      } else {
        logger.warn("Path does not exist", path);
      }
    } catch (e) {
      logger.warn("Error processing path", path, e);
    }
  }

  let filesToLoad: Set<string>;
  let dirsToLoad: Set<string>;
  let urlsToLoad: Set<string>;

  if (oldState != null) {
    const diffFiles = diffSets(oldState.files, newState.files);
    const diffDirs = diffSets(oldState.dirs, newState.dirs);
    const diffUrls = diffSets(oldState.urls, newState.urls);

    // Load new entries
    filesToLoad = diffFiles.added;
    dirsToLoad = diffDirs.added;
    urlsToLoad = diffUrls.added;

    // Remove old entries
    for (const path of diffFiles.removed.values()) {
      await callback({
        type: "remove",
        path
      });
    }

    for (const path of diffDirs.removed.values()) {
      await callback({
        type: "removeDir",
        path
      });
    }

    for (const path of diffUrls.removed.values()) {
      await callback({
        type: "remove",
        path
      });
    }
  } else {
    // Load everything
    filesToLoad = newState.files;
    dirsToLoad = newState.dirs;
    urlsToLoad = newState.urls;
  }

  for (const filePath of filesToLoad) {
    try {
      const file = await loadFile(filePath);
      if (file != null) await processFile(file, callback, node);
    } catch (e) {
      logger.warn("Failed to load file", filePath, e);
    }
  }

  for (const dir of dirsToLoad) {
    try {
      const files = await getFiles(dir, recurseDirectory);

      for (const filePath of files) {
        try {
          const file = await loadFile(filePath);

          if (file != null) {
            file.parent = dir;
            await processFile(file, callback, node);
          }
        } catch (e) {
          logger.warn("Failed to load file in directory", filePath, dir, e);
        }
      }
    } catch (e) {
      logger.warn("Failed to load directory", dir, e);
    }
  }

  for (const url of urlsToLoad) {
    try {
      const file = await loadUrl(url);
      if (file != null) await processFile(file, callback, node);
    } catch (e) {
      logger.warn("Failed to load URL", url, e);
    }
  }

  // watchPaths has its own comparison system
  if (node != null) {
    try {
      const paths = new Set([...newState.dirs, ...newState.files]);
      await node.watchPaths(paths, async (event) => {
        if (event.type === "add") {
          try {
            // The source we get isn't processed, so we need to do that first
            await processFile(event.file, callback, node);
          } catch (e) {
            logger.warn("Failed to add from watcher", event.file, e);
          }
        } else {
          await callback(event);
        }
      });
    } catch (e) {
      logger.warn("Error watching paths", e);
    }
  }

  return newState;
}

export default function createNatives(node?: CSSNodeNatives): CSSNativesInit {
  let callback: CSSEventCallback | undefined;
  let state: CSSState | undefined;

  async function safeCallback(event: CSSEvent) {
    try {
      await callback!(event);
    } catch (e) {
      logger.error("Error in callback", e);
    }
  }

  // Run using Promise.prototype.then to handle queued loads
  let promise = Promise.resolve();
  async function loadInPromise() {
    try {
      state = await updateConfig(safeCallback, state, node);
    } catch (e) {
      // must catch to not reject the promise
      logger.error("Failed to load", e);
    }
  }

  return async function init(cb) {
    if (callback != null) throw new Error("Tried to call init twice");
    callback = cb;

    try {
      await migrateConfig();
    } catch (e) {
      logger.warn("Failed to migrate", e);
    }

    promise = promise.then(loadInPromise);
    moonlightNode.events.addEventListener(NodeEventType.ConfigSaved, () => {
      promise = promise.then(loadInPromise);
    });
  };
}
