import { describe, it, expect } from "vitest";
import { parseArgs } from "../cli.js";

describe("parseArgs", () => {
  it("returns to-steam choice for --to-steam", () => {
    expect(parseArgs(["--to-steam"])).toEqual({
      choice: { from: "coop", to: "steam" },
      testMode: false,
      dryRun: false,
    });
  });

  it("returns to-coop choice for --to-coop", () => {
    expect(parseArgs(["--to-coop"])).toEqual({
      choice: { from: "steam", to: "coop" },
      testMode: false,
      dryRun: false,
    });
  });

  it("returns null choice when no args", () => {
    expect(parseArgs([])).toEqual({ choice: null, testMode: false, dryRun: false });
  });

  it("detects --test flag", () => {
    expect(parseArgs(["--test"])).toEqual({ choice: null, testMode: true, dryRun: false });
  });

  it("combines --to-steam and --test", () => {
    expect(parseArgs(["--to-steam", "--test"])).toEqual({
      choice: { from: "coop", to: "steam" },
      testMode: true,
      dryRun: false,
    });
  });

  it("ignores unknown args", () => {
    expect(parseArgs(["--unknown", "--foo"])).toEqual({
      choice: null,
      testMode: false,
      dryRun: false,
    });
  });

  it("detects --dry-run flag", () => {
    expect(parseArgs(["--dry-run"])).toEqual({
      choice: null,
      testMode: false,
      dryRun: true,
    });
  });

  it("combines --to-steam and --dry-run", () => {
    expect(parseArgs(["--to-steam", "--dry-run"])).toEqual({
      choice: { from: "coop", to: "steam" },
      testMode: false,
      dryRun: true,
    });
  });
});
