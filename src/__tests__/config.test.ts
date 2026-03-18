import { describe, it, expect, vi, beforeEach } from "vitest";

describe("getNightreignDir", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns correct path when APPDATA is set", async () => {
    process.env.APPDATA = "C:\\Users\\Test\\AppData\\Roaming";
    const { getNightreignDir } = await import("../config.js");
    const result = getNightreignDir();
    expect(result).toContain("Nightreign");
    expect(result).toContain("AppData");
  });

  it("throws when APPDATA is not set", async () => {
    delete process.env.APPDATA;
    const { getNightreignDir } = await import("../config.js");
    expect(() => getNightreignDir()).toThrow("APPDATA environment variable not found");
  });
});

import { afterAll } from "vitest";
