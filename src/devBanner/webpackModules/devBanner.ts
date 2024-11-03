// Bit too verbose to fix the naming in a patch, so this'll work
const names: Record<string, string> = {
  stable: "Stable",
  ptb: "PTB",
  canary: "Canary",
  staging: "Staging" // lmfao
};

export function transform(buildNumber: string) {
  // @ts-expect-error untyped
  const releaseChannel: string = window.GLOBAL_ENV.RELEASE_CHANNEL;

  if (names[releaseChannel]) {
    return `${names[releaseChannel]} ${buildNumber}`;
  } else {
    return `${releaseChannel.charAt(0).toUpperCase() + releaseChannel.slice(1)} ${buildNumber}`;
  }
}
