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
  it("succeeds on first-time install", async () => {
    // access calls: 1) seamlessCoop=found, 2) backup=NOT found, 3) original=found
    let accessCall = 0;
    mockAccess.mockImplementation(async () => {
      accessCall++;
      if (accessCall === 2) throw new Error("ENOENT"); // backup doesn't exist yet
    });
    mockRename.mockResolvedValue(undefined);
    mockCopyFile.mockResolvedValue(undefined);

    const result = await install("/game");

    expect(result.success).toBe(true);
    expect(result.originalRenamed).toBe(true);
    expect(result.exeCopied).toBe(true);
    expect(result.seamlessCoopDetected).toBe(true);
    expect(result.alreadyInstalled).toBeUndefined();
  });

  it("updates when already installed (skips rename)", async () => {
    // All access calls succeed — backup exists = already installed
    mockAccess.mockResolvedValue(undefined);
    mockCopyFile.mockResolvedValue(undefined);

    const result = await install("/game");

    expect(result.success).toBe(true);
    expect(result.alreadyInstalled).toBe(true);
    expect(result.exeCopied).toBe(true);
    // Should NOT have renamed anything
    expect(mockRename).not.toHaveBeenCalled();
  });

  it("detects when seamless coop is missing", async () => {
    let accessCall = 0;
    mockAccess.mockImplementation(async () => {
      accessCall++;
      // 1) seamlessCoop=NOT found, 2) backup=NOT found, 3) original=found
      if (accessCall === 1 || accessCall === 2) throw new Error("ENOENT");
    });
    mockRename.mockResolvedValue(undefined);
    mockCopyFile.mockResolvedValue(undefined);

    const result = await install("/game");

    expect(result.success).toBe(true);
    expect(result.seamlessCoopDetected).toBe(false);
  });

  it("fails when original launcher missing (first-time install)", async () => {
    // All access calls fail
    mockAccess.mockRejectedValue(new Error("ENOENT"));

    const result = await install("/game");

    expect(result.success).toBe(false);
    expect(result.originalRenamed).toBe(false);
  });

  it("rolls back on copy failure (first-time install)", async () => {
    let accessCall = 0;
    mockAccess.mockImplementation(async () => {
      accessCall++;
      if (accessCall === 2) throw new Error("ENOENT"); // backup doesn't exist
    });
    mockRename.mockResolvedValue(undefined);
    mockCopyFile.mockRejectedValue(new Error("copy failed"));

    const result = await install("/game");

    expect(result.success).toBe(false);
    expect(result.exeCopied).toBe(false);
    expect(result.rollbackFailed).toBeUndefined();
    // rename called twice: original→backup, then backup→original (rollback)
    expect(mockRename).toHaveBeenCalledTimes(2);
  });

  it("reports rollback failure when restore also fails", async () => {
    let accessCall = 0;
    mockAccess.mockImplementation(async () => {
      accessCall++;
      if (accessCall === 2) throw new Error("ENOENT"); // backup doesn't exist
    });
    mockRename
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("restore failed"));
    mockCopyFile.mockRejectedValue(new Error("copy failed"));

    const result = await install("/game");

    expect(result.success).toBe(false);
    expect(result.rollbackFailed).toBe(true);
  });

  it("fails gracefully when update copy fails", async () => {
    // Already installed but copy fails
    mockAccess.mockResolvedValue(undefined);
    mockCopyFile.mockRejectedValue(new Error("copy failed"));

    const result = await install("/game");

    expect(result.success).toBe(false);
    expect(result.alreadyInstalled).toBe(true);
    // Should NOT try to rename/rollback since we didn't touch the backup
    expect(mockRename).not.toHaveBeenCalled();
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
