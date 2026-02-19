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
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (query: string): Promise<string> =>
    new Promise((resolve) => rl.question(query, resolve));

  try {
    info("Available conversions based on your current files:");

    const validOptions: string[] = [];

    if (state.hasSteamSave) {
      info("1. From Steam to Coop (You played Steam, want to play Coop)");
      validOptions.push("1");
    } else {
      warning("[-] Option 1 unavailable: No Steam save (.sl2) found.");
    }

    if (state.hasCoopSave) {
      info("2. From Coop to Steam (You played Coop, want to play Steam)");
      validOptions.push("2");
    } else {
      warning("[-] Option 2 unavailable: No Coop save (.co2) found.");
    }

    const answer = await ask(`${COLORS.white}\nEnter your choice: ${COLORS.reset}`);

    if (!validOptions.includes(answer.trim())) {
      error("\n[!] Invalid option or file not available. Exiting...");
      return null;
    }

    if (answer.trim() === "1") {
      return { from: "steam", to: "coop" };
    }
    return { from: "coop", to: "steam" };
  } finally {
    rl.close();
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
