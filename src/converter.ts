import fs from "fs/promises";
import path from "path";
import { SAVE_FORMATS, PROTECTED_FILES, BASE_SAVE_NAME } from "./config.js";
import type { ConversionChoice, ConversionResult } from "./types.js";

export async function convert(
  targetDir: string,
  backupDir: string,
  files: string[],
  choice: ConversionChoice
): Promise<ConversionResult> {
  const fromExt = SAVE_FORMATS[choice.from].extension;
  const toExt = SAVE_FORMATS[choice.to].extension;

  // Clear the directory (preserve protected files)
  for (const file of files) {
    if (!PROTECTED_FILES.includes(file)) {
      const filePath = path.join(targetDir, file);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        await fs.unlink(filePath);
      }
    }
  }

  // Copy save file with new extension
  const mainFileSrc = path.join(backupDir, `${BASE_SAVE_NAME}${fromExt}`);
  const mainFileDest = path.join(targetDir, `${BASE_SAVE_NAME}${toExt}`);

  let mainConverted = false;
  try {
    await fs.copyFile(mainFileSrc, mainFileDest);
    mainConverted = true;
  } catch {
    // Main file not found in backup
  }

  // Copy .bak variant if it exists
  const bakFileSrc = path.join(backupDir, `${BASE_SAVE_NAME}${fromExt}.bak`);
  const bakFileDest = path.join(targetDir, `${BASE_SAVE_NAME}${toExt}.bak`);

  let bakConverted = false;
  try {
    await fs.copyFile(bakFileSrc, bakFileDest);
    bakConverted = true;
  } catch {
    // .bak file often doesn't exist — not critical
  }

  return { mainConverted, bakConverted, fromExt, toExt };
}
