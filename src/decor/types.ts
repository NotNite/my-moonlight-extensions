import { Snowflake } from "@moonlight-mod/types";

export const SKU_ID = "100101099111114"; // "decor" in decimal codepoints
export const RAW_SKU_ID = "11497119"; // raw in ascii numbers
export const GUILD_INVITE = "https://discord.gg/dXp2SdxDcP";

export type Preset = {
  id: string;
  name: string;
  description: string | null;
  decorations: Decoration[];
  authorIds: string[];
};

export type Decoration = {
  hash: string;
  animated: boolean;
  alt: string | null;
  authorId: Snowflake | null;
  reviewed: boolean | null;
  presetId: string | null;
};

export type NewDecoration = {
  file: File;
  alt: string | null;
};

export type DiscordDecoration = {
  asset: string;
  skuId: string;
};
