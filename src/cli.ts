import type { ConversionChoice, ConversionResult, ParsedArgs, SaveDirectoryState } from "./types.js";

const COLORS = {
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

export async function promptConversionChoice(
  state: SaveDirectoryState
): Promise<ConversionChoice | null> {
  const options: { label: string; choice: ConversionChoice }[] = [];

  if (state.hasSteamSave) {
    options.push({
      label: "Steam → Coop (You played Steam, want to play Coop)",
      choice: { from: "steam", to: "coop" },
    });
  }
  if (state.hasCoopSave) {
    options.push({
      label: "Coop → Steam (You played Coop, want to play Steam)",
      choice: { from: "coop", to: "steam" },
    });
  }

  if (options.length === 0) {
    error("[!] No save files available to convert.");
    return null;
  }

  info("Select a conversion (↑/↓ to move, Enter to confirm):\n");

  let selected = 0;

  const render = () => {
    // Move cursor up to overwrite previous render (skip on first render)
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

  return new Promise<ConversionChoice | null>((resolve) => {
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
        resolve(options[selected].choice);
      }
    };

    process.stdin.on("data", onData);
  });
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
