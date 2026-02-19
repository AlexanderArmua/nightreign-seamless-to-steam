import fs from "fs/promises";
import path from "path";
import { BASE_SAVE_NAME, SAVE_FORMATS } from "./config.js";
import { info, success } from "./cli.js";
import type { SaveDirectoryState } from "./types.js";

const MOCK_STEAM_ID = "123456789";
const TEST_DIR_NAME = "test-saves";

export async function createTestEnvironment(): Promise<SaveDirectoryState> {
  const testDir = path.join(process.cwd(), TEST_DIR_NAME, MOCK_STEAM_ID);

  await fs.mkdir(testDir, { recursive: true });

  const steamFile = `${BASE_SAVE_NAME}${SAVE_FORMATS.steam.extension}`;
  const coopFile = `${BASE_SAVE_NAME}${SAVE_FORMATS.coop.extension}`;
  const steamPath = path.join(testDir, steamFile);
  const coopPath = path.join(testDir, coopFile);

  // Create mock save files if they don't already exist
  let createdFiles = false;
  try {
    await fs.access(steamPath);
  } catch {
    await fs.writeFile(steamPath, "mock-steam-save-data");
    createdFiles = true;
  }

  try {
    await fs.access(coopPath);
  } catch {
    await fs.writeFile(coopPath, "mock-coop-save-data");
    createdFiles = true;
  }

  if (createdFiles) {
    success(`[+] Created test environment in ./${TEST_DIR_NAME}/${MOCK_STEAM_ID}/`);
  } else {
    info(`[+] Using existing test environment in ./${TEST_DIR_NAME}/${MOCK_STEAM_ID}/`);
  }

  const files = await fs.readdir(testDir);
  const hasSteamSave = files.includes(steamFile);
  const hasCoopSave = files.includes(coopFile);

  return {
    targetDir: testDir,
    steamIdFolder: MOCK_STEAM_ID,
    hasSteamSave,
    hasCoopSave,
    files,
  };
}
