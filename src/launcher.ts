import { spawn } from "child_process";
import path from "path";

export function launchGame(executablePath: string): void {
  const child = spawn(executablePath, [], {
    detached: true,
    stdio: "ignore",
    cwd: path.dirname(executablePath),
  });
  child.unref();
}
