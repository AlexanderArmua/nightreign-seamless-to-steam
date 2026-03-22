import fs from "fs/promises";
import path from "path";
import { SAVE_FORMATS, getNightreignDir } from "./config.js";
import { SaveDirectoryNotFoundError, NoSaveFilesError } from "./types.js";
import type { SaveDirectoryState } from "./types.js";

/**
 * Optional callback to let the caller choose which Steam ID folder to use
 * when multiple are found. Receives folder names, returns the chosen one.
 * If not provided or returns null, the most recently modified folder is used.
 */
export type FolderSelector = (folders: string[]) => Promise<string | null>;

export async function detectSaveDirectory(
  selectFolder?: FolderSelector
): Promise<SaveDirectoryState> {
  const nightreignDir = getNightreignDir();
  await fs.access(nightreignDir);

  const items = await fs.readdir(nightreignDir, { withFileTypes: true });
  const numericFolders = items.filter(
    (item) => item.isDirectory() && /^\d+$/.test(item.name)
  );

  if (numericFolders.length === 0) {
    throw new SaveDirectoryNotFoundError(
      `Could not find any Steam ID folder (numbers) inside ${nightreignDir}`
    );
  }

  let folderName: string;

  if (numericFolders.length === 1) {
    folderName = numericFolders[0].name;
  } else {
    // Multiple Steam ID folders found — let the caller choose
    let selected: string | null = null;
    if (selectFolder) {
      selected = await selectFolder(numericFolders.map((f) => f.name));
    }

    if (selected && numericFolders.some((f) => f.name === selected)) {
      folderName = selected;
    } else {
      // Fallback: pick the most recently modified folder
      let bestFolder = numericFolders[0];
      let bestTime = 0;
      for (const f of numericFolders) {
        const dirStat = await fs.stat(path.join(nightreignDir, f.name));
        if (dirStat.mtimeMs > bestTime) {
          bestTime = dirStat.mtimeMs;
          bestFolder = f;
        }
      }
      folderName = bestFolder.name;
    }
  }

  const targetDir = path.join(nightreignDir, folderName);
  const steamIdFolder = folderName;
  const files = await fs.readdir(targetDir);

  const steamExt = SAVE_FORMATS.steam.extension;
  const coopExt = SAVE_FORMATS.coop.extension;
  const hasSteamSave = files.some((f) => f.endsWith(steamExt) && !f.endsWith(`${steamExt}.bak`));
  const hasCoopSave = files.some((f) => f.endsWith(coopExt) && !f.endsWith(`${coopExt}.bak`));

  if (!hasSteamSave && !hasCoopSave) {
    throw new NoSaveFilesError();
  }

  return {
    targetDir,
    steamIdFolder,
    hasSteamSave,
    hasCoopSave,
    files,
  };
}
