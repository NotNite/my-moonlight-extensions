import type { CSSFileType } from "./types";

// FIXME: this is so stupidly jank, remove this in favor of MoonlightFS when the update comes out
// https://github.com/moonlight-mod/moonlight/commit/43706cecd3d69738bbb7b33daf554625c42e02d7
export function scuffedBasename(path: string) {
  const nodePath = moonlightNode.isBrowser ? null : (require("path") as typeof import("node:path"));

  if (nodePath != null) {
    return nodePath.basename(path);
  } else {
    const idx = path.lastIndexOf("/");
    return path.substring(idx + 1);
  }
}

export function isValidString(str?: string): str is string {
  return str != null && str.trim() !== "";
}

export function parseUrl(str: string) {
  try {
    const url = new URL(str);
    if (url.protocol === "https:" || url.protocol === "http:") return url;
  } catch {
    // ignored
  }

  return null;
}

// Set.prototype.difference() :drooling_face:
export function diffSets(before: Set<string>, after: Set<string>) {
  const added = new Set<string>();
  const removed = new Set<string>();

  for (const item of after.values()) {
    if (!before.has(item)) {
      added.add(item);
    }
  }

  for (const item of before.values()) {
    if (!after.has(item)) {
      removed.add(item);
    }
  }

  return { added, removed };
}

export function determineFileType(file: string): CSSFileType | null {
  if (file.endsWith(".sass") || file.endsWith(".scss")) {
    return "sass";
  } else if (file.endsWith(".user.css")) {
    return "usercss";
  } else if (file.endsWith(".css")) {
    return "css";
  } else {
    return null;
  }
}

// https://github.com/moonlight-mod/moonlight/blob/cbcf4afc43f9bb2347b822fe1f6a2bf74075d927/packages/core-extensions/src/moonbase/native.ts#L16
const userAgent = `moonlight/${moonlightNode.version} (https://github.com/moonlight-mod/moonlight)`;

// User-Agent header causes trouble on Firefox
const sharedHeaders: Record<string, string> = {};
if (!moonlightNode.isBrowser) sharedHeaders["User-Agent"] = userAgent;

export async function fetchCss(url: URL) {
  const resp = await fetch(url, {
    headers: sharedHeaders
  });

  if (!resp.ok) throw new Error(resp.statusText);

  return await resp.text();
}
