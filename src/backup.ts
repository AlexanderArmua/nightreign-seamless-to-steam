import fs from "fs/promises";
import path from "path";

export async function createBackup(
  targetDir: string,
  files: string[]
): Promise<string> {
  const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(path.dirname(targetDir), `backup_${dateStr}`);
  await fs.mkdir(backupDir, { recursive: true });

  for (const file of files) {
    const srcPath = path.join(targetDir, file);
    const destPath = path.join(backupDir, file);
    const srcStat = await fs.stat(srcPath);
    if (srcStat.isFile()) {
      await fs.copyFile(srcPath, destPath);
      // Verify copy integrity by comparing file sizes
      const destStat = await fs.stat(destPath);
      if (destStat.size !== srcStat.size) {
        throw new Error(
          `Backup integrity check failed for ${file}: ` +
          `expected ${srcStat.size} bytes, got ${destStat.size} bytes`
        );
      }
    }
  }

  return backupDir;
}
