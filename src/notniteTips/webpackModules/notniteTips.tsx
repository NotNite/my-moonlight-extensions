import React from "@moonlight-mod/wp/react";
import * as Components from "@moonlight-mod/wp/discord/components/common/index";
import spacepack from "@moonlight-mod/wp/spacepack_spacepack";
import MarkupUtils from "@moonlight-mod/wp/discord/modules/markup/MarkupUtils";
import Dispatcher from "@moonlight-mod/wp/discord/Dispatcher";
import Commands from "@moonlight-mod/wp/commands_commands";
import { CommandType, InputType } from "@moonlight-mod/types/coreExtensions/commands";

const { showToast, createToast, popToast, Text } = Components;
const MarkupClasses = spacepack.findByCode("markup:", "inlineFormat:")[0].exports;

const prefix = "<:notnite4head:1182032403288563843> **NotNite Tip:** ";
Promise.all([
  fetch("https://notnite.com/cors/tips/tips.json").then((r) => r.json()),
  fetch("https://notnite.com/cors/tips/moonlight.json").then((r) => r.json())
])
  .then((args: string[][]) => args.flat())
  .then((tips) => {
    function doATip() {
      const tip = tips[Math.floor(Math.random() * tips.length)];
      showToast(
        createToast(null, 3, {
          duration: 5000,
          component: (
            <Text variant="text-md/normal" className={`${MarkupClasses.markup} notnite-tip`} onClick={popToast}>
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
