import fs from "fs/promises";
import path from "path";
import { SAVE_FORMATS, PROTECTED_FILES } from "./config.js";
import type { ConversionChoice, ConversionResult, ConvertedFile } from "./types.js";

export async function convert(
  targetDir: string,
  backupDir: string,
  files: string[],
  choice: ConversionChoice
): Promise<ConversionResult> {
  const fromExt = SAVE_FORMATS[choice.from].extension;
  const toExt = SAVE_FORMATS[choice.to].extension;

  // Find all save files that need conversion (exclude .bak variants)
  const saveFiles = files.filter(
    (f) => f.endsWith(fromExt) && !f.endsWith(`${fromExt}.bak`)
  );

  // Pre-validate: ensure at least one save file exists before any destructive operation
  if (saveFiles.length === 0) {
    throw new Error(
      `No save files with extension ${fromExt} found. Aborting to prevent data loss.`
    );
  }

  // Verify save files exist in backup before deleting anything
  for (const file of saveFiles) {
    try {
      await fs.access(path.join(backupDir, file));
    } catch {
      throw new Error(
        `Backup file ${file} not found. Aborting to prevent data loss.`
      );
    }
  }

  // Clear the directory (preserve protected files)
  for (const file of files) {
    if (!PROTECTED_FILES.includes(file)) {
      const filePath = path.join(targetDir, file);
      try {
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
          await fs.unlink(filePath);
        }
      } catch (err) {
        const e = err as NodeJS.ErrnoException;
        if (e.code === "EACCES" || e.code === "EPERM") {
          throw new Error(
            `Cannot delete ${file}: file is locked. Please close the game before converting.`
          );
        }
        throw err;
      }
    }
  }

  // Copy all save files with new extension
  const convertedFiles: ConvertedFile[] = [];

  for (const saveFile of saveFiles) {
    const baseName = saveFile.slice(0, -fromExt.length);

    let mainConverted = false;
    try {
      await fs.copyFile(
        path.join(backupDir, saveFile),
        path.join(targetDir, `${baseName}${toExt}`)
      );
      mainConverted = true;
    } catch {
      // Failed to copy this save file
    }

    let bakConverted = false;
    try {
      await fs.copyFile(
        path.join(backupDir, `${saveFile}.bak`),
        path.join(targetDir, `${baseName}${toExt}.bak`)
      );
      bakConverted = true;
    } catch {
      // .bak file may not exist — not critical
    }

    convertedFiles.push({ baseName, mainConverted, bakConverted });
  }

  return { files: convertedFiles, fromExt, toExt };
}
