import { describe, it, expect, vi, beforeEach } from "vitest";
import { convert } from "../converter.js";

vi.mock("fs/promises", () => {
  const files: Record<string, Buffer> = {};
  const stats: Record<string, { isFile: () => boolean }> = {};
  const accessible: Set<string> = new Set();

  return {
    default: {
      stat: vi.fn(async (p: string) => {
        if (stats[p]) return stats[p];
        return { isFile: () => true };
      }),
      unlink: vi.fn(async () => {}),
      copyFile: vi.fn(async (src: string) => {
        if (files[src] === undefined) {
          const err = new Error(`ENOENT: no such file or directory '${src}'`) as NodeJS.ErrnoException;
          err.code = "ENOENT";
          throw err;
        }
      }),
      access: vi.fn(async (p: string) => {
        if (!accessible.has(p)) {
          const err = new Error(`ENOENT: no such file or directory '${p}'`) as NodeJS.ErrnoException;
          err.code = "ENOENT";
          throw err;
        }
      }),
      _setFiles: (f: Record<string, Buffer>) => Object.assign(files, f),
      _clearFiles: () => {
        for (const k of Object.keys(files)) delete files[k];
      },
      _setStats: (s: Record<string, { isFile: () => boolean }>) => Object.assign(stats, s),
      _clearStats: () => {
        for (const k of Object.keys(stats)) delete stats[k];
      },
      _setAccessible: (paths: string[]) => {
        accessible.clear();
        for (const p of paths) accessible.add(p);
      },
      _clearAccessible: () => accessible.clear(),
    },
  };
});

import fs from "fs/promises";

const mockFs = fs as any;

beforeEach(() => {
  vi.clearAllMocks();
  mockFs._clearFiles();
  mockFs._clearStats();
  mockFs._clearAccessible();
});

describe("convert", () => {
  it("converts steam to coop: deletes non-protected files and copies", async () => {
    mockFs._setFiles({
      "/backup/NR0000.sl2": Buffer.from("data"),
      "/backup/NR0000.sl2.bak": Buffer.from("bak"),
    });
    mockFs._setAccessible(["/backup/NR0000.sl2"]);

    const result = await convert(
      "/target",
      "/backup",
      ["NR0000.sl2", "NR0000.sl2.bak", "steam_autocloud.vdf"],
      { from: "steam", to: "coop" }
    );

    expect(result.files).toHaveLength(1);
    expect(result.files[0].baseName).toBe("NR0000");
    expect(result.files[0].mainConverted).toBe(true);
    expect(result.files[0].bakConverted).toBe(true);
    expect(result.fromExt).toBe(".sl2");
    expect(result.toExt).toBe(".co2");

    // Should not delete protected file
    const unlinkCalls = (fs.unlink as any).mock.calls.map((c: any) => c[0]);
    expect(unlinkCalls).not.toContain(expect.stringContaining("steam_autocloud.vdf"));
    // Should delete non-protected files
    expect(unlinkCalls).toContain("/target/NR0000.sl2");
  });

  it("converts coop to steam", async () => {
    mockFs._setFiles({
      "/backup/NR0000.co2": Buffer.from("data"),
    });
    mockFs._setAccessible(["/backup/NR0000.co2"]);

    const result = await convert(
      "/target",
      "/backup",
      ["NR0000.co2"],
      { from: "coop", to: "steam" }
    );

    expect(result.files).toHaveLength(1);
    expect(result.files[0].mainConverted).toBe(true);
    expect(result.files[0].bakConverted).toBe(false);
    expect(result.fromExt).toBe(".co2");
    expect(result.toExt).toBe(".sl2");
  });

  it("converts multiple save files (NR0000 + NR0001)", async () => {
    mockFs._setFiles({
      "/backup/NR0000.sl2": Buffer.from("save0"),
      "/backup/NR0001.sl2": Buffer.from("save1"),
      "/backup/NR0001.sl2.bak": Buffer.from("bak1"),
    });
    mockFs._setAccessible(["/backup/NR0000.sl2", "/backup/NR0001.sl2"]);

    const result = await convert(
      "/target",
      "/backup",
      ["NR0000.sl2", "NR0001.sl2", "NR0001.sl2.bak"],
      { from: "steam", to: "coop" }
    );

    expect(result.files).toHaveLength(2);
    expect(result.files[0].baseName).toBe("NR0000");
    expect(result.files[0].mainConverted).toBe(true);
    expect(result.files[0].bakConverted).toBe(false);
    expect(result.files[1].baseName).toBe("NR0001");
    expect(result.files[1].mainConverted).toBe(true);
    expect(result.files[1].bakConverted).toBe(true);
  });

  it("throws when no save files with target extension exist", async () => {
    await expect(
      convert("/target", "/backup", [], { from: "steam", to: "coop" })
    ).rejects.toThrow("No save files with extension .sl2 found");
  });

  it("throws when backup file not found (pre-validation)", async () => {
    // File is in the files list but NOT accessible in backup
    await expect(
      convert(
        "/target",
        "/backup",
        ["NR0000.sl2"],
        { from: "steam", to: "coop" }
      )
    ).rejects.toThrow("Backup file NR0000.sl2 not found");
  });

  it("throws with helpful message when file is locked (EACCES)", async () => {
    mockFs._setAccessible(["/backup/NR0000.sl2"]);
    mockFs._setFiles({
      "/backup/NR0000.sl2": Buffer.from("data"),
    });

    const mockUnlink = vi.mocked(fs.unlink);
    mockUnlink.mockRejectedValueOnce(
      Object.assign(new Error("EACCES"), { code: "EACCES" })
    );

    await expect(
      convert(
        "/target",
        "/backup",
        ["NR0000.sl2"],
        { from: "steam", to: "coop" }
      )
    ).rejects.toThrow("file is locked");
  });

  it("skips directories during cleanup", async () => {
    mockFs._setStats({
      "/target/subdir": { isFile: () => false },
    });
    mockFs._setAccessible(["/backup/NR0000.sl2"]);
    mockFs._setFiles({
      "/backup/NR0000.sl2": Buffer.from("data"),
    });

    const result = await convert(
      "/target",
      "/backup",
      ["subdir", "NR0000.sl2"],
      { from: "steam", to: "coop" }
    );

    // unlink called only for NR0000.sl2, not subdir
    const unlinkCalls = (fs.unlink as any).mock.calls.map((c: any) => c[0]);
    expect(unlinkCalls).not.toContain("/target/subdir");
    expect(result.files[0].mainConverted).toBe(true);
  });

  it("preserves steam_autocloud.vdf", async () => {
    mockFs._setAccessible(["/backup/NR0000.sl2"]);
    mockFs._setFiles({
      "/backup/NR0000.sl2": Buffer.from("data"),
    });

    await convert(
      "/target",
      "/backup",
      ["steam_autocloud.vdf", "NR0000.sl2"],
      { from: "steam", to: "coop" }
    );

    expect(fs.stat).not.toHaveBeenCalledWith("/target/steam_autocloud.vdf");
    const unlinkCalls = (fs.unlink as any).mock.calls.map((c: any) => c[0]);
    expect(unlinkCalls).not.toContain("/target/steam_autocloud.vdf");
  });
});
