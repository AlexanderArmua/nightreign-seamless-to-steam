import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatFileSize,
  formatRelativeTime,
  printConversionResult,
  printInstallResult,
  printUninstallResult,
  printModInstallResult,
  success,
  warning,
  error,
  info,
  printBanner,
  COLORS,
  promptConversionChoice,
  promptStandaloneMenu,
  promptLauncherMenu,
  promptZipSelection,
} from "../cli.js";

describe("success/warning/error/info", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("success prints green message", () => {
    success("ok");
    expect(console.log).toHaveBeenCalledWith(`${COLORS.green}ok${COLORS.reset}`);
  });

  it("warning prints yellow message", () => {
    warning("warn");
    expect(console.log).toHaveBeenCalledWith(`${COLORS.yellow}warn${COLORS.reset}`);
  });

  it("error prints red message to stderr", () => {
    error("err");
    expect(console.error).toHaveBeenCalledWith(`${COLORS.red}err${COLORS.reset}`);
  });

  it("info prints white message", () => {
    info("msg");
    expect(console.log).toHaveBeenCalledWith(`${COLORS.white}msg${COLORS.reset}`);
  });
});

describe("printBanner", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints welcome banner", () => {
    printBanner();
    expect(console.log).toHaveBeenCalledTimes(1);
    const output = (console.log as any).mock.calls[0][0];
    expect(output).toContain("Welcome to Save Manager");
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(2048)).toBe("2.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1048576)).toBe("1.0 MB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("formatRelativeTime", () => {
  it("shows seconds for < 60s", () => {
    const date = new Date(Date.now() - 30_000);
    expect(formatRelativeTime(date)).toBe("30s ago");
  });

  it("shows minutes for < 60m", () => {
    const date = new Date(Date.now() - 5 * 60_000);
    expect(formatRelativeTime(date)).toBe("5m ago");
  });

  it("shows hours for >= 60m", () => {
    const date = new Date(Date.now() - 2 * 60 * 60_000);
    expect(formatRelativeTime(date)).toBe("2h ago");
  });
});

describe("printConversionResult", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints success for mainConverted + bakConverted", () => {
    printConversionResult({
      mainConverted: true,
      bakConverted: true,
      fromExt: ".sl2",
      toExt: ".co2",
    });
    expect(console.log).toHaveBeenCalledTimes(2);
    expect((console.log as any).mock.calls[0][0]).toContain("NR0000.sl2 -> NR0000.co2");
  });

  it("prints error when main not converted", () => {
    printConversionResult({
      mainConverted: false,
      bakConverted: false,
      fromExt: ".sl2",
      toExt: ".co2",
    });
    expect(console.error).toHaveBeenCalled();
  });

  it("prints warning when bak not converted", () => {
    printConversionResult({
      mainConverted: true,
      bakConverted: false,
      fromExt: ".co2",
      toExt: ".sl2",
    });
    // first call is success for main, second is warning for bak
    expect(console.log).toHaveBeenCalledTimes(2);
    expect((console.log as any).mock.calls[1][0]).toContain("Warning");
  });
});

describe("printInstallResult", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints success with all flags", () => {
    printInstallResult({
      success: true,
      gameDirPath: "/game",
      originalRenamed: true,
      exeCopied: true,
      seamlessCoopDetected: true,
    });
    expect(console.log).toHaveBeenCalled();
    const allOutput = (console.log as any).mock.calls.map((c: any) => c[0]).join("\n");
    expect(allOutput).toContain("installed successfully");
    expect(allOutput).toContain("Seamless Coop launcher detected");
  });

  it("prints warning when seamless coop not detected", () => {
    printInstallResult({
      success: true,
      gameDirPath: "/game",
      originalRenamed: true,
      exeCopied: true,
      seamlessCoopDetected: false,
    });
    const allOutput = (console.log as any).mock.calls.map((c: any) => c[0]).join("\n");
    expect(allOutput).toContain("Seamless Coop launcher not found");
  });

  it("prints failure when original not renamed", () => {
    printInstallResult({
      success: false,
      gameDirPath: "/game",
      originalRenamed: false,
      exeCopied: false,
      seamlessCoopDetected: false,
    });
    expect(console.error).toHaveBeenCalled();
    const allErrors = (console.error as any).mock.calls.map((c: any) => c[0]).join("\n");
    expect(allErrors).toContain("Installation failed");
  });

  it("prints failure when exe not copied", () => {
    printInstallResult({
      success: false,
      gameDirPath: "/game",
      originalRenamed: true,
      exeCopied: false,
      seamlessCoopDetected: false,
    });
    const allErrors = (console.error as any).mock.calls.map((c: any) => c[0]).join("\n");
    expect(allErrors).toContain("Could not copy");
  });
});

describe("printUninstallResult", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints success", () => {
    printUninstallResult({
      success: true,
      gameDirPath: "/game",
      replacementDeleted: true,
      originalRestored: true,
    });
    const allOutput = (console.log as any).mock.calls.map((c: any) => c[0]).join("\n");
    expect(allOutput).toContain("uninstalled successfully");
  });

  it("prints failure when replacement not deleted", () => {
    printUninstallResult({
      success: false,
      gameDirPath: "/game",
      replacementDeleted: false,
      originalRestored: false,
    });
    const allErrors = (console.error as any).mock.calls.map((c: any) => c[0]).join("\n");
    expect(allErrors).toContain("Could not remove");
  });

  it("prints failure when original not restored", () => {
    printUninstallResult({
      success: false,
      gameDirPath: "/game",
      replacementDeleted: true,
      originalRestored: false,
    });
    const allErrors = (console.error as any).mock.calls.map((c: any) => c[0]).join("\n");
    expect(allErrors).toContain("Could not restore");
  });
});

describe("printModInstallResult", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints success with launcher found", () => {
    printModInstallResult({
      success: true,
      zipPath: "/zip",
      gameDir: "/game",
      launcherFound: true,
    });
    const allOutput = (console.log as any).mock.calls.map((c: any) => c[0]).join("\n");
    expect(allOutput).toContain("installed successfully");
    expect(allOutput).toContain("NRSC_launcher.exe found");
  });

  it("prints success with launcher not found", () => {
    printModInstallResult({
      success: true,
      zipPath: "/zip",
      gameDir: "/game",
      launcherFound: false,
    });
    const allOutput = (console.log as any).mock.calls.map((c: any) => c[0]).join("\n");
    expect(allOutput).toContain("NRSC_launcher.exe not found");
  });

  it("prints failure with error", () => {
    printModInstallResult({
      success: false,
      zipPath: "/zip",
      gameDir: "/game",
      launcherFound: false,
      error: "extraction failed",
    });
    const allErrors = (console.error as any).mock.calls.map((c: any) => c[0]).join("\n");
    expect(allErrors).toContain("installation failed");
    expect(allErrors).toContain("extraction failed");
  });

  it("prints failure without error detail", () => {
    printModInstallResult({
      success: false,
      zipPath: "/zip",
      gameDir: "/game",
      launcherFound: false,
    });
    const allErrors = (console.error as any).mock.calls.map((c: any) => c[0]).join("\n");
    expect(allErrors).toContain("installation failed");
  });
});

describe("promptConversionChoice", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when no save files available", async () => {
    const result = await promptConversionChoice({
      targetDir: "/dir",
      steamIdFolder: "123",
      hasSteamSave: false,
      hasCoopSave: false,
      files: [],
    });
    expect(result).toBeNull();
    const errOutput = (console.error as any).mock.calls.map((c: any) => c[0]).join("\n");
    expect(errOutput).toContain("No save files available");
  });
});
