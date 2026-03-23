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
    // Use "cmd /c start" to launch via ShellExecuteEx (equivalent to double-clicking).
    // This is required for nrsc_launcher.exe which needs the ShellExecute context
    // to properly inject Seamless Co-op DLLs into the game process.
    const child = spawn("cmd", ["/c", "start", "/d", path.dirname(executablePath), "", path.basename(executablePath)], {
      detached: true,
      stdio: "ignore",
    });

    return new Promise<boolean>((resolve) => {
      child.on("error", () => {
        resolve(false);
      });

      child.on("spawn", () => {
        child.unref();
        resolve(true);
      });
    });
  } catch {
    return false;
  }
}
