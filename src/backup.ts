import fs from "fs/promises";
import path from "path";
import { getNightreignDir } from "./config.js";

export async function createBackup(
  targetDir: string,
  files: string[]
): Promise<string> {
  const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(getNightreignDir(), `backup_${dateStr}`);
  await fs.mkdir(backupDir, { recursive: true });

  for (const file of files) {
    const srcPath = path.join(targetDir, file);
    const destPath = path.join(backupDir, file);
    const stat = await fs.stat(srcPath);
    if (stat.isFile()) {
      await fs.copyFile(srcPath, destPath);
    }
  }

  return backupDir;
}
