import React from "@moonlight-mod/wp/react";
import * as Components from "@moonlight-mod/wp/discord/components/common/index";
import spacepack from "@moonlight-mod/wp/spacepack_spacepack";
import MarkupUtils from "@moonlight-mod/wp/discord/modules/markup/MarkupUtils";
import Dispatcher from "@moonlight-mod/wp/discord/Dispatcher";
import Commands from "@moonlight-mod/wp/commands_commands";
import { CommandType, InputType } from "@moonlight-mod/types/coreExtensions/commands";

const { showToast, createToast, popToast, ToastType, Text } = Components;
const MarkupClasses = spacepack.findByCode("markup:", "inlineFormat:")[0].exports;

const prefix = "<:notnite4head:1182032403288563843> **NotNite Tip:** ";
const tips = [
  "Click a link to open it in your web browser.",
  "moonlight and extensions can be updated from within Moonbase.",
  "Did you know I'm watching?",
  "An internet connection is required to use Discord.",
  "moonlight works best on a monitor that is at least 3 pixels wide.",
  "Discord tokens are named that way because they're designed to be shared as a token of friendship!",
  "Downloading every extension you see on the Internet is a great way to spice up your client!",
  "It is suggested to focus on the conversation you're having instead of reading this message.",
  "Tip not available. Please try again later.",
  "What is wrong with you?",
  "moonlight is not compatible with the DEWALT 12 in. Double-Bevel Sliding Compound Miter Saw DWS779.",
  "Does everything happen so much? Close Discord! Nothing can stop you.",
  "Like moonlight? Tell your friends!",
  "It would be a shame if that conversation was screenshotted and posted on the Internet.",
  "Why would you post that?",
  "Great!"
];

function doATip() {
  const tip = tips[Math.floor(Math.random() * tips.length)];
  showToast(
    createToast(null, ToastType.CUSTOM, {
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
