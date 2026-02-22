import type {
  ConversionChoice,
  ConversionResult,
  InstallResult,
  LauncherMenuChoice,
  MenuItem,
  ParsedArgs,
  SaveDirectoryState,
  StandaloneMenuChoice,
  UninstallResult,
} from "./types.js";

export const COLORS = {
  reset: "\x1b[0m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  white: "\x1b[37m",
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
  const baseName = "NR0000";

  if (result.mainConverted) {
    success(`[+] Converted: ${baseName}${result.fromExt} -> ${baseName}${result.toExt}`);
  } else {
    error(`[!] Error: File ${baseName}${result.fromExt} not found.`);
  }

  if (result.bakConverted) {
    success(`[+] Converted: ${baseName}${result.fromExt}.bak -> ${baseName}${result.toExt}.bak`);
  } else {
    warning(`[!] Warning: File ${baseName}${result.fromExt}.bak not found.`);
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
      if (i === selected) {
        process.stdout.write(`${COLORS.green}  > ${options[i].label}${COLORS.reset}\n`);
      } else {
        process.stdout.write(`${COLORS.white}    ${options[i].label}${COLORS.reset}\n`);
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

  return promptMenu("Select a conversion (↑/↓ to move, Enter to confirm):", options);
}

export async function promptStandaloneMenu(): Promise<StandaloneMenuChoice | null> {
  const options: MenuItem<StandaloneMenuChoice>[] = [
    { label: "Copy savegames (convert between Steam/Coop)", value: "copy_saves" },
    { label: "Install Save Manager as game launcher", value: "install" },
    { label: "Uninstall Save Manager from game launcher", value: "uninstall" },
  ];

  return promptMenu("What would you like to do? (↑/↓ to move, Enter to confirm):", options);
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

  return promptMenu("Choose how to launch Nightreign (↑/↓ to move, Enter to confirm):", options);
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
    success("\n[+] Save Manager installed successfully!");
    info(`    Game directory: ${result.gameDirPath}`);
    if (result.originalRenamed) {
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
    if (!result.originalRenamed) {
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

  if (argv.includes("--to-steam")) {
    return { choice: { from: "coop", to: "steam" }, testMode };
  }
  if (argv.includes("--to-coop")) {
    return { choice: { from: "steam", to: "coop" }, testMode };
  }
  return { choice: null, testMode };
}
