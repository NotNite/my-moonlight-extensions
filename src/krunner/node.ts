import type { KRunnerNatives, KRunnerRequest } from "./types";
import * as child_process from "node:child_process";

const logger = moonlightNode.getLogger("krunner/node");
let pluginProcess: child_process.ChildProcess | undefined;

process.on("exit", () => {
  pluginProcess?.kill();
});

module.exports = {
  registerCallback(callback) {
    if (pluginProcess != null) {
      pluginProcess.kill("SIGKILL");
      pluginProcess = undefined;
    }

    const nativePath = moonlightNode.getConfigOption<string>("krunner", "nativePath");
    if (nativePath == null) return;

    pluginProcess = child_process.spawn(nativePath);

    let readBuffer = Buffer.alloc(0);
    pluginProcess.stdout!.on("data", (data: Buffer) => {
      // read one line at a time
      readBuffer = Buffer.concat([readBuffer, data]);
      while (true) {
        const newlineIndex = readBuffer.indexOf("\n".charCodeAt(0));
        if (newlineIndex === -1) break;

        const str = readBuffer.subarray(0, newlineIndex).toString();
        readBuffer = readBuffer.subarray(newlineIndex + 1);

        try {
          const request: KRunnerRequest = JSON.parse(str);
          //logger.debug("Handling request:", request);
          callback(request);
        } catch (e) {
          logger.error("Failed to handle runner request", e);
        }
      }
    });

    pluginProcess.stderr!.on("data", (data: Buffer) => {
      logger.error(data.toString());
    });

    pluginProcess.on("exit", () => {
      pluginProcess = undefined;
    });
  },

  sendResults(results) {
    //logger.debug("Sending results:", results);
    pluginProcess?.stdin?.write(JSON.stringify(results) + "\n");
  }
} satisfies KRunnerNatives;
