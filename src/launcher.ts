import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

export async function launchGame(executablePath: string): Promise<boolean> {
  // Verify the executable exists before trying to launch it
  try {
    await fs.access(executablePath);
  } catch {
    return false;
  }

  try {
    const child = spawn(executablePath, [], {
      detached: true,
      stdio: "ignore",
      cwd: path.dirname(executablePath),
    });

    // Listen for spawn errors (e.g., EACCES, file not executable)
    return new Promise<boolean>((resolve) => {
      child.on("error", () => {
        resolve(false);
      });

      // If no error fires within 1 second, assume launch succeeded
      child.on("spawn", () => {
        child.unref();
        resolve(true);
      });
    });
  } catch {
    return false;
  }
}
