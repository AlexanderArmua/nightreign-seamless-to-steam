import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
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
  promptSteamIdSelection,
  promptGameDirSelection,
  promptConfirmation,
  printConversionResult,
  printInstallResult,
  printUninstallResult,
  printModInstallResult,
  printVersionInfo,
  printDryRunSummary,
  waitForExit,
  parseArgs,
} from "./cli.js";
import {
  openUrl,
  getDownloadsFolder,
  scanForZipFiles,
  detectGameDirectories,
  installMod,
  openFilePicker,
  openFolderPicker,
} from "./downloader.js";
import { NEXUS_MODS_URL, SAVE_FORMATS, VERSION } from "./config.js";
import { playBonfireIntro, cleanupBonfire } from "./bonfire.js";
import type { ConversionChoice } from "./types.js";

async function getExeHash(): Promise<string | null> {
  try {
    const data = await fs.readFile(process.execPath);
    return crypto.createHash("sha256").update(data).digest("hex");
  } catch {
    return null;
  }
}

async function writeConversionLog(
  backupDir: string,
  state: { targetDir: string; steamIdFolder: string; files: string[] },
  choice: ConversionChoice,
  result: import("./types.js").ConversionResult
): Promise<void> {
  const lines: string[] = [
    `Save Manager v${VERSION} — Conversion Log`,
    `Date: ${new Date().toISOString()}`,
    ``,
    `Save directory: ${state.targetDir}`,
    `Steam ID: ${state.steamIdFolder}`,
    `Backup location: ${backupDir}`,
    `Conversion: ${choice.from} (${result.fromExt}) -> ${choice.to} (${result.toExt})`,
    ``,
    `Files in directory before conversion:`,
    ...state.files.map((f) => `  ${f}`),
    ``,
    `Conversion results:`,
  ];

  for (const f of result.files) {
    if (f.mainConverted) {
      lines.push(`  [OK] ${f.baseName}${result.fromExt} -> ${f.baseName}${result.toExt}`);
    } else {
      lines.push(`  [FAIL] ${f.baseName}${result.fromExt} -> ${f.baseName}${result.toExt}`);
    }
    if (f.bakConverted) {
      lines.push(`  [OK] ${f.baseName}${result.fromExt}.bak -> ${f.baseName}${result.toExt}.bak`);
    } else {
      lines.push(`  [SKIP] ${f.baseName}${result.fromExt}.bak not found`);
    }
  }

  try {
    await fs.writeFile(path.join(backupDir, "conversion.log"), lines.join("\n") + "\n");
  } catch {
    // Best effort — don't fail the conversion over a log file
  }
}

/**
 * Auto-detects game directories, lets the user pick one, or falls back to manual input.
 * Returns null if the user provides no input.
 */
async function selectGameDirectory(): Promise<string | null> {
  info("[+] Searching for Nightreign installations...\n");
  const detected = await detectGameDirectories();

  if (detected.length > 0) {
    info(`[+] Found ${detected.length} installation(s).\n`);

    // If exactly one found, confirm it directly
    if (detected.length === 1) {
      info(`    ${detected[0]}\n`);
      const confirmed = await promptConfirmation("Use this directory?");
      if (confirmed) return detected[0];
    } else {
      const selected = await promptGameDirSelection(detected);
      if (selected) return selected;
    }
    // User chose "Browse manually..." or declined — fall through
  } else {
    info("[!] No installations found automatically.\n");
  }

  // Manual fallback: folder picker then text input
  info("[+] Select the game directory manually...\n");
  let input = openFolderPicker();

  if (!input) {
    input = await promptDirectoryInput(
      "Enter the Nightreign game directory path\n(e.g. C:\\Program Files (x86)\\Steam\\steamapps\\common\\ELDEN RING NIGHTREIGN\\Game):"
    );
  }

  if (!input) return null;

  // Validate
  try {
    const stat = await fs.stat(input);
    if (!stat.isDirectory()) {
      error("[!] The provided path is not a directory.");
      return null;
    }
  } catch {
    error("[!] Directory not found. Please check the path and try again.");
    return null;
  }

  return input;
}

async function runCopySaves(
  testMode: boolean,
  preselectedChoice: ConversionChoice | null,
  dryRun: boolean,
  interactive: boolean
): Promise<void> {
  const state = testMode
    ? await createTestEnvironment()
    : await detectSaveDirectory(promptSteamIdSelection);

  info(`[+] Save directory detected: ${state.steamIdFolder}\n`);

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

  const fromExt = SAVE_FORMATS[choice.from].extension;
  const toExt = SAVE_FORMATS[choice.to].extension;

  // Dry run: show what would happen and exit
  if (dryRun) {
    printDryRunSummary(state, choice, fromExt, toExt);
    return;
  }

  // Confirmation prompt in interactive mode
  if (interactive) {
    const saveCount = state.files.filter(
      (f) => f.endsWith(fromExt) && !f.endsWith(`${fromExt}.bak`)
    ).length;

    const confirmed = await promptConfirmation(
      `Convert ${saveCount} save file(s) from ${fromExt} to ${toExt}? A backup will be created first.`
    );
    if (!confirmed) {
      warning("[!] Conversion cancelled.");
      return;
    }
  }

  const backupDir = await createBackup(state.targetDir, state.files);
  const backupName = backupDir.split(/[/\\]/).pop()!;
  info(`[+] Backup of current state saved in: ${backupName}\n`);

  const result = await convert(state.targetDir, backupDir, state.files, choice);

  info("\n[+] Previous files cleared (kept steam_autocloud.vdf).");
  printConversionResult(result);
  success("\nProcess completed successfully!");

  // Write operation log to backup directory
  await writeConversionLog(backupDir, state, choice, result);
}

async function runInstall(testMode: boolean): Promise<void> {
  const gameDir = testMode
    ? await createTestGameDirectory()
    : await selectGameDirectory();

  if (!gameDir) {
    error("[!] No directory provided.");
    return;
  }

  const result = await install(gameDir);
  printInstallResult(result);
}

async function runUninstall(testMode: boolean): Promise<void> {
  const gameDir = testMode
    ? await createTestGameDirectory()
    : await selectGameDirectory();

  if (!gameDir) {
    error("[!] No directory provided.");
    return;
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

  // 4. Find game directory
  const gameDir = testMode
    ? await createTestGameDirectory()
    : await selectGameDirectory();

  if (!gameDir) {
    error("[!] No directory provided.");
    return;
  }

  // 5. Install the mod
  info("[+] Installing Seamless Co-op...\n");
  const result = await installMod(zipPath, gameDir);
  printModInstallResult(result);
}

async function runStandaloneMode(
  testMode: boolean,
  cliChoice: ConversionChoice | null,
  dryRun: boolean
): Promise<void> {
  // If CLI args provided, go directly to copy saves (backward compat, non-interactive)
  if (cliChoice) {
    await runCopySaves(testMode, cliChoice, dryRun, false);
    return;
  }

  // Dry-run without a conversion choice: detect and show state
  if (dryRun) {
    await runCopySaves(testMode, null, dryRun, false);
    return;
  }

  const menuChoice = await promptStandaloneMenu();
  if (!menuChoice) return;

  switch (menuChoice) {
    case "copy_saves":
      await runCopySaves(testMode, null, false, true);
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
    case "exit":
      process.exit(0);
  }
}

/** Returns true if the game was launched successfully (caller should exit without waiting). */
async function runLauncherMode(): Promise<boolean> {
  const context = await getLauncherContext();
  const state = await detectSaveDirectory(promptSteamIdSelection);

  info(`[+] Save directory detected: ${state.steamIdFolder}\n`);

  const choice = await promptLauncherMenu(context.hasSeamlessCoop);
  if (!choice) return false;

  if (choice === "uninstall") {
    const result = await uninstall(context.gameDir);
    printUninstallResult(result);
    return false;
  }

  if (choice === "seamless_coop" && !context.hasSeamlessCoop) {
    error("[!] Seamless Coop launcher (nrsc_launcher.exe) not found in the game directory.");
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
    const convChoice: ConversionChoice = { from: "coop", to: "steam" };
    const result = await convert(state.targetDir, backupDir, state.files, convChoice);
    printConversionResult(result);
    await writeConversionLog(backupDir, state, convChoice, result);
  } else if (choice === "seamless_coop" && !state.hasCoopSave && state.hasSteamSave) {
    info("[+] Converting saves from Steam to Coop...\n");
    const backupDir = await createBackup(state.targetDir, state.files);
    const backupName = backupDir.split(/[/\\]/).pop()!;
    info(`[+] Backup saved in: ${backupName}`);
    const convChoice: ConversionChoice = { from: "steam", to: "coop" };
    const result = await convert(state.targetDir, backupDir, state.files, convChoice);
    printConversionResult(result);
    await writeConversionLog(backupDir, state, convChoice, result);
  } else {
    info("[+] Save files already in the correct format. No conversion needed.");
  }

  const modeName = choice === "classic" ? "Classic Nightreign" : "Seamless Coop";
  info(`\n[+] Launching ${modeName}...`);
  info(`    Executable: ${targetExe}`);

  const launched = await launchGame(targetExe);
  if (!launched) {
    error(`\n[!] Failed to launch ${modeName}.`);
    error(`    Could not start: ${targetExe}`);
    error("    Please verify the file exists and is not blocked by antivirus.");
    return false;
  }

  return true;
}

async function main(): Promise<void> {
  playBonfireIntro();

  // Display version and SHA256 hash
  const sha256 = await getExeHash();
  printVersionInfo(VERSION, sha256);

  let launchedGame = false;

  try {
    const args = parseArgs(process.argv);
    const mode = detectMode();

    if (mode === "launcher") {
      launchedGame = await runLauncherMode();
    } else {
      await runStandaloneMode(args.testMode, args.choice, args.dryRun);
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
