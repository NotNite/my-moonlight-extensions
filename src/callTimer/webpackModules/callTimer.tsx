import { AuthenticationStore, VoiceChannelStartTimeStore, VoiceStateStore } from "@moonlight-mod/wp/common_stores";
import Text from "@moonlight-mod/wp/discord/design/components/Text/Text";
import React from "@moonlight-mod/wp/react";

function formatTime(elapsed: number) {
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = Math.floor(elapsed % 60);

  const items = hours > 0 ? [hours, minutes, seconds] : [minutes, seconds];
  return items.map((item) => item.toString().padStart(2, "0")).join(":");
}

export default function CallTimer({ channel, guild }: { channel: any; guild: any }): React.ReactNode {
  const [time, setTime] = React.useState("00:00");
  const [startTime, setStartTime] = React.useState<string | undefined>();
  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const connectedAt = VoiceStateStore.getVoiceState(guild.id, AuthenticationStore.getId())?.connectedAt ?? now;
      const startTime = VoiceChannelStartTimeStore.getStartTime(channel);

      setTime(formatTime(now - connectedAt));
      if (startTime != null) setStartTime(formatTime(now - Math.floor(startTime / 1000)));
    }, 1000);

    return () => clearInterval(timer);
  });

  return (
    <Text variant="text-xs/normal" className="callTimer-text">
      {`${time}${startTime != null ? ` • ${startTime}` : ""}`}
    </Text>
  );
}
