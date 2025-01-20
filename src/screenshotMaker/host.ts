import { app, globalShortcut } from "electron";
import type { BrowserWindow } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";

moonlightHost.events.on("window-created", (window: BrowserWindow, isMainWindow: boolean) => {
  if (!isMainWindow) return;
  app.whenReady().then(() => {
    globalShortcut.register("Alt+Ctrl+M", async () => {
      window.setSize(1280, 720);

      const img = await window.capturePage();
      const png = img.toPNG();
      await fs.writeFile(
        path.join(moonlightHost.getMoonlightDir(), `screenshot-${Math.floor(Date.now() / 1000)}.png`),
        png
      );
    });
  });
});
