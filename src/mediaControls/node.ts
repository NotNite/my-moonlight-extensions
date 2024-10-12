import type { MediaControlsNatives } from "./types";
import * as child_process from "node:child_process";

const logger = moonlightNode.getLogger("mediaControls/node");
let process: child_process.ChildProcess | null = null;

const natives: MediaControlsNatives = {
  spawnMediaFetcher(cb) {
    if (process != null) {
      process.kill();
      process = null;
    }

    const mediaFetcherPath = moonlightNode.getConfigOption<string>("mediaControls", "mediaFetcherPath");
    if (mediaFetcherPath == null) return;

    process = child_process.spawn(mediaFetcherPath);

    let readBuffer = Buffer.alloc(0);
    process.stdout!.on("data", (data: Buffer) => {
      // read one line at a time
      readBuffer = Buffer.concat([readBuffer, data]);
      while (true) {
        const newlineIndex = readBuffer.indexOf("\n".charCodeAt(0));
        if (newlineIndex === -1) break;

        const str = readBuffer.subarray(0, newlineIndex).toString();
        readBuffer = readBuffer.subarray(newlineIndex + 1);

        const response = JSON.parse(str);
        cb(response);
      }
    });

    process.stderr!.on("data", (data: Buffer) => {
      logger.error(data.toString());
    });

    process.on("exit", () => {
      process = null;
    });
  },

  sendMediaFetcherRequest(request) {
    if (process == null) return;
    process.stdin!.write(JSON.stringify(request) + "\n");
  }
};

module.exports = natives;
