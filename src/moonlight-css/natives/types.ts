import type { homedir } from "os";

export type CSSEvent =
  | {
      type: "add";
      file: CSSFile;
    }
  | {
      type: "remove";
      path: string;
    }
  | {
      // Special remove call to remove all files loaded from this dir
      type: "removeDir";
      path: string;
    };

export type CSSFile = {
  path: string;
  parent?: string; // if file was loaded from a directory
  src: string;
  fileType: CSSFileType;
  theme: CSSTheme;
};

export type CSSNativesInit = (cb: CSSEventCallback) => Promise<void>;
export type CSSEventCallback = (event: CSSEvent) => Promise<void>;
export type CSSFileType = "usercss" | "css" | "sass";
export type CSSTheme = "none" | "light" | "dark";

export type CSSState = {
  files: Set<string>;
  dirs: Set<string>;
  urls: Set<string>;
};

// These are called by CSSNatives if it was provided
export interface CSSNodeNatives {
  compileSass(path: string): Promise<string>;
  watchPaths(paths: Set<string>, callback: CSSEventCallback): Promise<void>;
  homedir: typeof homedir;
}
