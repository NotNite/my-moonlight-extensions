import createNatives from "./natives";
import type { CSSEventCallback, CSSNodeNatives } from "./natives/types";
import { determineFileType, diffSets } from "./natives/utils";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import chokidar, { type FSWatcher } from "chokidar";
import { compileAsync } from "sass";

const logger = moonlightNode.getLogger("moonlight-css/node");
const watchers = new Map<string, FSWatcher>();

async function cancelWatcher(path: string, callback: CSSEventCallback) {
  const existing = watchers.get(path);
  if (existing != null) {
    watchers.delete(path);
    await existing.close();
  }
}

async function watch(root: string, callback: CSSEventCallback) {
  const isDir = (await fs.stat(root)).isDirectory();
  async function addFile(file: string) {
    const fileType = determineFileType(path.basename(file));
    if (fileType == null) return;

    const src = await fs.readFile(file, "utf8");
    await callback({
      type: "add",
      file: {
        path: file,
        parent: isDir ? root : undefined,
        src,
        fileType
      }
    });
  }

  async function removeFile(file: string) {
    const fileType = determineFileType(path.basename(file));
    if (fileType == null) return;
    await callback({ type: "remove", path: file });
  }

  await cancelWatcher(root, callback);
  const watcher = chokidar.watch(root).on("add", addFile).on("change", addFile).on("unlink", removeFile);
  watchers.set(root, watcher);
}

const nodeNatives: CSSNodeNatives = {
  async compileSass(path) {
    // compileAsync is slower but I don't wanna block the client
    const result = await compileAsync(path, {
      style: "expanded"
    });

    return result.css;
  },

  async watchPaths(paths, callback) {
    const oldPaths = new Set(watchers.keys());
    const diff = diffSets(oldPaths, paths);

    for (const removed of diff.removed) {
      try {
        await cancelWatcher(removed, callback);
      } catch (e) {
        logger.warn("Failed to remove watcher", removed, e);
      }
    }

    for (const added of diff.added) {
      try {
        await watch(added, callback);
      } catch (e) {
        logger.warn("Failed to create watcher", added, e);
      }
    }
  }
};

module.exports = createNatives(nodeNatives);
