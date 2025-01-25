import type { MediaControlsNatives } from "./types";
import * as child_process from "node:child_process";

const logger = moonlightNode.getLogger("mediaControls/node");
let mediaFetcherProcess: child_process.ChildProcess | null = null;

process.on("exit", () => {
  mediaFetcherProcess?.kill();
});

const natives: MediaControlsNatives = {
  spawnMediaFetcher(cb) {
    if (mediaFetcherProcess != null) {
      mediaFetcherProcess.kill("SIGKILL");
      mediaFetcherProcess = null;
    }

    const mediaFetcherPath = moonlightNode.getConfigOption<string>("mediaControls", "mediaFetcherPath");
    if (mediaFetcherPath == null) return;

    mediaFetcherProcess = child_process.spawn(mediaFetcherPath);

    let readBuffer = Buffer.alloc(0);
    mediaFetcherProcess.stdout!.on("data", (data: Buffer) => {
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

    mediaFetcherProcess.stderr!.on("data", (data: Buffer) => {
      logger.error(data.toString());
    });

    mediaFetcherProcess.on("exit", () => {
      mediaFetcherProcess = null;
    });
  },

  sendMediaFetcherRequest(request) {
    if (mediaFetcherProcess == null) return;
    mediaFetcherProcess.stdin!.write(JSON.stringify(request) + "\n");
  }
};

module.exports = natives;
