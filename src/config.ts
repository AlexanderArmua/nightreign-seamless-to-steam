import path from "path";
import type { SaveFormat, SaveFormatInfo } from "./types.js";

export const SAVE_FORMATS: Record<SaveFormat, SaveFormatInfo> = {
  steam: { extension: ".sl2", label: "Steam" },
  coop: { extension: ".co2", label: "SeamlessCoop" },
};

export const PROTECTED_FILES = ["steam_autocloud.vdf"];

export const ORIGINAL_LAUNCHER_NAME = "start_protected_game.exe";
export const BACKUP_LAUNCHER_NAME = "start_protected_game_original.exe";
export const SEAMLESS_COOP_LAUNCHER_NAME = "NRSC_launcher.exe";

// TODO: An user can have multiple savegames, so we need to be able to identify `N4<number>` as the base save name.
export const BASE_SAVE_NAME = "NR0000";

export function getNightreignDir(): string {
  const appData = process.env.APPDATA;
  if (!appData) {
    throw new Error(
      "APPDATA environment variable not found. This tool requires Windows. " +
      "Use --test to run in test mode on other platforms."
    );
  }
  return path.join(appData, "Nightreign");
}
