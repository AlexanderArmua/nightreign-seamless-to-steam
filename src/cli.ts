import type {
  ConversionChoice,
  ConversionResult,
  InstallResult,
  LauncherMenuChoice,
  MenuItem,
  ModInstallResult,
  ParsedArgs,
  SaveDirectoryState,
  StandaloneMenuChoice,
  UninstallResult,
  ZipCandidate,
} from "./types.js";

export const COLORS = {
  reset: "\x1b[0m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  white: "\x1b[37m",
  brightYellow: "\x1b[93m",
  brightRed: "\x1b[91m",
  gray: "\x1b[90m",
} as const;

export function success(msg: string): void {
  console.log(`${COLORS.green}${msg}${COLORS.reset}`);
}

export function warning(msg: string): void {
  console.log(`${COLORS.yellow}${msg}${COLORS.reset}`);
}

export function error(msg: string): void {
  console.error(`${COLORS.red}${msg}${COLORS.reset}`);
}

export function info(msg: string): void {
  console.log(`${COLORS.white}${msg}${COLORS.reset}`);
}

export function printBanner(): void {
  console.log(
    `${COLORS.yellow}==========================================\n` +
    `       Welcome to Save Manager\n` +
    `==========================================${COLORS.reset}`
  );
}

export function printConversionResult(result: ConversionResult): void {
  for (const file of result.files) {
    if (file.mainConverted) {
      success(`[+] Converted: ${file.baseName}${result.fromExt} -> ${file.baseName}${result.toExt}`);
    } else {
      error(`[!] Error: File ${file.baseName}${result.fromExt} not found.`);
    }

    if (file.bakConverted) {
      success(`[+] Converted: ${file.baseName}${result.fromExt}.bak -> ${file.baseName}${result.toExt}.bak`);
    } else {
      warning(`[!] Warning: File ${file.baseName}${result.fromExt}.bak not found.`);
    }
  }
}

// Generic arrow-key menu prompt
export async function promptMenu<T>(
  title: string,
  options: MenuItem<T>[]
): Promise<T | null> {
  if (options.length === 0) return null;

  info(`${title}\n`);

  let selected = 0;

  const render = () => {
    if (rendered) {
      process.stdout.write(`\x1b[${options.length}A`);
    }
    for (let i = 0; i < options.length; i++) {
      process.stdout.write("\x1b[2K"); // clear line
      const num = `${i + 1}.`;
      if (i === selected) {
        process.stdout.write(`${COLORS.green}  > ${num} ${options[i].label}${COLORS.reset}\n`);
      } else {
        process.stdout.write(`${COLORS.white}    ${num} ${options[i].label}${COLORS.reset}\n`);
      }
    }
  };

  let rendered = false;
  process.stdout.write("\x1b[?25l"); // hide cursor
  render();
  rendered = true;

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();

  return new Promise<T | null>((resolve) => {
    const cleanup = () => {
      process.stdout.write("\x1b[?25h"); // show cursor
      process.stdin.removeListener("data", onData);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
    };

    const onData = (data: Buffer) => {
      const key = data.toString();

      if (key === "\x03") {
        // Ctrl+C
        cleanup();
        process.exit(0);
      }

      if (key === "\x1b[A") {
        // Up arrow
        selected = (selected - 1 + options.length) % options.length;
        render();
      } else if (key === "\x1b[B") {
        // Down arrow
        selected = (selected + 1) % options.length;
        render();
      } else if (key === "\r") {
        // Enter
        cleanup();
        console.log(); // blank line after menu
        resolve(options[selected].value);
      } else {
        // Number keys 1-9
        const num = parseInt(key, 10);
        if (num >= 1 && num <= options.length) {
          selected = num - 1;
          render();
          cleanup();
          console.log(); // blank line after menu
          resolve(options[selected].value);
        }
      }
    };

    process.stdin.on("data", onData);
  });
}

export async function promptConversionChoice(
  state: SaveDirectoryState
): Promise<ConversionChoice | null> {
  const options: MenuItem<ConversionChoice>[] = [];

  if (state.hasSteamSave) {
    options.push({
      label: "Steam → Coop (You played Steam, want to play Coop)",
      value: { from: "steam", to: "coop" },
    });
  }
  if (state.hasCoopSave) {
    options.push({
      label: "Coop → Steam (You played Coop, want to play Steam)",
      value: { from: "coop", to: "steam" },
    });
  }

  if (options.length === 0) {
    error("[!] No save files available to convert.");
    return null;
  }

  return promptMenu("Select a conversion (↑/↓ or 1-2, Enter to confirm):", options);
}

export async function promptStandaloneMenu(): Promise<StandaloneMenuChoice | null> {
  const options: MenuItem<StandaloneMenuChoice>[] = [
    { label: "Copy savegames (convert between Steam/Coop)", value: "copy_saves" },
    { label: "Download & Install Seamless Co-op", value: "download_coop" },
    { label: "Install Save Manager as game launcher", value: "install" },
    { label: "Uninstall Save Manager from game launcher", value: "uninstall" },
    { label: "Exit", value: "exit" },
  ];

  return promptMenu("What would you like to do? (↑/↓ or 1-5, Enter to confirm):", options);
}

export async function promptLauncherMenu(hasSeamlessCoop: boolean): Promise<LauncherMenuChoice | null> {
  const options: MenuItem<LauncherMenuChoice>[] = [
    { label: "Classic Nightreign (Steam)", value: "classic" },
  ];

  if (hasSeamlessCoop) {
    options.push({ label: "Seamless Coop", value: "seamless_coop" });
  } else {
    options.push({ label: "Seamless Coop (not installed)", value: "seamless_coop" });
  }

  options.push({ label: "Uninstall Save Manager", value: "uninstall" });

  return promptMenu("Choose how to launch Nightreign (↑/↓ or 1-3, Enter to confirm):", options);
}

export async function promptGameDirSelection(paths: string[]): Promise<string | null> {
  const options: MenuItem<string | null>[] = paths.map((p) => ({
    label: p,
    value: p,
  }));

  options.push({
    label: "Browse manually...",
    value: null,
  });

  return promptMenu(
    "Game installation(s) found. Select one (↑/↓, Enter to confirm):",
    options
  );
}

export async function promptSteamIdSelection(folderNames: string[]): Promise<string | null> {
  const options: MenuItem<string>[] = folderNames.map((name) => ({
    label: `Steam ID: ${name}`,
    value: name,
  }));

  return promptMenu(
    "Multiple Steam accounts found. Which one would you like to use? (↑/↓, Enter to confirm):",
    options
  );
}

export async function promptDirectoryInput(prompt: string): Promise<string> {
  info(prompt);
  process.stdout.write(`${COLORS.green}> ${COLORS.reset}`);

  process.stdin.resume();
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }

  return new Promise<string>((resolve) => {
    process.stdin.once("data", (data: Buffer) => {
      process.stdin.pause();
      resolve(data.toString().trim());
    });
  });
}

export function printInstallResult(result: InstallResult): void {
  if (result.success) {
    if (result.alreadyInstalled) {
      success("\n[+] Save Manager updated successfully!");
    } else {
      success("\n[+] Save Manager installed successfully!");
    }
    info(`    Game directory: ${result.gameDirPath}`);
    if (result.alreadyInstalled) {
      success("    [+] Previous installation detected — launcher updated");
    } else if (result.originalRenamed) {
      success("    [+] Original launcher backed up");
    }
    if (result.exeCopied) {
      success("    [+] Save Manager installed as launcher");
    }
    if (result.seamlessCoopDetected) {
      success("    [+] Seamless Coop launcher detected");
    } else {
      warning("    [!] Seamless Coop launcher not found — install it to use Coop mode");
    }
    info('\nNext time you click "Play" in Steam, Save Manager will appear.');
  } else {
    error("\n[!] Installation failed.");
    if (result.rollbackFailed) {
      error("    CRITICAL: Could not restore the original launcher after failed install.");
      warning("    Please verify game files through Steam:");
      warning("    Right-click game → Properties → Installed Files → Verify integrity of game files");
    } else if (!result.originalRenamed) {
      error("    Could not find or rename the original game launcher.");
      info("    Make sure the game directory contains start_protected_game.exe");
    } else if (!result.exeCopied) {
      error("    Could not copy Save Manager to the game directory.");
    }
  }
}

export function printUninstallResult(result: UninstallResult): void {
  if (result.success) {
    success("\n[+] Save Manager uninstalled successfully!");
    info(`    Game directory: ${result.gameDirPath}`);
    if (result.replacementDeleted) {
      success("    [+] Save Manager launcher removed");
    }
    if (result.originalRestored) {
      success("    [+] Original launcher restored");
    }
    info("\nThe game will now launch normally through Steam.");
  } else {
    error("\n[!] Uninstallation failed.");
    if (!result.replacementDeleted) {
      error("    Could not remove the Save Manager launcher.");
    } else if (!result.originalRestored) {
      error("    Could not restore the original launcher from backup.");
      warning("    You may need to verify game files through Steam.");
    }
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

export async function promptZipSelection(candidates: ZipCandidate[]): Promise<ZipCandidate | null> {
  const options: MenuItem<ZipCandidate | null>[] = candidates.map((c) => ({
    label: `${c.fileName} (${formatFileSize(c.sizeBytes)}, ${formatRelativeTime(c.modifiedTime)})`,
    value: c,
  }));

  options.push({
    label: "Browse manually...",
    value: null,
  });

  return promptMenu("Select the downloaded zip file (↑/↓ or 1-N, Enter to confirm):", options);
}

export async function promptPressAnyKey(message: string): Promise<void> {
  info(message);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();

  return new Promise<void>((resolve) => {
    process.stdin.once("data", (data: Buffer) => {
      const key = data.toString();
      if (key === "\x03") {
        // Ctrl+C
        process.exit(0);
      }
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
      resolve();
    });
  });
}

export function printModInstallResult(result: ModInstallResult): void {
  if (result.success) {
    success("\n[+] Seamless Co-op installed successfully!");
    info(`    Game directory: ${result.gameDir}`);
    info(`    Zip file: ${result.zipPath}`);
    if (result.launcherFound) {
      success("    [+] nrsc_launcher.exe found — mod is ready to use");
    } else {
      warning("    [!] nrsc_launcher.exe not found — the zip may not contain the expected mod files");
    }
  } else {
    error("\n[!] Seamless Co-op installation failed.");
    if (result.error) {
      error(`    ${result.error}`);
    }
  }
}

export function waitForExit(): void {
  info("\nPress any key to exit...");
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.once("data", () => process.exit(0));
}

export function parseArgs(argv: string[]): ParsedArgs {
  const testMode = argv.includes("--test");
  const dryRun = argv.includes("--dry-run");

  if (argv.includes("--to-steam")) {
    return { choice: { from: "coop", to: "steam" }, testMode, dryRun };
  }
  if (argv.includes("--to-coop")) {
    return { choice: { from: "steam", to: "coop" }, testMode, dryRun };
  }
  return { choice: null, testMode, dryRun };
}

export async function promptConfirmation(message: string): Promise<boolean> {
  process.stdout.write(`${COLORS.white}${message} ${COLORS.green}(Y/n) ${COLORS.reset}`);

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();

  return new Promise<boolean>((resolve) => {
    process.stdin.once("data", (data: Buffer) => {
      const key = data.toString().toLowerCase();
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
      console.log();
      resolve(key !== "n");
    });
  });
}

export function printVersionInfo(version: string, sha256: string | null): void {
  const hash = sha256 ? `SHA256: ${sha256}` : "";
  info(`  Save Manager v${version}${hash ? `  |  ${hash}` : ""}\n`);
}

export function printDryRunSummary(
  state: import("./types.js").SaveDirectoryState,
  choice: import("./types.js").ConversionChoice,
  fromExt: string,
  toExt: string
): void {
  const saveFiles = state.files.filter(
    (f) => f.endsWith(fromExt) && !f.endsWith(`${fromExt}.bak`)
  );
  const bakFiles = state.files.filter((f) => f.endsWith(`${fromExt}.bak`));
  const protectedFiles = state.files.filter((f) =>
    ["steam_autocloud.vdf"].includes(f)
  );
  const otherFiles = state.files.filter(
    (f) =>
      !f.endsWith(fromExt) &&
      !f.endsWith(`${fromExt}.bak`) &&
      !protectedFiles.includes(f)
  );

  warning("=== DRY RUN — No changes will be made ===\n");
  info(`  Save directory: ${state.targetDir}`);
  info(`  Steam ID: ${state.steamIdFolder}`);
  info(`  Conversion: ${choice.from} (${fromExt}) -> ${choice.to} (${toExt})\n`);

  info("  Files found:");
  for (const f of saveFiles) {
    info(`    ${f} (will be converted)`);
  }
  for (const f of bakFiles) {
    info(`    ${f} (backup variant, will be converted if exists)`);
  }
  for (const f of protectedFiles) {
    success(`    ${f} (protected, will NOT be modified)`);
  }
  for (const f of otherFiles) {
    warning(`    ${f} (will be deleted)`);
  }

  info(`\n  Would create backup: backup_<timestamp>/`);
  info("  Would delete all non-protected files from save directory");
  info("  Would create:");
  for (const f of saveFiles) {
    const baseName = f.slice(0, -fromExt.length);
    success(`    ${baseName}${toExt} (from ${f})`);
  }
  for (const f of bakFiles) {
    const baseName = f.slice(0, -`${fromExt}.bak`.length);
    success(`    ${baseName}${toExt}.bak (from ${f})`);
  }

  warning("\n=== DRY RUN COMPLETE — No files were modified ===");
}
