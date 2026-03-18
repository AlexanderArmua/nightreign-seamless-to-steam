import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs/promises", () => ({
  default: {
    access: vi.fn(),
    readdir: vi.fn(),
  },
}));

vi.mock("../config.js", () => ({
  BASE_SAVE_NAME: "NR0000",
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

  it("picks first numeric folder among multiple", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReaddir
      .mockResolvedValueOnce([
        { name: "abc", isDirectory: () => true },
        { name: "11111", isDirectory: () => true },
        { name: "22222", isDirectory: () => true },
      ] as any)
      .mockResolvedValueOnce(["NR0000.sl2"] as any);

    const result = await detectSaveDirectory();
    expect(result.steamIdFolder).toBe("11111");
  });
});
