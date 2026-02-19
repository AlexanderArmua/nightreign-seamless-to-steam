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
