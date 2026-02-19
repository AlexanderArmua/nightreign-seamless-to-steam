import path from "path";
import type { SaveFormat, SaveFormatInfo } from "./types.js";

export const SAVE_FORMATS: Record<SaveFormat, SaveFormatInfo> = {
  steam: { extension: ".sl2", label: "Steam" },
  coop: { extension: ".co2", label: "SeamlessCoop" },
};

export const PROTECTED_FILES = ["steam_autocloud.vdf"];

// TODO: An user can have multiple savegames, so we need to be able to identify `N4<number>` as the base save name.
export const BASE_SAVE_NAME = "NR0000";

export function getNightreignDir(): string {
  const appData = process.env.APPDATA;
  if (!appData) {
    throw new Error("APPDATA environment variable not set. Are you on Windows?");
  }
  return path.join(appData, "Nightreign");
}
