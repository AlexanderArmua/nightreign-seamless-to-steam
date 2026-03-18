import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs/promises", () => ({
  default: {
    mkdir: vi.fn(),
    stat: vi.fn(),
    copyFile: vi.fn(),
  },
}));

import fs from "fs/promises";
import { createBackup } from "../backup.js";

const mockMkdir = vi.mocked(fs.mkdir);
const mockStat = vi.mocked(fs.stat);
const mockCopyFile = vi.mocked(fs.copyFile);

beforeEach(() => {
  vi.clearAllMocks();
  mockMkdir.mockResolvedValue(undefined as any);
});

describe("createBackup", () => {
  it("creates timestamped backup directory", async () => {
    mockStat.mockResolvedValue({ isFile: () => true } as any);
    mockCopyFile.mockResolvedValue(undefined);

    const result = await createBackup("/appdata/Nightreign/12345", ["NR0000.sl2"]);

    expect(result).toMatch(/backup_\d{4}-\d{2}-\d{2}/);
    expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining("backup_"), { recursive: true });
    expect(mockCopyFile).toHaveBeenCalledTimes(1);
  });

  it("skips directories", async () => {
    mockStat.mockResolvedValue({ isFile: () => false } as any);

    await createBackup("/appdata/Nightreign/12345", ["subdir"]);

    expect(mockCopyFile).not.toHaveBeenCalled();
  });

  it("handles empty file list", async () => {
    const result = await createBackup("/appdata/Nightreign/12345", []);

    expect(mockMkdir).toHaveBeenCalled();
    expect(mockStat).not.toHaveBeenCalled();
    expect(mockCopyFile).not.toHaveBeenCalled();
    expect(result).toContain("backup_");
  });

  it("copies multiple files", async () => {
    mockStat.mockResolvedValue({ isFile: () => true } as any);
    mockCopyFile.mockResolvedValue(undefined);

    await createBackup("/appdata/Nightreign/12345", ["NR0000.sl2", "NR0000.sl2.bak"]);

    expect(mockCopyFile).toHaveBeenCalledTimes(2);
  });
});
