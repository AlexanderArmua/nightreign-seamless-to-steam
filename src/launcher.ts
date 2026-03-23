import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

export async function launchGame(executablePath: string): Promise<{ launched: boolean; command: string }> {
  // Verify the executable exists before trying to launch it
  try {
    await fs.access(executablePath);
  } catch {
    return { launched: false, command: "" };
  }

  const dir = path.dirname(executablePath);
  const exe = path.basename(executablePath);

  // Build the full command as a single string after /c so cmd.exe doesn't
  // corrupt the quoting. /S prevents cmd's automatic quote-stripping.
  const command = `start /d "${dir}" "" "${exe}"`;

  try {
    const child = spawn("cmd", ["/S", "/c", command], {
      detached: true,
      stdio: "ignore",
    });

    return new Promise((resolve) => {
      child.on("error", () => {
        resolve({ launched: false, command });
      });

      child.on("spawn", () => {
        child.unref();
        resolve({ launched: true, command });
      });
    });
  } catch {
    return { launched: false, command };
  }
}
