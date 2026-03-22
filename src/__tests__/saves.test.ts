import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs/promises", () => ({
  default: {
    access: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
  },
}));

vi.mock("../config.js", () => ({
  SAVE_FORMATS: {
    steam: { extension: ".sl2", label: "Steam" },
    coop: { extension: ".co2", label: "SeamlessCoop" },
  },
  getNightreignDir: () => "/appdata/Nightreign",
}));

import fs from "fs/promises";
import { detectSaveDirectory } from "../saves.js";
import { SaveDirectoryNotFoundError, NoSaveFilesError } from "../types.js";

const mockAccess = vi.mocked(fs.access);
const mockReaddir = vi.mocked(fs.readdir);
const mockStat = vi.mocked(fs.stat);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("detectSaveDirectory", () => {
  it("detects steam save", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReaddir
      .mockResolvedValueOnce([
        { name: "12345", isDirectory: () => true },
      ] as any)
      .mockResolvedValueOnce(["NR0000.sl2"] as any);

    const result = await detectSaveDirectory();

    expect(result.hasSteamSave).toBe(true);
    expect(result.hasCoopSave).toBe(false);
    expect(result.steamIdFolder).toBe("12345");
  });

  it("detects coop save", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReaddir
      .mockResolvedValueOnce([
        { name: "67890", isDirectory: () => true },
      ] as any)
      .mockResolvedValueOnce(["NR0000.co2"] as any);

    const result = await detectSaveDirectory();

    expect(result.hasCoopSave).toBe(true);
    expect(result.hasSteamSave).toBe(false);
  });

  it("detects both save types", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReaddir
      .mockResolvedValueOnce([
        { name: "12345", isDirectory: () => true },
      ] as any)
      .mockResolvedValueOnce(["NR0000.sl2", "NR0000.co2"] as any);

    const result = await detectSaveDirectory();

    expect(result.hasSteamSave).toBe(true);
    expect(result.hasCoopSave).toBe(true);
  });

  it("detects save files with any character number (NR0001, etc.)", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReaddir
      .mockResolvedValueOnce([
        { name: "12345", isDirectory: () => true },
      ] as any)
      .mockResolvedValueOnce(["NR0001.sl2", "NR0002.co2"] as any);

    const result = await detectSaveDirectory();

    expect(result.hasSteamSave).toBe(true);
    expect(result.hasCoopSave).toBe(true);
  });

  it("does not count .bak files as save files", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReaddir
      .mockResolvedValueOnce([
        { name: "12345", isDirectory: () => true },
      ] as any)
      .mockResolvedValueOnce(["NR0000.sl2.bak"] as any);

    await expect(detectSaveDirectory()).rejects.toThrow(NoSaveFilesError);
  });

  it("throws SaveDirectoryNotFoundError when no numeric folder", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReaddir.mockResolvedValueOnce([
      { name: "notanumber", isDirectory: () => true },
    ] as any);

    await expect(detectSaveDirectory()).rejects.toThrow(SaveDirectoryNotFoundError);
  });

  it("throws NoSaveFilesError when no save files", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReaddir
      .mockResolvedValueOnce([
        { name: "12345", isDirectory: () => true },
      ] as any)
      .mockResolvedValueOnce(["other.txt"] as any);

    await expect(detectSaveDirectory()).rejects.toThrow(NoSaveFilesError);
  });

  it("falls back to most recently modified folder when no selector provided", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReaddir
      .mockResolvedValueOnce([
        { name: "abc", isDirectory: () => true },
        { name: "11111", isDirectory: () => true },
        { name: "22222", isDirectory: () => true },
      ] as any)
      .mockResolvedValueOnce(["NR0000.sl2"] as any);

    // stat calls for each numeric folder to find most recent
    mockStat
      .mockResolvedValueOnce({ mtimeMs: 1000 } as any)  // 11111
      .mockResolvedValueOnce({ mtimeMs: 2000 } as any); // 22222

    const result = await detectSaveDirectory();
    expect(result.steamIdFolder).toBe("22222");
  });

  it("prompts user to choose when multiple folders and selector provided", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReaddir
      .mockResolvedValueOnce([
        { name: "11111", isDirectory: () => true },
        { name: "22222", isDirectory: () => true },
      ] as any)
      .mockResolvedValueOnce(["NR0000.sl2"] as any);

    const selector = vi.fn().mockResolvedValue("11111");

    const result = await detectSaveDirectory(selector);

    expect(selector).toHaveBeenCalledWith(["11111", "22222"]);
    expect(result.steamIdFolder).toBe("11111");
    // stat should NOT be called since selector provided a valid choice
    expect(mockStat).not.toHaveBeenCalled();
  });

  it("falls back to most recent when selector returns null", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReaddir
      .mockResolvedValueOnce([
        { name: "11111", isDirectory: () => true },
        { name: "22222", isDirectory: () => true },
      ] as any)
      .mockResolvedValueOnce(["NR0000.sl2"] as any);

    mockStat
      .mockResolvedValueOnce({ mtimeMs: 3000 } as any)  // 11111
      .mockResolvedValueOnce({ mtimeMs: 1000 } as any); // 22222

    const selector = vi.fn().mockResolvedValue(null);

    const result = await detectSaveDirectory(selector);

    expect(selector).toHaveBeenCalledWith(["11111", "22222"]);
    expect(result.steamIdFolder).toBe("11111"); // most recent
  });
});
