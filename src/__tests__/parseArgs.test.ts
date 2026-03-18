import { describe, it, expect } from "vitest";
import { parseArgs } from "../cli.js";

describe("parseArgs", () => {
  it("returns to-steam choice for --to-steam", () => {
    expect(parseArgs(["--to-steam"])).toEqual({
      choice: { from: "coop", to: "steam" },
      testMode: false,
    });
  });

  it("returns to-coop choice for --to-coop", () => {
    expect(parseArgs(["--to-coop"])).toEqual({
      choice: { from: "steam", to: "coop" },
      testMode: false,
    });
  });

  it("returns null choice when no args", () => {
    expect(parseArgs([])).toEqual({ choice: null, testMode: false });
  });

  it("detects --test flag", () => {
    expect(parseArgs(["--test"])).toEqual({ choice: null, testMode: true });
  });

  it("combines --to-steam and --test", () => {
    expect(parseArgs(["--to-steam", "--test"])).toEqual({
      choice: { from: "coop", to: "steam" },
      testMode: true,
    });
  });

  it("ignores unknown args", () => {
    expect(parseArgs(["--unknown", "--foo"])).toEqual({
      choice: null,
      testMode: false,
    });
  });
});
