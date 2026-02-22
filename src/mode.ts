import fsSync from "fs";
import fs from "fs/promises";
import path from "path";
import { BACKUP_LAUNCHER_NAME, SEAMLESS_COOP_LAUNCHER_NAME } from "./config.js";
import type { AppMode, LauncherContext } from "./types.js";

export function detectMode(): AppMode {
  const exeDir = path.dirname(process.execPath);
  const backupPath = path.join(exeDir, BACKUP_LAUNCHER_NAME);

  try {
    // Synchronous check — runs once at startup, keeps it simple
    const stat = fsSync.statSync(backupPath);
    return stat.isFile() ? "launcher" : "standalone";
  } catch {
    return "standalone";
  }
}

export async function getLauncherContext(): Promise<LauncherContext> {
  const gameDir = path.dirname(process.execPath);
  const originalLauncherPath = path.join(gameDir, BACKUP_LAUNCHER_NAME);
  const seamlessCoopLauncherPath = path.join(gameDir, SEAMLESS_COOP_LAUNCHER_NAME);

  let hasSeamlessCoop = false;
  try {
    await fs.access(seamlessCoopLauncherPath);
    hasSeamlessCoop = true;
  } catch {
    // Seamless Coop launcher not found
  }

  return {
    gameDir,
    originalLauncherPath,
    seamlessCoopLauncherPath,
    hasSeamlessCoop,
  };
}
