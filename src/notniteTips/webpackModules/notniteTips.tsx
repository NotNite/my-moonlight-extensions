import { CommandType, InputType } from "@moonlight-mod/types/coreExtensions/commands";
import Commands from "@moonlight-mod/wp/commands_commands";
import Dispatcher from "@moonlight-mod/wp/discord/Dispatcher";
import Text from "@moonlight-mod/wp/discord/design/components/Text/Text";
import { createToast } from "@moonlight-mod/wp/discord/design/components/Toast/web/Toast";
import { popToast, showToast } from "@moonlight-mod/wp/discord/design/components/Toast/web/ToastAPI";
import { ToastType } from "@moonlight-mod/wp/discord/design/components/Toast/web/ToastConstants";
import React from "@moonlight-mod/wp/react";
import spacepack from "@moonlight-mod/wp/spacepack_spacepack";

const MarkupClasses = spacepack.findByCode('"markup_', '"inlineFormat_')[0].exports;
const class_markup = spacepack.findObjectFromValueSubstring(MarkupClasses, "markup_");

type MarkupUtilsType = typeof import("@moonlight-mod/wp/discord/modules/markup/MarkupUtils").default;
let MarkupUtils: MarkupUtilsType;

const prefix = "<:notnite4head:1182032403288563843> **NotNite Tip:** ";
Promise.all([
  fetch("https://notnite.com/cors/tips/tips.json").then((r) => r.json()),
  fetch("https://notnite.com/cors/tips/moonlight.json").then((r) => r.json())
])
  .then((args: string[][]) => args.flat())
  .then((tips) => {
    function doATip() {
      // lazyload because importing it at entrypoint time causes webpack to break :(
      if (!MarkupUtils) {
        MarkupUtils = spacepack.require("discord/modules/markup/MarkupUtils")?.default as MarkupUtilsType;
      }
      if (!MarkupUtils) return;

      const tip = tips[Math.floor(Math.random() * tips.length)];
      showToast(
        createToast(null, ToastType.CUSTOM, {
          duration: 5000,
          component: (
            <Text variant="text-md/normal" className={`${class_markup} notnite-tip`} onClick={popToast}>
              {MarkupUtils.parse(prefix + tip, true)}
            </Text>
          )
        })
      );
    }

    setInterval(doATip, moonlight.getConfigOption<number>("notniteTips", "interval")! * 1000);
    Dispatcher.subscribe("CONNECTION_OPEN", doATip);
    Commands.registerCommand({
      id: "notniteTip",
      description: "Dispatch a NotNite Tip:tm:.",
      inputType: InputType.BUILT_IN,
      type: CommandType.CHAT,
      options: [],
      execute: () => doATip()
    });
  });
