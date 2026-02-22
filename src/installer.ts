import fs from "fs/promises";
import path from "path";
import {
  ORIGINAL_LAUNCHER_NAME,
  BACKUP_LAUNCHER_NAME,
  SEAMLESS_COOP_LAUNCHER_NAME,
} from "./config.js";
import type { InstallResult, UninstallResult } from "./types.js";

export async function install(gameDir: string): Promise<InstallResult> {
  const originalPath = path.join(gameDir, ORIGINAL_LAUNCHER_NAME);
  const backupPath = path.join(gameDir, BACKUP_LAUNCHER_NAME);
  const seamlessCoopPath = path.join(gameDir, SEAMLESS_COOP_LAUNCHER_NAME);
  const replacementPath = path.join(gameDir, ORIGINAL_LAUNCHER_NAME);

  const result: InstallResult = {
    success: false,
    gameDirPath: gameDir,
    originalRenamed: false,
    exeCopied: false,
    seamlessCoopDetected: false,
  };

  // Check if Seamless Coop launcher exists
  try {
    await fs.access(seamlessCoopPath);
    result.seamlessCoopDetected = true;
  } catch {
    // Not found — not required for install, but we note it
  }

  // Rename the original launcher to the backup name
  try {
    await fs.access(originalPath);
    await fs.rename(originalPath, backupPath);
    result.originalRenamed = true;
  } catch {
    // Original launcher not found — can't proceed
    return result;
  }

  // Copy SaveManager.exe as the replacement launcher
  try {
    await fs.copyFile(process.execPath, replacementPath);
    result.exeCopied = true;
  } catch {
    // Failed to copy — try to restore original
    try {
      await fs.rename(backupPath, originalPath);
      result.originalRenamed = false;
    } catch {
      // Critical: couldn't restore either
    }
    return result;
  }

  result.success = true;
  return result;
}

export async function uninstall(gameDir: string): Promise<UninstallResult> {
  const originalPath = path.join(gameDir, ORIGINAL_LAUNCHER_NAME);
  const backupPath = path.join(gameDir, BACKUP_LAUNCHER_NAME);

  const result: UninstallResult = {
    success: false,
    gameDirPath: gameDir,
    replacementDeleted: false,
    originalRestored: false,
  };

  // Delete the replacement (our exe sitting as start_protected_game.exe)
  try {
    await fs.unlink(originalPath);
    result.replacementDeleted = true;
  } catch {
    // Replacement not found or can't delete
    return result;
  }

  // Restore the original launcher from backup
  try {
    await fs.access(backupPath);
    await fs.rename(backupPath, originalPath);
    result.originalRestored = true;
  } catch {
    // Backup not found — can't restore
    return result;
  }

  result.success = true;
  return result;
}
