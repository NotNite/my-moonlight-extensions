/* eslint-disable no-console */
import * as esbuild from "esbuild";
import copyStaticFiles from "esbuild-copy-static-files";
import fs from "fs";

const prod = process.env.NODE_ENV === "production";
const watch = process.argv.includes("--watch");
const clean = process.argv.includes("--clean");

function makeConfig(ext, name) {
  const entryPoints = [];
  const fileExts = ["js", "jsx", "ts", "tsx"];
  for (const fileExt of fileExts) {
    const path = `./src/${ext}/${name}.${fileExt}`;
    if (fs.existsSync(path)) entryPoints.push(path);
  }

  const wpModulesDir = `./src/${ext}/webpackModules`;
  if (fs.existsSync(wpModulesDir) && name === "index") {
    const wpModules = fs.readdirSync(wpModulesDir);
    for (const wpModule of wpModules) {
      entryPoints.push(`./src/${ext}/webpackModules/${wpModule}`);
    }
  }

  if (entryPoints.length === 0) return null;

  const wpImportPlugin = {
    name: "webpackImports",
    setup(build) {
      build.onResolve({ filter: /^@moonlight-mod\/wp\// }, (args) => {
        const wpModule = args.path.replace(/^@moonlight-mod\/wp\//, "");
        return {
          path: wpModule,
          external: true
        };
      });
    }
  };

  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  });
  const buildLogPlugin = {
    name: "buildLog",
    setup(build) {
      build.onEnd(() => {
        console.log(`[${timeFormatter.format(new Date())}] [${ext}/${name}] build finished`);
      });
    }
  };

  const styleInput = `./src/${ext}/style.css`;
  const styleOutput = `./dist/${ext}/style.css`;

  return {
    entryPoints,
    outdir: `./dist/${ext}`,

    format: "iife",
    globalName: "module.exports",
    platform: "node",

    treeShaking: true,
    bundle: true,
    minify: prod,
    sourcemap: "inline",

    external: ["electron", "fs", "path", "module", "events", "original-fs"],

    plugins: [
      copyStaticFiles({
        src: `./src/${ext}/manifest.json`,
        dest: `./dist/${ext}/manifest.json`
      }),
      ...(fs.existsSync(styleInput)
        ? [
            copyStaticFiles({
              src: styleInput,
              dest: styleOutput
            })
          ]
        : []),
      wpImportPlugin,
      buildLogPlugin
    ]
  };
}

const exts = fs.readdirSync("./src");

const config = exts
  .map((x) => [makeConfig(x, "index"), makeConfig(x, "node"), makeConfig(x, "host")])
  .flat()
  .filter((c) => c !== null);

if (clean) {
  fs.rmSync("./dist", { recursive: true, force: true });
} else if (watch) {
  await Promise.all(
    config.map(async (c) => {
      const ctx = await esbuild.context(c);
      await ctx.watch();
    })
  );
} else {
  for (const c of config) {
    await esbuild.build(c);
  }
}
