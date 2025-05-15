# media-fetcher

Provides information about the system media player to Media Controls:

- On Windows, uses System Media Transport Controls. Most media players work fine, though some may require plugins and/or have less features than others. [A full list and feature matrix can be found here](https://github.com/ModernFlyouts-Community/ModernFlyouts/blob/main/docs/GSMTC-Support-And-Popular-Apps.md)
- On macOS, uses MediaRemote.framework. This is a private framework and may be unstable.
- On Linux, uses MPRIS. Check if your media player supports MPRIS, as some media players don't.

## Installation

Either [download the executable](#download) or [build from source](#building), then keep the executable in a safe place. Set the "Media Fetcher Path" setting to the full path of the executable, then restart Discord.

## Download

Binaries are available on [GitHub Releases](https://github.com/NotNite/my-moonlight-extensions/releases/tag/media-fetcher-releases). Note that the macOS and Linux builds may not directly run on your system, in which case it's suggested to [build from source](#building) instead.

Alternatively, artifacts from CI runs can be found [here](https://github.com/NotNite/my-moonlight-extensions/actions/workflows/media-fetcher.yml), which can be downloaded using a tool like [nightly.link](https://nightly.link/).

## Building

[Install Rust](https://www.rust-lang.org/tools/install), then clone this repository and build from source:

```shell
git clone https://github.com/NotNite/my-moonlight-extensions.git
cd my-moonlight-extensions/src/mediaControls/media-fetcher
cargo build --release # output is in target/release
```
