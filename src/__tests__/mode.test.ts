import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs", () => ({
  default: {
    statSync: vi.fn(),
  },
}));

vi.mock("fs/promises", () => ({
  default: {
    access: vi.fn(),
  },
}));

vi.mock("../config.js", () => ({
  BACKUP_LAUNCHER_NAME: "start_protected_game_original.exe",
  SEAMLESS_COOP_LAUNCHER_NAME: "nrsc_launcher.exe",
}));

import fsSync from "fs";
import fs from "fs/promises";
import { detectMode, getLauncherContext } from "../mode.js";

const mockStatSync = vi.mocked(fsSync.statSync);
const mockAccess = vi.mocked(fs.access);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("detectMode", () => {
  it('returns "launcher" when backup file exists', () => {
    mockStatSync.mockReturnValue({ isFile: () => true } as any);
    expect(detectMode()).toBe("launcher");
  });

  it('returns "standalone" when backup is not a file', () => {
    mockStatSync.mockReturnValue({ isFile: () => false } as any);
    expect(detectMode()).toBe("standalone");
  });

  it('returns "standalone" when stat throws', () => {
    mockStatSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    expect(detectMode()).toBe("standalone");
  });
});

describe("getLauncherContext", () => {
  it("detects seamless coop when present", async () => {
    mockAccess.mockResolvedValue(undefined);

    const ctx = await getLauncherContext();

    expect(ctx.hasSeamlessCoop).toBe(true);
    expect(ctx.gameDir).toBeTruthy();
  });

  it("detects seamless coop missing", async () => {
    mockAccess.mockRejectedValue(new Error("ENOENT"));

    const ctx = await getLauncherContext();

    expect(ctx.hasSeamlessCoop).toBe(false);
  });
});
