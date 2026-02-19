import fs from "fs/promises";
import path from "path";
import { BASE_SAVE_NAME, SAVE_FORMATS, getNightreignDir } from "./config.js";
import { SaveDirectoryNotFoundError, NoSaveFilesError } from "./types.js";
import type { SaveDirectoryState } from "./types.js";

export async function detectSaveDirectory(): Promise<SaveDirectoryState> {
  const nightreignDir = getNightreignDir();

  await fs.access(nightreignDir);

  const items = await fs.readdir(nightreignDir, { withFileTypes: true });
  const steamIdFolder = items.find(
    (item) => item.isDirectory() && /^\d+$/.test(item.name)
  );

  if (!steamIdFolder) {
    throw new SaveDirectoryNotFoundError(
      `Could not find any Steam ID folder (numbers) inside ${nightreignDir}`
    );
  }

  const targetDir = path.join(nightreignDir, steamIdFolder.name);
  const files = await fs.readdir(targetDir);

  // TODO: An user can have multiple savegames, so we need to be able to identify `N4<number>` as the base save name.
  const hasSteamSave = files.includes(`${BASE_SAVE_NAME}${SAVE_FORMATS.steam.extension}`);
  const hasCoopSave = files.includes(`${BASE_SAVE_NAME}${SAVE_FORMATS.coop.extension}`);

  if (!hasSteamSave && !hasCoopSave) {
    throw new NoSaveFilesError();
  }

  return {
    targetDir,
    steamIdFolder: steamIdFolder.name,
    hasSteamSave,
    hasCoopSave,
    files,
  };
}
