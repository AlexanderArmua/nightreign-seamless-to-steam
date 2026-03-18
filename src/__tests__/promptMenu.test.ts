import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import {
  promptMenu,
  promptConversionChoice,
  promptStandaloneMenu,
  promptLauncherMenu,
  promptZipSelection,
  promptDirectoryInput,
  promptPressAnyKey,
  waitForExit,
  info,
} from "../cli.js";

// Save originals
const originalStdin = process.stdin;
const originalStdout = process.stdout;

let fakeStdin: EventEmitter & { isTTY?: boolean; setRawMode: any; resume: any; pause: any };

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);

  fakeStdin = new EventEmitter() as any;
  fakeStdin.isTTY = false;
  fakeStdin.setRawMode = vi.fn();
  fakeStdin.resume = vi.fn();
  fakeStdin.pause = vi.fn();

  Object.defineProperty(process, "stdin", {
    value: fakeStdin,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  Object.defineProperty(process, "stdin", {
    value: originalStdin,
    writable: true,
    configurable: true,
  });
  vi.restoreAllMocks();
});

describe("promptMenu", () => {
  it("returns null for empty options", async () => {
    const result = await promptMenu("title", []);
    expect(result).toBeNull();
  });

  it("selects first option on Enter", async () => {
    const promise = promptMenu("Pick one:", [
      { label: "Option A", value: "a" },
      { label: "Option B", value: "b" },
    ]);

    // Simulate Enter key
    fakeStdin.emit("data", Buffer.from("\r"));

    const result = await promise;
    expect(result).toBe("a");
  });

  it("navigates down then selects", async () => {
    const promise = promptMenu("Pick one:", [
      { label: "Option A", value: "a" },
      { label: "Option B", value: "b" },
    ]);

    // Down arrow then Enter
    fakeStdin.emit("data", Buffer.from("\x1b[B"));
    fakeStdin.emit("data", Buffer.from("\r"));

    const result = await promise;
    expect(result).toBe("b");
  });

  it("navigates up (wraps around) then selects", async () => {
    const promise = promptMenu("Pick one:", [
      { label: "Option A", value: "a" },
      { label: "Option B", value: "b" },
    ]);

    // Up arrow wraps to last, then Enter
    fakeStdin.emit("data", Buffer.from("\x1b[A"));
    fakeStdin.emit("data", Buffer.from("\r"));

    const result = await promise;
    expect(result).toBe("b");
  });

  it("selects by number key", async () => {
    const promise = promptMenu("Pick one:", [
      { label: "Option A", value: "a" },
      { label: "Option B", value: "b" },
    ]);

    fakeStdin.emit("data", Buffer.from("2"));

    const result = await promise;
    expect(result).toBe("b");
  });

  it("ignores invalid number keys", async () => {
    const promise = promptMenu("Pick one:", [
      { label: "Option A", value: "a" },
    ]);

    // Press "9" (out of range), then "1" (valid)
    fakeStdin.emit("data", Buffer.from("9"));
    fakeStdin.emit("data", Buffer.from("1"));

    const result = await promise;
    expect(result).toBe("a");
  });

  it("uses setRawMode when isTTY is true", async () => {
    fakeStdin.isTTY = true;

    const promise = promptMenu("Pick:", [
      { label: "A", value: 1 },
    ]);

    fakeStdin.emit("data", Buffer.from("\r"));

    await promise;
    expect(fakeStdin.setRawMode).toHaveBeenCalledWith(true);
    expect(fakeStdin.setRawMode).toHaveBeenCalledWith(false);
  });
});

describe("promptConversionChoice with saves", () => {
  it("offers steam->coop when steam save exists", async () => {
    const promise = promptConversionChoice({
      targetDir: "/dir",
      steamIdFolder: "123",
      hasSteamSave: true,
      hasCoopSave: false,
      files: [],
    });

    // Select first (only) option
    fakeStdin.emit("data", Buffer.from("\r"));

    const result = await promise;
    expect(result).toEqual({ from: "steam", to: "coop" });
  });

  it("offers coop->steam when coop save exists", async () => {
    const promise = promptConversionChoice({
      targetDir: "/dir",
      steamIdFolder: "123",
      hasSteamSave: false,
      hasCoopSave: true,
      files: [],
    });

    fakeStdin.emit("data", Buffer.from("\r"));

    const result = await promise;
    expect(result).toEqual({ from: "coop", to: "steam" });
  });

  it("offers both options when both saves exist", async () => {
    const promise = promptConversionChoice({
      targetDir: "/dir",
      steamIdFolder: "123",
      hasSteamSave: true,
      hasCoopSave: true,
      files: [],
    });

    // Select second option (coop->steam)
    fakeStdin.emit("data", Buffer.from("2"));

    const result = await promise;
    expect(result).toEqual({ from: "coop", to: "steam" });
  });
});

describe("promptStandaloneMenu", () => {
  it("returns copy_saves for first option", async () => {
    const promise = promptStandaloneMenu();
    fakeStdin.emit("data", Buffer.from("1"));
    expect(await promise).toBe("copy_saves");
  });

  it("returns exit for last option", async () => {
    const promise = promptStandaloneMenu();
    fakeStdin.emit("data", Buffer.from("5"));
    expect(await promise).toBe("exit");
  });
});

describe("promptLauncherMenu", () => {
  it("returns classic for first option", async () => {
    const promise = promptLauncherMenu(true);
    fakeStdin.emit("data", Buffer.from("1"));
    expect(await promise).toBe("classic");
  });

  it("returns seamless_coop for second option with coop installed", async () => {
    const promise = promptLauncherMenu(true);
    fakeStdin.emit("data", Buffer.from("2"));
    expect(await promise).toBe("seamless_coop");
  });

  it("shows not installed label when coop missing", async () => {
    const promise = promptLauncherMenu(false);
    fakeStdin.emit("data", Buffer.from("2"));
    const result = await promise;
    expect(result).toBe("seamless_coop");
    // Check that "not installed" text was written
    const writes = (process.stdout.write as any).mock.calls.map((c: any) => c[0]).join("");
    expect(writes).toContain("not installed");
  });

  it("returns uninstall for third option", async () => {
    const promise = promptLauncherMenu(true);
    fakeStdin.emit("data", Buffer.from("3"));
    expect(await promise).toBe("uninstall");
  });
});

describe("promptZipSelection", () => {
  it("returns selected zip candidate", async () => {
    const candidate = {
      fileName: "mod.zip",
      fullPath: "/downloads/mod.zip",
      modifiedTime: new Date(),
      sizeBytes: 1024,
    };

    const promise = promptZipSelection([candidate]);
    fakeStdin.emit("data", Buffer.from("1"));
    const result = await promise;
    expect(result).toEqual(candidate);
  });

  it("returns null for browse manually option", async () => {
    const candidate = {
      fileName: "mod.zip",
      fullPath: "/downloads/mod.zip",
      modifiedTime: new Date(),
      sizeBytes: 1024,
    };

    const promise = promptZipSelection([candidate]);
    // Second option is "Browse manually..."
    fakeStdin.emit("data", Buffer.from("2"));
    const result = await promise;
    expect(result).toBeNull();
  });
});

describe("promptDirectoryInput", () => {
  it("returns trimmed user input", async () => {
    const promise = promptDirectoryInput("Enter directory:");

    fakeStdin.emit("data", Buffer.from("  /some/path  \n"));

    const result = await promise;
    expect(result).toBe("/some/path");
  });

  it("uses setRawMode(false) when isTTY", async () => {
    fakeStdin.isTTY = true;
    const promise = promptDirectoryInput("Enter dir:");
    fakeStdin.emit("data", Buffer.from("/path\n"));
    await promise;
    expect(fakeStdin.setRawMode).toHaveBeenCalledWith(false);
  });
});

describe("promptPressAnyKey", () => {
  it("resolves on any keypress", async () => {
    const promise = promptPressAnyKey("Press any key...");

    fakeStdin.emit("data", Buffer.from("a"));

    await expect(promise).resolves.toBeUndefined();
  });

  it("uses setRawMode when isTTY", async () => {
    fakeStdin.isTTY = true;

    const promise = promptPressAnyKey("Press any key...");
    fakeStdin.emit("data", Buffer.from("x"));

    await promise;
    expect(fakeStdin.setRawMode).toHaveBeenCalledWith(true);
    expect(fakeStdin.setRawMode).toHaveBeenCalledWith(false);
  });

  it("calls process.exit on Ctrl+C", async () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    const promise = promptPressAnyKey("Press any key...");
    fakeStdin.emit("data", Buffer.from("\x03"));

    // Give microtask a chance
    await new Promise((r) => setTimeout(r, 0));
    expect(mockExit).toHaveBeenCalledWith(0);
    mockExit.mockRestore();
  });
});

describe("promptMenu Ctrl+C", () => {
  it("calls process.exit on Ctrl+C", async () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    const promise = promptMenu("Pick:", [
      { label: "A", value: "a" },
    ]);

    fakeStdin.emit("data", Buffer.from("\x03"));

    await new Promise((r) => setTimeout(r, 0));
    expect(mockExit).toHaveBeenCalledWith(0);
    mockExit.mockRestore();
  });
});

describe("waitForExit", () => {
  it("sets up listener and calls exit on keypress", () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    waitForExit();

    expect(fakeStdin.resume).toHaveBeenCalled();
    // Simulate keypress
    fakeStdin.emit("data", Buffer.from("q"));
    expect(mockExit).toHaveBeenCalledWith(0);
    mockExit.mockRestore();
  });

  it("sets rawMode when isTTY", () => {
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    fakeStdin.isTTY = true;

    waitForExit();

    expect(fakeStdin.setRawMode).toHaveBeenCalledWith(true);
    fakeStdin.emit("data", Buffer.from("q"));
    vi.restoreAllMocks();
  });
});
