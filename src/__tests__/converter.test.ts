import { describe, it, expect, vi, beforeEach } from "vitest";
import { convert } from "../converter.js";

vi.mock("fs/promises", () => {
  const files: Record<string, Buffer> = {};
  const stats: Record<string, { isFile: () => boolean }> = {};

  return {
    default: {
      stat: vi.fn(async (p: string) => {
        if (stats[p]) return stats[p];
        return { isFile: () => true };
      }),
      unlink: vi.fn(async () => {}),
      copyFile: vi.fn(async (src: string) => {
        if (files[src] === undefined) {
          // Check if the file "exists" for our test
          const err = new Error(`ENOENT: no such file or directory '${src}'`) as NodeJS.ErrnoException;
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
    },
  };
});

import fs from "fs/promises";

const mockFs = fs as any;

beforeEach(() => {
  vi.clearAllMocks();
  mockFs._clearFiles();
  mockFs._clearStats();
});

describe("convert", () => {
  it("converts steam to coop: deletes non-protected files and copies", async () => {
    mockFs._setFiles({
      "/backup/NR0000.sl2": Buffer.from("data"),
      "/backup/NR0000.sl2.bak": Buffer.from("bak"),
    });

    const result = await convert(
      "/target",
      "/backup",
      ["NR0000.sl2", "NR0000.sl2.bak", "steam_autocloud.vdf"],
      { from: "steam", to: "coop" }
    );

    expect(result.mainConverted).toBe(true);
    expect(result.bakConverted).toBe(true);
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

    const result = await convert(
      "/target",
      "/backup",
      ["NR0000.co2"],
      { from: "coop", to: "steam" }
    );

    expect(result.mainConverted).toBe(true);
    expect(result.bakConverted).toBe(false);
    expect(result.fromExt).toBe(".co2");
    expect(result.toExt).toBe(".sl2");
  });

  it("returns mainConverted false when main file missing", async () => {
    // No files set = all copyFile calls throw
    const result = await convert(
      "/target",
      "/backup",
      [],
      { from: "steam", to: "coop" }
    );

    expect(result.mainConverted).toBe(false);
    expect(result.bakConverted).toBe(false);
  });

  it("skips directories during cleanup", async () => {
    mockFs._setStats({
      "/target/subdir": { isFile: () => false },
    });

    const result = await convert(
      "/target",
      "/backup",
      ["subdir"],
      { from: "steam", to: "coop" }
    );

    expect(fs.unlink).not.toHaveBeenCalled();
    expect(result.mainConverted).toBe(false);
  });

  it("preserves steam_autocloud.vdf", async () => {
    const result = await convert(
      "/target",
      "/backup",
      ["steam_autocloud.vdf"],
      { from: "steam", to: "coop" }
    );

    expect(fs.stat).not.toHaveBeenCalledWith("/target/steam_autocloud.vdf");
    expect(fs.unlink).not.toHaveBeenCalled();
  });
});
