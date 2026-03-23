import { spawn, execFileSync } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  COMMON_STEAM_PATHS,
  GAME_RELATIVE_PATH,
  SEAMLESS_COOP_LAUNCHER_NAME,
} from "./config.js";
import type {
  ZipCandidate,
  ModInstallResult,
} from "./types.js";

/** Escape a string for use inside PowerShell single-quoted strings ('…'). */
function escapePowerShellString(value: string): string {
  return value.replace(/'/g, "''");
}

export function openUrl(url: string): boolean {
  try {
    const platform = process.platform;
    let child;

    if (platform === "win32") {
      child = spawn("cmd", ["/c", "start", "", url], {
        detached: true,
        stdio: "ignore",
      });
    } else if (platform === "darwin") {
      child = spawn("open", [url], {
        detached: true,
        stdio: "ignore",
      });
    } else {
      child = spawn("xdg-open", [url], {
        detached: true,
        stdio: "ignore",
      });
    }

    child.on("error", () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}

export function getDownloadsFolder(): string | null {
  const home = process.env.USERPROFILE || process.env.HOME;
  if (!home) return null;
  return path.join(home, "Downloads");
}

export async function scanForZipFiles(directory: string): Promise<ZipCandidate[]> {
  try {
    const entries = await fs.readdir(directory);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const candidates: ZipCandidate[] = [];

    for (const entry of entries) {
      if (!entry.toLowerCase().endsWith(".zip")) continue;

      const fullPath = path.join(directory, entry);
      try {
        const stat = await fs.stat(fullPath);
        if (!stat.isFile()) continue;
        if (now - stat.mtimeMs > oneDayMs) continue;

        candidates.push({
          fileName: entry,
          fullPath,
          modifiedTime: stat.mtime,
          sizeBytes: stat.size,
        });
      } catch {
        // Skip files we can't stat
      }
    }

    // Sort by newest first
    candidates.sort((a, b) => b.modifiedTime.getTime() - a.modifiedTime.getTime());
    return candidates;
  } catch {
    return [];
  }
}

/**
 * Scans common Steam installation paths and libraryfolders.vdf files
 * across multiple drives to find all Nightreign game installations.
 * Returns an array of unique game directory paths.
 */
export async function detectGameDirectories(): Promise<string[]> {
  const found = new Set<string>();

  // Collect all potential Steam library folders
  const libraryFolders = new Set<string>();

  for (const steamPath of COMMON_STEAM_PATHS) {
    // Check if this path is a Steam installation (has config/libraryfolders.vdf)
    const vdfPath = path.join(steamPath, "config", "libraryfolders.vdf");
    try {
      const vdfContent = await fs.readFile(vdfPath, "utf-8");
      const pathRegex = /"path"\s+"([^"]+)"/g;
      let match: RegExpExecArray | null;
      while ((match = pathRegex.exec(vdfContent)) !== null) {
        libraryFolders.add(match[1].replace(/\\\\/g, "\\"));
      }
    } catch {
      // Not a Steam installation or can't read VDF
    }

    // Also check if this path is itself a Steam library folder
    libraryFolders.add(steamPath);
  }

  // Check each library folder for the game
  for (const libPath of libraryFolders) {
    const gameDir = path.join(libPath, GAME_RELATIVE_PATH);
    try {
      const stat = await fs.stat(gameDir);
      if (stat.isDirectory()) {
        found.add(gameDir);
      }
    } catch {
      // Game not in this library folder
    }
  }

  return [...found];
}

export async function extractZip(
  zipPath: string,
  targetDir: string
): Promise<{ success: boolean; error?: string }> {
  const tempDir = path.join(os.tmpdir(), `nrsc-extract-${Date.now()}`);

  try {
    // Extract to temp dir using PowerShell Expand-Archive
    await fs.mkdir(tempDir, { recursive: true });

    execFileSync("powershell", [
      "-NoProfile",
      "-Command",
      `Expand-Archive -Path '${escapePowerShellString(zipPath)}' -DestinationPath '${escapePowerShellString(tempDir)}' -Force`,
    ], {
      stdio: "pipe",
      timeout: 120000,
    });

    // Check if extracted content is wrapped in a single subfolder
    const entries = await fs.readdir(tempDir);
    let sourceDir = tempDir;

    if (entries.length === 1) {
      const singleEntry = path.join(tempDir, entries[0]);
      const stat = await fs.stat(singleEntry);
      if (stat.isDirectory()) {
        sourceDir = singleEntry;
      }
    }

    // Copy contents to game directory (with path traversal protection)
    const resolvedTarget = path.resolve(targetDir);
    const sourceEntries = await fs.readdir(sourceDir);
    for (const entry of sourceEntries) {
      const src = path.join(sourceDir, entry);
      const dest = path.join(targetDir, entry);
      const resolvedDest = path.resolve(dest);
      if (!resolvedDest.startsWith(resolvedTarget + path.sep) && resolvedDest !== resolvedTarget) {
        throw new Error(`Unsafe path detected in zip: ${entry}`);
      }
      await fs.cp(src, dest, { recursive: true });
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  } finally {
    // Clean up temp dir
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Best effort cleanup
    }
  }
}

export function openFilePicker(filter?: string): string | null {
  try {
    const platform = process.platform;

    if (platform === "win32") {
      const psFilter = escapePowerShellString(filter || "All files (*.*)|*.*");
      const script = `
Add-Type -AssemblyName System.Windows.Forms
$d = New-Object System.Windows.Forms.OpenFileDialog
$d.Filter = '${psFilter}'
if ($d.ShowDialog() -eq 'OK') { $d.FileName } else { '' }
`.trim();
      const result = execFileSync("powershell", ["-NoProfile", "-Command", script], {
        stdio: "pipe",
        timeout: 120000,
      }).toString().trim();
      return result || null;
    } else if (platform === "darwin") {
      const typeClause = filter?.includes("*.zip") ? ' of type {"zip"}' : "";
      const script = `POSIX path of (choose file${typeClause} with prompt "Select a file")`;
      const result = execFileSync("osascript", ["-e", script], {
        stdio: "pipe",
        timeout: 120000,
      }).toString().trim();
      return result || null;
    }

    return null;
  } catch {
    return null;
  }
}

export function openFolderPicker(): string | null {
  try {
    const platform = process.platform;

    if (platform === "win32") {
      const script = `
Add-Type -AssemblyName System.Windows.Forms
$d = New-Object System.Windows.Forms.FolderBrowserDialog
$d.Description = 'Select the game directory'
if ($d.ShowDialog() -eq 'OK') { $d.SelectedPath } else { '' }
`.trim();
      const result = execFileSync("powershell", ["-NoProfile", "-Command", script], {
        stdio: "pipe",
        timeout: 120000,
      }).toString().trim();
      return result || null;
    } else if (platform === "darwin") {
      const script = 'POSIX path of (choose folder with prompt "Select a folder")';
      const result = execFileSync("osascript", ["-e", script], {
        stdio: "pipe",
        timeout: 120000,
      }).toString().trim();
      return result || null;
    }

    return null;
  } catch {
    return null;
  }
}

export async function installMod(
  zipPath: string,
  gameDir: string
): Promise<ModInstallResult> {
  const result: ModInstallResult = {
    success: false,
    zipPath,
    gameDir,
    launcherFound: false,
  };

  const extractResult = await extractZip(zipPath, gameDir);
  if (!extractResult.success) {
    result.error = extractResult.error;
    return result;
  }

  // Verify nrsc_launcher.exe exists after extraction
  try {
    await fs.access(path.join(gameDir, SEAMLESS_COOP_LAUNCHER_NAME));
    result.launcherFound = true;
  } catch {
    result.launcherFound = false;
  }

  result.success = true;
  return result;
}
