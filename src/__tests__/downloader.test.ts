import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";

vi.mock("fs/promises", () => ({
  default: {
    readdir: vi.fn(),
    stat: vi.fn(),
    access: vi.fn(),
    mkdir: vi.fn(),
    cp: vi.fn(),
    rm: vi.fn(),
    readFile: vi.fn(),
  },
}));

vi.mock("child_process", () => ({
  execFileSync: vi.fn(),
  spawn: vi.fn(),
}));

import fs from "fs/promises";
import { getDownloadsFolder, scanForZipFiles, installMod, detectGameDirectories, extractZip, openUrl, openFilePicker, openFolderPicker } from "../downloader.js";

const mockReaddir = vi.mocked(fs.readdir);
const mockStat = vi.mocked(fs.stat);
const mockAccess = vi.mocked(fs.access);
const mockMkdir = vi.mocked(fs.mkdir);
const mockCp = vi.mocked(fs.cp);
const mockRm = vi.mocked(fs.rm);

import { execFileSync, spawn } from "child_process";
const mockExecFileSync = vi.mocked(execFileSync);
const mockSpawn = vi.mocked(spawn);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getDownloadsFolder", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns Downloads path from USERPROFILE", () => {
    process.env.USERPROFILE = "C:\\Users\\Test";
    process.env.HOME = "";
    const result = getDownloadsFolder();
    expect(result).toContain("Downloads");
  });

  it("returns Downloads path from HOME", () => {
    delete process.env.USERPROFILE;
    process.env.HOME = "/home/test";
    const result = getDownloadsFolder();
    expect(result).toContain("Downloads");
  });

  it("returns null when neither set", () => {
    delete process.env.USERPROFILE;
    delete process.env.HOME;
    expect(getDownloadsFolder()).toBeNull();
  });
});

describe("scanForZipFiles", () => {
  it("returns recent zip files sorted by date", async () => {
    const now = Date.now();
    mockReaddir.mockResolvedValue(["mod.zip", "other.zip"] as any);
    mockStat
      .mockResolvedValueOnce({
        isFile: () => true,
        mtimeMs: now - 1000,
        mtime: new Date(now - 1000),
        size: 500,
      } as any)
      .mockResolvedValueOnce({
        isFile: () => true,
        mtimeMs: now - 500,
        mtime: new Date(now - 500),
        size: 1000,
      } as any);

    const result = await scanForZipFiles("/downloads");

    expect(result).toHaveLength(2);
    expect(result[0].fileName).toBe("other.zip");
    expect(result[1].fileName).toBe("mod.zip");
  });

  it("filters out old zip files", async () => {
    const oldTime = Date.now() - 2 * 24 * 60 * 60 * 1000;
    mockReaddir.mockResolvedValue(["old.zip"] as any);
    mockStat.mockResolvedValue({
      isFile: () => true,
      mtimeMs: oldTime,
      mtime: new Date(oldTime),
      size: 100,
    } as any);

    const result = await scanForZipFiles("/downloads");
    expect(result).toHaveLength(0);
  });

  it("filters out non-zip files", async () => {
    mockReaddir.mockResolvedValue(["readme.txt", "mod.exe"] as any);

    const result = await scanForZipFiles("/downloads");
    expect(result).toHaveLength(0);
  });

  it("returns empty for empty directory", async () => {
    mockReaddir.mockResolvedValue([] as any);
    const result = await scanForZipFiles("/downloads");
    expect(result).toHaveLength(0);
  });

  it("returns empty when readdir fails", async () => {
    mockReaddir.mockRejectedValue(new Error("ENOENT"));
    const result = await scanForZipFiles("/downloads");
    expect(result).toHaveLength(0);
  });

  it("filters out directories", async () => {
    const now = Date.now();
    mockReaddir.mockResolvedValue(["folder.zip"] as any);
    mockStat.mockResolvedValue({
      isFile: () => false,
      mtimeMs: now,
      mtime: new Date(now),
      size: 0,
    } as any);

    const result = await scanForZipFiles("/downloads");
    expect(result).toHaveLength(0);
  });
});

describe("detectGameDirectories", () => {
  it("finds game via vdf library path", async () => {
    const mockReadFile = vi.mocked(fs.readFile);
    // VDF found at default Steam path
    mockReadFile.mockImplementation(async (p: any) => {
      if (String(p).includes("libraryfolders.vdf")) {
        return `"libraryfolders"\n{\n  "0"\n  {\n    "path"    "C:\\\\Program Files (x86)\\\\Steam"\n  }\n}` as any;
      }
      throw new Error("ENOENT");
    });
    // Game found at the library path
    mockStat.mockImplementation(async (p: any) => {
      if (String(p).includes("ELDEN RING NIGHTREIGN")) {
        return { isDirectory: () => true } as any;
      }
      throw new Error("ENOENT");
    });

    const result = await detectGameDirectories();

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]).toContain("ELDEN RING NIGHTREIGN");
  });

  it("returns empty when game not anywhere", async () => {
    mockStat.mockRejectedValue(new Error("ENOENT"));
    const mockReadFile = vi.mocked(fs.readFile);
    mockReadFile.mockRejectedValue(new Error("ENOENT"));

    const result = await detectGameDirectories();

    expect(result).toHaveLength(0);
  });

  it("finds game on multiple drives", async () => {
    const mockReadFile = vi.mocked(fs.readFile);
    mockReadFile.mockRejectedValue(new Error("ENOENT"));
    // Game exists at two locations via direct path check
    mockStat.mockImplementation(async (p: any) => {
      const s = String(p);
      if (s.includes("C:\\Program Files (x86)\\Steam") && s.includes("NIGHTREIGN")) {
        return { isDirectory: () => true } as any;
      }
      if (s.includes("D:\\SteamLibrary") && s.includes("NIGHTREIGN")) {
        return { isDirectory: () => true } as any;
      }
      throw new Error("ENOENT");
    });

    const result = await detectGameDirectories();

    expect(result.length).toBe(2);
  });
});

describe("extractZip", () => {
  it("extracts and copies files from temp dir", async () => {
    mockMkdir.mockResolvedValue(undefined as any);
    mockExecFileSync.mockReturnValue(Buffer.from(""));
    // Extracted content: single file (not wrapped in subfolder)
    mockReaddir
      .mockResolvedValueOnce(["file1.dll", "file2.exe"] as any) // tempDir entries
      .mockResolvedValueOnce(["file1.dll", "file2.exe"] as any); // sourceDir entries (same as tempDir)
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);
    mockCp.mockResolvedValue(undefined);
    mockRm.mockResolvedValue(undefined);

    const result = await extractZip("/path/mod.zip", "/game");

    expect(result.success).toBe(true);
    expect(mockCp).toHaveBeenCalledTimes(2);
  });

  it("unwraps single subfolder", async () => {
    mockMkdir.mockResolvedValue(undefined as any);
    mockExecFileSync.mockReturnValue(Buffer.from(""));
    // Single subfolder wrapper
    mockReaddir
      .mockResolvedValueOnce(["ModFolder"] as any) // tempDir: single entry
      .mockResolvedValueOnce(["inner.dll"] as any); // subfolder contents
    mockStat.mockResolvedValueOnce({ isDirectory: () => true } as any); // single entry is a dir
    mockCp.mockResolvedValue(undefined);
    mockRm.mockResolvedValue(undefined);

    const result = await extractZip("/path/mod.zip", "/game");

    expect(result.success).toBe(true);
    // Should copy from the subfolder, not tempDir
    expect(mockCp).toHaveBeenCalledTimes(1);
  });

  it("returns error on extraction failure", async () => {
    mockMkdir.mockResolvedValue(undefined as any);
    mockExecFileSync.mockImplementation(() => {
      throw new Error("PowerShell failed");
    });
    mockRm.mockResolvedValue(undefined);

    const result = await extractZip("/bad.zip", "/game");

    expect(result.success).toBe(false);
    expect(result.error).toBe("PowerShell failed");
  });

  it("cleans up temp dir even on failure", async () => {
    mockMkdir.mockResolvedValue(undefined as any);
    mockExecFileSync.mockImplementation(() => {
      throw new Error("fail");
    });
    mockRm.mockResolvedValue(undefined);

    await extractZip("/bad.zip", "/game");

    expect(mockRm).toHaveBeenCalledWith(
      expect.stringContaining("nrsc-extract-"),
      { recursive: true, force: true }
    );
  });

  it("rejects path traversal in zip entries", async () => {
    mockMkdir.mockResolvedValue(undefined as any);
    mockExecFileSync.mockReturnValue(Buffer.from(""));
    mockReaddir
      .mockResolvedValueOnce(["../../evil.exe"] as any)
      .mockResolvedValueOnce(["../../evil.exe"] as any);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);
    mockRm.mockResolvedValue(undefined);

    const result = await extractZip("/path/mod.zip", "/game");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unsafe path");
    expect(mockCp).not.toHaveBeenCalled();
  });

  it("escapes single quotes in zip path for PowerShell", async () => {
    mockMkdir.mockResolvedValue(undefined as any);
    mockExecFileSync.mockReturnValue(Buffer.from(""));
    mockReaddir
      .mockResolvedValueOnce(["file.dll"] as any)
      .mockResolvedValueOnce(["file.dll"] as any);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);
    mockCp.mockResolvedValue(undefined);
    mockRm.mockResolvedValue(undefined);

    await extractZip("/path/it's a mod.zip", "/game");

    const psCommand = mockExecFileSync.mock.calls[0][1]![2] as string;
    expect(psCommand).toContain("it''s a mod.zip");
  });
});

describe("openUrl", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  it("uses cmd on win32", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    const mockChild = { on: vi.fn(), unref: vi.fn() };
    mockSpawn.mockReturnValue(mockChild as any);

    expect(openUrl("https://example.com")).toBe(true);
    expect(mockSpawn).toHaveBeenCalledWith("cmd", expect.arrayContaining(["start"]), expect.anything());
  });

  it("uses open on darwin", () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    const mockChild = { on: vi.fn(), unref: vi.fn() };
    mockSpawn.mockReturnValue(mockChild as any);

    expect(openUrl("https://example.com")).toBe(true);
    expect(mockSpawn).toHaveBeenCalledWith("open", expect.anything(), expect.anything());
  });

  it("uses xdg-open on linux", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    const mockChild = { on: vi.fn(), unref: vi.fn() };
    mockSpawn.mockReturnValue(mockChild as any);

    expect(openUrl("https://example.com")).toBe(true);
    expect(mockSpawn).toHaveBeenCalledWith("xdg-open", expect.anything(), expect.anything());
  });

  it("returns false when spawn throws", () => {
    mockSpawn.mockImplementation(() => { throw new Error("fail"); });
    expect(openUrl("https://example.com")).toBe(false);
  });
});

describe("openFilePicker", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  it("returns null on linux", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    expect(openFilePicker()).toBeNull();
  });

  it("calls powershell on win32", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    mockExecFileSync.mockReturnValue(Buffer.from("C:\\file.zip\r\n"));
    const result = openFilePicker("Zip files (*.zip)|*.zip");
    expect(result).toBe("C:\\file.zip");
    expect(mockExecFileSync).toHaveBeenCalledWith("powershell", expect.anything(), expect.anything());
  });

  it("returns null on win32 when user cancels", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    mockExecFileSync.mockReturnValue(Buffer.from(""));
    expect(openFilePicker()).toBeNull();
  });

  it("calls osascript on darwin", () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    mockExecFileSync.mockReturnValue(Buffer.from("/path/to/file.zip\n"));
    const result = openFilePicker("Zip files (*.zip)|*.zip");
    expect(result).toBe("/path/to/file.zip");
    expect(mockExecFileSync).toHaveBeenCalledWith("osascript", expect.anything(), expect.anything());
  });

  it("calls osascript on darwin without zip filter", () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    mockExecFileSync.mockReturnValue(Buffer.from("/path/to/file.txt\n"));
    const result = openFilePicker();
    expect(result).toBe("/path/to/file.txt");
  });

  it("returns null when execFileSync throws", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    mockExecFileSync.mockImplementation(() => { throw new Error("cancelled"); });
    expect(openFilePicker()).toBeNull();
  });
});

describe("openFolderPicker", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  it("returns null on linux", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    expect(openFolderPicker()).toBeNull();
  });

  it("calls powershell on win32", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    mockExecFileSync.mockReturnValue(Buffer.from("C:\\Games\r\n"));
    const result = openFolderPicker();
    expect(result).toBe("C:\\Games");
  });

  it("returns null on win32 when user cancels", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    mockExecFileSync.mockReturnValue(Buffer.from(""));
    expect(openFolderPicker()).toBeNull();
  });

  it("calls osascript on darwin", () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    mockExecFileSync.mockReturnValue(Buffer.from("/path/to/folder\n"));
    const result = openFolderPicker();
    expect(result).toBe("/path/to/folder");
  });

  it("returns null when execFileSync throws", () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    mockExecFileSync.mockImplementation(() => { throw new Error("cancelled"); });
    expect(openFolderPicker()).toBeNull();
  });
});

describe("installMod", () => {
  it("succeeds with launcher found", async () => {
    // extractZip internals
    mockMkdir.mockResolvedValue(undefined as any);
    mockExecFileSync.mockReturnValue(Buffer.from(""));
    mockReaddir.mockResolvedValueOnce(["nrsc_launcher.exe"] as any); // tempDir entries
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any); // single entry check
    mockCp.mockResolvedValue(undefined);
    mockRm.mockResolvedValue(undefined);
    // installMod checks launcher
    mockAccess.mockResolvedValue(undefined);

    const result = await installMod("/path/mod.zip", "/game");

    expect(result.success).toBe(true);
    expect(result.launcherFound).toBe(true);
  });

  it("succeeds with launcher not found", async () => {
    mockMkdir.mockResolvedValue(undefined as any);
    mockExecFileSync.mockReturnValue(Buffer.from(""));
    mockReaddir.mockResolvedValueOnce(["some_file.dll"] as any);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);
    mockCp.mockResolvedValue(undefined);
    mockRm.mockResolvedValue(undefined);
    mockAccess.mockRejectedValue(new Error("ENOENT"));

    const result = await installMod("/path/mod.zip", "/game");

    expect(result.success).toBe(true);
    expect(result.launcherFound).toBe(false);
  });

  it("fails when extraction fails", async () => {
    mockMkdir.mockResolvedValue(undefined as any);
    mockExecFileSync.mockImplementation(() => {
      throw new Error("bad zip");
    });
    mockRm.mockResolvedValue(undefined);

    const result = await installMod("/path/mod.zip", "/game");

    expect(result.success).toBe(false);
    expect(result.error).toBe("bad zip");
  });
});
