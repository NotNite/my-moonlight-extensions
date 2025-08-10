# krunner

## Build instructions

```shell
git clone https://github.com/NotNite/my-moonlight-extensions.git
cd my-moonlight-extensions/src/krunner

# Build the plugin
cd moonlight-krunner
cargo build --release
cd ..

# Register the plugin
mkdir -p ~/.local/share/krunner/dbusplugins
cp ./moonlight-krunner.desktop ~/.local/share/krunner/dbusplugins

# Restart KRunner to apply changes
killall krunner
```
