import { detectSaveDirectory } from "./saves.js";
import { createTestEnvironment } from "./test-setup.js";
import { createBackup } from "./backup.js";
import { convert } from "./converter.js";
import {
  printBanner,
  info,
  success,
  error,
  warning,
  promptConversionChoice,
  printConversionResult,
  waitForExit,
  parseArgs,
} from "./cli.js";
import type { ConversionChoice } from "./types.js";

async function main(): Promise<void> {
  printBanner();

  try {
    const args = parseArgs(process.argv);
    const state = args.testMode
      ? await createTestEnvironment()
      : await detectSaveDirectory();

    info(`[+] Save directory detected: ${state.steamIdFolder}\n`);

    // Back up current state before any changes
    const backupDir = await createBackup(state.targetDir, state.files);
    const backupName = backupDir.split(/[/\\]/).pop()!;
    info(`[+] Backup of current state saved in: ${backupName}\n`);

    // Determine conversion choice: CLI args or interactive menu
    let choice: ConversionChoice | null = args.choice;

    if (choice) {
      // Validate that the required source file exists
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
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") {
      error("\n[X] Error: Directory not found. Is the game installed?");
    } else {
      error("\n[X] An unexpected error occurred: " + (e.message ?? String(e)));
    }
  } finally {
    waitForExit();
  }
}

main();
