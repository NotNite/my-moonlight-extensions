import Dispatcher from "@moonlight-mod/wp/discord/Dispatcher";
import React from "@moonlight-mod/wp/react";

let startTime: number | null = null;

Dispatcher.subscribe("RTC_CONNECTION_STATE", (data) => {
  if (data.context !== "default") return;
  startTime = data.state === "RTC_CONNECTED" ? Date.now() : null;
});

function formatTime(elapsed: number) {
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = Math.floor(elapsed % 60);

  const items = hours > 0 ? [hours, minutes, seconds] : [minutes, seconds];
  return items.map((item) => item.toString().padStart(2, "0")).join(":");
}

export default function CallTimer({ children }: { children: React.ReactNode }): JSX.Element {
  const [time, setTime] = React.useState(formatTime(0));

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (startTime != null) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        setTime(formatTime(elapsed));
      } else {
        setTime("");
      }
    }, 500);

    return () => clearInterval(interval);
  });

  return time !== "" ? (
    <span>
      {time}
      <br />
      {children}
    </span>
  ) : (
    <>{children}</>
  );
}
