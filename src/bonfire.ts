import { COLORS, printBanner } from "./cli.js";

const FLAME_1 = `${COLORS.yellow}       )  ${COLORS.red}  (
${COLORS.red}      (  ${COLORS.yellow} )  )
${COLORS.yellow}       )${COLORS.red}(${COLORS.yellow})${COLORS.red}(${COLORS.yellow})
${COLORS.red}      (${COLORS.yellow}(${COLORS.red}(${COLORS.yellow})${COLORS.red})${COLORS.yellow})
${COLORS.yellow}       )${COLORS.red}(${COLORS.yellow}(${COLORS.red})${COLORS.yellow})
${COLORS.red}        )${COLORS.yellow}(${COLORS.red})
${COLORS.white}        |||
        |||
       /|||\\
      / ||| \\
     /  |||  \\
    /____|____\\
${COLORS.yellow}  ~~~~~~~~~~~~~~~   ${COLORS.reset}`;

const FLAME_2 = `${COLORS.red}      (   ${COLORS.yellow} )
${COLORS.yellow}       ) ${COLORS.red} (  )
${COLORS.red}      (${COLORS.yellow})${COLORS.red}(${COLORS.yellow})(${COLORS.red})
${COLORS.yellow}       (${COLORS.red}(${COLORS.yellow})${COLORS.red}(${COLORS.yellow}))
${COLORS.red}      (${COLORS.yellow})(${COLORS.red}(${COLORS.yellow})${COLORS.red})(
${COLORS.yellow}        (${COLORS.red})${COLORS.yellow})
${COLORS.white}        |||
        |||
       /|||\\
      / ||| \\
     /  |||  \\
    /____|____\\
${COLORS.yellow}  ~~~~~~~~~~~~~~~   ${COLORS.reset}`;

const FLAME_3 = `${COLORS.yellow}       (  ${COLORS.red} )
${COLORS.red}      ) ${COLORS.yellow} (${COLORS.red})
${COLORS.yellow}      (${COLORS.red})(${COLORS.yellow})(${COLORS.red})(
${COLORS.red}      (${COLORS.yellow})(${COLORS.red}(${COLORS.yellow})(${COLORS.red})
${COLORS.yellow}       (${COLORS.red}(${COLORS.yellow})${COLORS.red}(${COLORS.yellow})
${COLORS.red}       )${COLORS.yellow}(${COLORS.red})(
${COLORS.white}        |||
        |||
       /|||\\
      / ||| \\
     /  |||  \\
    /____|____\\
${COLORS.yellow}  ~~~~~~~~~~~~~~~   ${COLORS.reset}`;

const FRAMES = [FLAME_1, FLAME_2, FLAME_3];

// Each frame is this many lines tall
const FRAME_HEIGHT = 13;

// Banner is 3 lines + 1 blank line = 4 lines before bonfire
const BANNER_HEIGHT = 4;

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

  // Print banner (3 lines)
  printBanner();

  // Blank line after banner
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
