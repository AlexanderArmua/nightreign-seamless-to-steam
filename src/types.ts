export type SaveFormat = "steam" | "coop";

export interface SaveFormatInfo {
  extension: string;
  label: string;
}

export interface SaveDirectoryState {
  targetDir: string;
  steamIdFolder: string;
  hasSteamSave: boolean;
  hasCoopSave: boolean;
  files: string[];
}

export interface ConversionChoice {
  from: SaveFormat;
  to: SaveFormat;
}

export interface ConversionResult {
  mainConverted: boolean;
  bakConverted: boolean;
  fromExt: string;
  toExt: string;
}

export interface ParsedArgs {
  choice: ConversionChoice | null;
  testMode: boolean;
}

export class SaveDirectoryNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveDirectoryNotFoundError";
  }
}

export class NoSaveFilesError extends Error {
  constructor() {
    super("No save files (.sl2 or .co2) found in the directory.");
    this.name = "NoSaveFilesError";
  }
}

export interface MenuItem<T> {
  label: string;
  value: T;
}

export type AppMode = "standalone" | "launcher";

export type StandaloneMenuChoice = "copy_saves" | "install" | "uninstall";

export type LauncherMenuChoice = "classic" | "seamless_coop";

export interface LauncherContext {
  gameDir: string;
  originalLauncherPath: string;
  seamlessCoopLauncherPath: string;
  hasSeamlessCoop: boolean;
}

export interface InstallResult {
  success: boolean;
  gameDirPath: string;
  originalRenamed: boolean;
  exeCopied: boolean;
  seamlessCoopDetected: boolean;
}

export interface UninstallResult {
  success: boolean;
  gameDirPath: string;
  replacementDeleted: boolean;
  originalRestored: boolean;
}
