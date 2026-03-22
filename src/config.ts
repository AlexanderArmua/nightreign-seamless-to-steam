import path from "path";
import type { SaveFormat, SaveFormatInfo } from "./types.js";

export const VERSION = "2.0.0";

export const SAVE_FORMATS: Record<SaveFormat, SaveFormatInfo> = {
  steam: { extension: ".sl2", label: "Steam" },
  coop: { extension: ".co2", label: "SeamlessCoop" },
};

export const PROTECTED_FILES = ["steam_autocloud.vdf"];

export const ORIGINAL_LAUNCHER_NAME = "start_protected_game.exe";
export const BACKUP_LAUNCHER_NAME = "start_protected_game_original.exe";
export const SEAMLESS_COOP_LAUNCHER_NAME = "nrsc_launcher.exe";

// TODO: An user can have multiple savegames, so we need to be able to identify `N4<number>` as the base save name.
export const BASE_SAVE_NAME = "NR0000";

export const NEXUS_MODS_URL = "https://www.nexusmods.com/eldenringnightreign/mods/3";
export const DEFAULT_STEAM_PATH = "C:\\Program Files (x86)\\Steam";
export const GAME_RELATIVE_PATH = "steamapps\\common\\ELDEN RING NIGHTREIGN\\Game";

/** Common drive letters and Steam installation paths to scan. */
export const COMMON_STEAM_PATHS = [
  "C:\\Program Files (x86)\\Steam",
  "C:\\Program Files\\Steam",
  "D:\\Program Files (x86)\\Steam",
  "D:\\Program Files\\Steam",
  "D:\\Steam",
  "D:\\SteamLibrary",
  "E:\\Program Files (x86)\\Steam",
  "E:\\Program Files\\Steam",
  "E:\\Steam",
  "E:\\SteamLibrary",
  "F:\\Steam",
  "F:\\SteamLibrary",
  "G:\\Steam",
  "G:\\SteamLibrary",
];

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
