import fs from "fs/promises";
import { detectSaveDirectory } from "./saves.js";
import { createTestEnvironment, createTestGameDirectory } from "./test-setup.js";
import { createBackup } from "./backup.js";
import { convert } from "./converter.js";
import { install, uninstall } from "./installer.js";
import { detectMode, getLauncherContext } from "./mode.js";
import { launchGame } from "./launcher.js";
import {
  info,
  success,
  error,
  warning,
  promptConversionChoice,
  promptStandaloneMenu,
  promptLauncherMenu,
  promptDirectoryInput,
  promptZipSelection,
  promptPressAnyKey,
  printConversionResult,
  printInstallResult,
  printUninstallResult,
  printModInstallResult,
  waitForExit,
  parseArgs,
} from "./cli.js";
import {
  openUrl,
  getDownloadsFolder,
  scanForZipFiles,
  detectGameDirectory,
  installMod,
  openFilePicker,
  openFolderPicker,
} from "./downloader.js";
import { NEXUS_MODS_URL } from "./config.js";
import { playBonfireIntro, cleanupBonfire } from "./bonfire.js";
import type { ConversionChoice } from "./types.js";

async function runCopySaves(testMode: boolean, preselectedChoice: ConversionChoice | null): Promise<void> {
  const state = testMode
    ? await createTestEnvironment()
    : await detectSaveDirectory();

  info(`[+] Save directory detected: ${state.steamIdFolder}\n`);

  const backupDir = await createBackup(state.targetDir, state.files);
  const backupName = backupDir.split(/[/\\]/).pop()!;
  info(`[+] Backup of current state saved in: ${backupName}\n`);

  let choice: ConversionChoice | null = preselectedChoice;

  if (choice) {
    if (choice.from === "steam" && !state.hasSteamSave) {
      error("[!] Cannot convert to coop: No Steam save (.sl2) found.");
      return;
    }
    if (choice.from === "coop" && !state.hasCoopSave) {
      error("[!] Cannot convert to steam: No Coop save (.co2) found.");
      return;
    }
  } else {
    choice = await promptConversionChoice(state);
  }

  if (!choice) return;

  const result = await convert(state.targetDir, backupDir, state.files, choice);

  info("\n[+] Previous files cleared (kept steam_autocloud.vdf).");
  printConversionResult(result);
  success("\nProcess completed successfully!");
}

async function runInstall(testMode: boolean): Promise<void> {
  let gameDir: string;

  if (testMode) {
    gameDir = await createTestGameDirectory();
  } else {
    info("[+] Select the Nightreign game directory...\n");
    let input = openFolderPicker();

    if (!input) {
      input = await promptDirectoryInput(
        "Enter the Nightreign game directory path\n(e.g. C:\\Program Files (x86)\\Steam\\steamapps\\common\\ELDEN RING NIGHTREIGN):"
      );
    }

    if (!input) {
      error("[!] No directory provided.");
      return;
    }

    // Validate the directory exists
    try {
      const stat = await fs.stat(input);
      if (!stat.isDirectory()) {
        error("[!] The provided path is not a directory.");
        return;
      }
    } catch {
      error("[!] Directory not found. Please check the path and try again.");
      return;
    }

    gameDir = input;
  }

  const result = await install(gameDir);
  printInstallResult(result);
}

async function runUninstall(testMode: boolean): Promise<void> {
  let gameDir: string;

  if (testMode) {
    gameDir = await createTestGameDirectory();
  } else {
    info("[+] Select the Nightreign game directory...\n");
    let input = openFolderPicker();

    if (!input) {
      input = await promptDirectoryInput(
        "Enter the Nightreign game directory path\n(e.g. C:\\Program Files (x86)\\Steam\\steamapps\\common\\ELDEN RING NIGHTREIGN):"
      );
    }

    if (!input) {
      error("[!] No directory provided.");
      return;
    }

    try {
      const stat = await fs.stat(input);
      if (!stat.isDirectory()) {
        error("[!] The provided path is not a directory.");
        return;
      }
    } catch {
      error("[!] Directory not found. Please check the path and try again.");
      return;
    }

    gameDir = input;
  }

  const result = await uninstall(gameDir);
  printUninstallResult(result);
}

async function runDownloadCoop(testMode: boolean): Promise<void> {
  // 1. Open NexusMods page
  info("[+] Opening NexusMods page for Seamless Co-op...\n");
  const opened = openUrl(NEXUS_MODS_URL);
  if (opened) {
    info(`    URL: ${NEXUS_MODS_URL}`);
  } else {
    warning("[!] Could not open browser. Please visit this URL manually:");
    info(`    ${NEXUS_MODS_URL}`);
  }

  // 2. Wait for user to download
  await promptPressAnyKey("\nPress any key after downloading the mod zip file...");

  // 3. Auto-find zip in Downloads folder
  let zipPath: string | null = null;
  const downloadsFolder = getDownloadsFolder();

  let hasDownloadCandidates = false;

  if (downloadsFolder) {
    const candidates = await scanForZipFiles(downloadsFolder);

    if (candidates.length > 0) {
      hasDownloadCandidates = true;
      info(`\n[+] Found ${candidates.length} recent zip file(s) in Downloads:\n`);
      const selected = await promptZipSelection(candidates);
      if (selected) {
        zipPath = selected.fullPath;
      }
    }
  }

  if (!zipPath) {
    if (!hasDownloadCandidates) {
      info("\n[!] No zip files found in Downloads folder.");
    }
    info("[+] Select the downloaded Seamless-Coop .zip file to install\n");
    let input = openFilePicker("Zip files (*.zip)|*.zip");

    if (!input) {
      input = await promptDirectoryInput(
        "Enter the full path to the downloaded zip file:"
      );
    }

    if (!input) {
      error("[!] No path provided.");
      return;
    }

    try {
      const stat = await fs.stat(input);
      if (!stat.isFile()) {
        error("[!] The provided path is not a file.");
        return;
      }
    } catch {
      error("[!] File not found. Please check the path and try again.");
      return;
    }

    zipPath = input;
  }

  // 4. Auto-find game directory
  let gameDir: string;

  if (testMode) {
    gameDir = await createTestGameDirectory();
  } else {
    info("\n[+] Detecting game directory...");
    const detection = await detectGameDirectory();

    if (detection.found && detection.path) {
      gameDir = detection.path;
      info(`[+] Found game directory: ${gameDir}\n`);
    } else {
      warning("[!] Could not auto-detect game directory.");
      info("[+] Opening folder picker...\n");
      let input = openFolderPicker();

      if (!input) {
        input = await promptDirectoryInput(
          "Enter the Nightreign game directory path\n(e.g. C:\\Program Files (x86)\\Steam\\steamapps\\common\\ELDEN RING NIGHTREIGN\\Game):"
        );
      }

      if (!input) {
        error("[!] No directory provided.");
        return;
      }

      try {
        const stat = await fs.stat(input);
        if (!stat.isDirectory()) {
          error("[!] The provided path is not a directory.");
          return;
        }
      } catch {
        error("[!] Directory not found. Please check the path and try again.");
        return;
      }

      gameDir = input;
    }
  }

  // 5. Install the mod
  info("[+] Installing Seamless Co-op...\n");
  const result = await installMod(zipPath, gameDir);
  printModInstallResult(result);
}

async function runStandaloneMode(testMode: boolean, cliChoice: ConversionChoice | null): Promise<void> {
  // If CLI args provided, go directly to copy saves (backward compat)
  if (cliChoice) {
    await runCopySaves(testMode, cliChoice);
    return;
  }

  const menuChoice = await promptStandaloneMenu();
  if (!menuChoice) return;

  switch (menuChoice) {
    case "copy_saves":
      await runCopySaves(testMode, null);
      break;
    case "install":
      await runInstall(testMode);
      break;
    case "uninstall":
      await runUninstall(testMode);
      break;
    case "download_coop":
      await runDownloadCoop(testMode);
      break;
  }
}

/** Returns true if the game was launched successfully (caller should exit without waiting). */
async function runLauncherMode(): Promise<boolean> {
  const context = await getLauncherContext();
  const state = await detectSaveDirectory();

  info(`[+] Save directory detected: ${state.steamIdFolder}\n`);

  const choice = await promptLauncherMenu(context.hasSeamlessCoop);
  if (!choice) return false;

  if (choice === "seamless_coop" && !context.hasSeamlessCoop) {
    error("[!] Seamless Coop launcher (NRSC_launcher.exe) not found in the game directory.");
    error("    Please install the Seamless Coop mod first.");
    return false;
  }

  // Determine which executable to launch
  const targetExe = choice === "classic"
    ? context.originalLauncherPath
    : context.seamlessCoopLauncherPath;

  // Smart conversion: only convert if needed
  if (choice === "classic" && !state.hasSteamSave && state.hasCoopSave) {
    info("[+] Converting saves from Coop to Steam...\n");
    const backupDir = await createBackup(state.targetDir, state.files);
    const backupName = backupDir.split(/[/\\]/).pop()!;
    info(`[+] Backup saved in: ${backupName}`);
    const result = await convert(state.targetDir, backupDir, state.files, { from: "coop", to: "steam" });
    printConversionResult(result);
  } else if (choice === "seamless_coop" && !state.hasCoopSave && state.hasSteamSave) {
    info("[+] Converting saves from Steam to Coop...\n");
    const backupDir = await createBackup(state.targetDir, state.files);
    const backupName = backupDir.split(/[/\\]/).pop()!;
    info(`[+] Backup saved in: ${backupName}`);
    const result = await convert(state.targetDir, backupDir, state.files, { from: "steam", to: "coop" });
    printConversionResult(result);
  } else {
    info("[+] Save files already in the correct format. No conversion needed.");
  }

  info(`\n[+] Launching ${choice === "classic" ? "Classic Nightreign" : "Seamless Coop"}...`);
  launchGame(targetExe);
  return true;
}

async function main(): Promise<void> {
  playBonfireIntro();

  let launchedGame = false;

  try {
    const args = parseArgs(process.argv);
    const mode = detectMode();

    if (mode === "launcher") {
      launchedGame = await runLauncherMode();
    } else {
      await runStandaloneMode(args.testMode, args.choice);
    }
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") {
      error("\n[X] Error: Directory not found. Is the game installed?");
    } else {
      error("\n[X] An unexpected error occurred: " + (e.message ?? String(e)));
    }
  } finally {
    cleanupBonfire();
    if (launchedGame) {
      // Game was launched — exit immediately so the window closes
      process.exit(0);
    } else {
      waitForExit();
    }
  }
}

main();
