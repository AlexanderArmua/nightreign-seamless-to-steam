import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs/promises", () => ({
  default: {
    access: vi.fn(),
    rename: vi.fn(),
    copyFile: vi.fn(),
    unlink: vi.fn(),
  },
}));

import fs from "fs/promises";
import { install, uninstall } from "../installer.js";

const mockAccess = vi.mocked(fs.access);
const mockRename = vi.mocked(fs.rename);
const mockCopyFile = vi.mocked(fs.copyFile);
const mockUnlink = vi.mocked(fs.unlink);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("install", () => {
  it("succeeds when original launcher exists", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockRename.mockResolvedValue(undefined);
    mockCopyFile.mockResolvedValue(undefined);

    const result = await install("/game");

    expect(result.success).toBe(true);
    expect(result.originalRenamed).toBe(true);
    expect(result.exeCopied).toBe(true);
    expect(result.seamlessCoopDetected).toBe(true);
    expect(result.gameDirPath).toBe("/game");
  });

  it("detects when seamless coop is missing", async () => {
    let callCount = 0;
    mockAccess.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error("ENOENT");
    });
    mockRename.mockResolvedValue(undefined);
    mockCopyFile.mockResolvedValue(undefined);

    const result = await install("/game");

    expect(result.success).toBe(true);
    expect(result.seamlessCoopDetected).toBe(false);
  });

  it("fails when original launcher missing", async () => {
    mockAccess.mockRejectedValue(new Error("ENOENT"));

    const result = await install("/game");

    expect(result.success).toBe(false);
    expect(result.originalRenamed).toBe(false);
  });

  it("rolls back on copy failure", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockRename.mockResolvedValue(undefined);
    mockCopyFile.mockRejectedValue(new Error("copy failed"));

    const result = await install("/game");

    expect(result.success).toBe(false);
    expect(result.exeCopied).toBe(false);
    expect(mockRename).toHaveBeenCalledTimes(2);
  });
});

describe("uninstall", () => {
  it("succeeds when replacement and backup exist", async () => {
    mockUnlink.mockResolvedValue(undefined);
    mockAccess.mockResolvedValue(undefined);
    mockRename.mockResolvedValue(undefined);

    const result = await uninstall("/game");

    expect(result.success).toBe(true);
    expect(result.replacementDeleted).toBe(true);
    expect(result.originalRestored).toBe(true);
  });

  it("fails when replacement cannot be deleted", async () => {
    mockUnlink.mockRejectedValue(new Error("ENOENT"));

    const result = await uninstall("/game");

    expect(result.success).toBe(false);
    expect(result.replacementDeleted).toBe(false);
  });

  it("partial fail when backup missing after delete", async () => {
    mockUnlink.mockResolvedValue(undefined);
    mockAccess.mockRejectedValue(new Error("ENOENT"));

    const result = await uninstall("/game");

    expect(result.success).toBe(false);
    expect(result.replacementDeleted).toBe(true);
    expect(result.originalRestored).toBe(false);
  });
});
