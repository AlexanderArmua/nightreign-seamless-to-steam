import { COLORS } from "./cli.js";

const C = COLORS;

// Lower half: crossguard, narrowing flames + handle, and base (static across all frames)
const LOWER_HALF = [
  `${C.brightRed}      ⠻⣿${C.white}⠤⣤⣼⣧⣤⠤${C.brightRed}⣿⠟`,
  `${C.red}        ⠻${C.yellow}⣿${C.white}⢸⡇${C.yellow}⣿${C.red}⠟`,
  `${C.red}        ⠈${C.yellow}⣿${C.white}⢸⡇${C.yellow}⣿${C.red}⠁`,
  `${C.white}          ⢸⡇`,
  `${C.gray}        ⣀⣤⣸⣇⣤⣀`,
  `${C.gray}       ⣼⣿⣿⣿⣿⣿⣧`,
  `${C.gray}       ⠿⣿⣿⣿⣿⣿⠿`,
  `${C.yellow}        ⠈⠉⠉⠉⠉⠁${C.reset}`,
].join("\n");

const FLAME_1 = `${C.brightYellow}            ⡀
${C.yellow}         ⢀⣾${C.brightYellow}⣿⣿${C.yellow}⣧⡀
${C.red}        ⣠${C.yellow}⣿⣿${C.brightYellow}⣿⣿${C.yellow}⣿⣿${C.red}⣄
${C.red}       ⣴${C.brightRed}⣿${C.yellow}⣿⣿${C.brightYellow}⣿⣿${C.yellow}⣿⣿${C.brightRed}⣿${C.red}⣦
${C.red}      ⣼${C.brightRed}⣿⣿${C.yellow}⣿⣿${C.brightYellow}⣿⣿${C.yellow}⣿⣿${C.brightRed}⣿⣿${C.red}⣧
${C.red}      ⣿${C.brightRed}⣿${C.yellow}⣿⣿${C.white}⢸⡇${C.yellow}⣿⣿${C.brightRed}⣿${C.red}⣿
${C.red}      ⣿${C.brightRed}⣿${C.yellow}⣿⣿${C.white}⢸⡇${C.yellow}⣿⣿${C.brightRed}⣿${C.red}⣿
${C.red}      ⢿${C.brightRed}⣿${C.yellow}⣿⣿${C.white}⢸⡇${C.yellow}⣿⣿${C.brightRed}⣿${C.red}⡿
${LOWER_HALF}`;

const FLAME_2 = `${C.brightYellow}           ⣀⡀
${C.yellow}         ⣰${C.brightYellow}⣿⣿${C.yellow}⣿⣆
${C.red}       ⢀${C.yellow}⣿⣿${C.brightYellow}⣿⣿${C.yellow}⣿⣿${C.red}⡀
${C.red}      ⢠${C.brightRed}⣿⣿${C.yellow}⣿⣿${C.brightYellow}⣿⣿${C.yellow}⣿⣿${C.brightRed}⣿${C.red}⡄
${C.red}      ⣾${C.brightRed}⣿⣿${C.yellow}⣿⣿${C.brightYellow}⣿⣿${C.yellow}⣿⣿${C.brightRed}⣿⣿${C.red}⣷
${C.red}      ⣿${C.brightRed}⣿${C.yellow}⣿⣿${C.white}⢸⡇${C.yellow}⣿⣿${C.brightRed}⣿${C.red}⣿
${C.red}      ⢿${C.brightRed}⣿${C.yellow}⣿⣿${C.white}⢸⡇${C.yellow}⣿⣿${C.brightRed}⣿${C.red}⡿
${C.red}      ⠘${C.brightRed}⣿${C.yellow}⣿⣿${C.white}⢸⡇${C.yellow}⣿⣿${C.brightRed}⣿${C.red}⠃
${LOWER_HALF}`;

const FLAME_3 = `${C.brightYellow}          ⡀
${C.yellow}        ⢀⣾${C.brightYellow}⣿⣿${C.yellow}⣷
${C.red}       ⣠${C.yellow}⣿⣿${C.brightYellow}⣿⣿${C.yellow}⣿⣿${C.red}⣤
${C.red}      ⢠${C.brightRed}⣿${C.yellow}⣿⣿${C.brightYellow}⣿⣿${C.yellow}⣿⣿${C.brightRed}⣿⣿${C.red}⡄
${C.red}     ⢀${C.brightRed}⣿⣿${C.yellow}⣿⣿${C.brightYellow}⣿⣿${C.yellow}⣿⣿${C.brightRed}⣿⣿${C.red}⣿⡀
${C.red}      ⣿${C.brightRed}⣿${C.yellow}⣿⣿${C.white}⢸⡇${C.yellow}⣿⣿${C.brightRed}⣿${C.red}⣿
${C.red}      ⣿${C.brightRed}⣿${C.yellow}⣿⣿${C.white}⢸⡇${C.yellow}⣿⣿${C.brightRed}⣿${C.red}⡿
${C.red}      ⠸${C.brightRed}⣿${C.yellow}⣿⣿${C.white}⢸⡇${C.yellow}⣿⣿${C.brightRed}⣿${C.red}⠇
${LOWER_HALF}`;

const FRAMES = [FLAME_1, FLAME_2, FLAME_3];

// Each frame is this many lines tall
const FRAME_HEIGHT = 16;

// 1 blank line for top padding (no banner)
const BANNER_HEIGHT = 1;

let animationInterval: ReturnType<typeof setInterval> | null = null;
let frameIndex = 0;

function drawFrame(startRow: number): void {
  const frame = FRAMES[frameIndex % FRAMES.length];
  const lines = frame.split("\n");

  // Save cursor position
  process.stdout.write("\x1b7");

  for (let i = 0; i < lines.length; i++) {
    // Move to absolute row, column 1
    process.stdout.write(`\x1b[${startRow + i};1H`);
    // Clear line and write frame line
    process.stdout.write("\x1b[2K" + lines[i]);
  }

  // Restore cursor position
  process.stdout.write("\x1b8");

  frameIndex++;
}

export function startBonfireAnimation(startRow: number): void {
  if (animationInterval) return;

  animationInterval = setInterval(() => {
    drawFrame(startRow);
  }, 250);
}

export function stopBonfireAnimation(): void {
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
  }
}

export function playBonfireIntro(): void {
  // Clear screen and move cursor to top-left
  process.stdout.write("\x1b[2J\x1b[H");

  // Top padding
  console.log();

  // Bonfire starts at row BANNER_HEIGHT + 1 (1-indexed)
  const bonfireStartRow = BANNER_HEIGHT + 1;

  // Draw first frame immediately
  frameIndex = 0;
  const firstFrame = FRAMES[0];
  console.log(firstFrame);

  // Start animation
  startBonfireAnimation(bonfireStartRow);

  // Set scroll region from below bonfire to terminal bottom
  const contentStartRow = bonfireStartRow + FRAME_HEIGHT + 1;
  const terminalHeight = process.stdout.rows || 40;
  process.stdout.write(`\x1b[${contentStartRow};${terminalHeight}r`);

  // Move cursor to the content area
  process.stdout.write(`\x1b[${contentStartRow};1H`);
}

export function cleanupBonfire(): void {
  stopBonfireAnimation();
  // Reset scroll region to full terminal
  process.stdout.write("\x1b[r");
}
