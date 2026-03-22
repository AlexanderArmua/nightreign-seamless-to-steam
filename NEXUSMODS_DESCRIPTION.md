# NexusMods Description

Copy-paste the sections below into your NexusMods mod page. Adjust the SHA256 hash after each build.

---

## Summary (short description field)

Save Manager for Elden Ring Nightreign — automatically converts save files between Steam (.sl2) and Seamless Co-op (.co2) formats. Creates a timestamped backup before every conversion. Open source.

---

## Description (main body)

### What does this do?

If you play Nightreign with [Seamless Co-op](https://www.nexusmods.com/eldenringnightreign/mods/3), your save files use a different format (.co2) than vanilla Steam saves (.sl2). This tool converts between the two formats so you can switch freely between playing solo/Steam and playing Seamless Co-op — without losing your progress.

### How it works

1. Finds your save files automatically in `%APPDATA%\Nightreign\<YourSteamID>\`
2. **Creates a timestamped backup** of ALL your files before touching anything
3. Renames your save files to the target format (e.g., `NR0000.sl2` → `NR0000.co2`)

That's it. It renames files. No injection, no memory editing, no network calls, no admin privileges required.

### Safety features

- **Backup before every conversion** — A full copy of your save directory is created in `%APPDATA%\Nightreign\backup_<timestamp>\` before any files are modified. If anything goes wrong, your originals are right there.
- **Backup integrity verification** — After copying each file to the backup, the tool verifies the file size matches the original. If the backup is corrupted (e.g., disk full), the conversion is aborted.
- **Pre-validation** — The tool verifies your backup files exist and are accessible BEFORE deleting anything from the save directory. If something is wrong, it stops.
- **Multi-character support** — All your characters (NR0000, NR0001, NR0002, etc.) are converted, not just the first one.
- **Protected files** — `steam_autocloud.vdf` is never touched.
- **Dry run mode** — Run with `--dry-run` to see exactly what the tool would do without modifying any files.
- **Conversion log** — Every conversion writes a detailed log to the backup folder so you can review exactly what happened.
- **Confirmation prompt** — In interactive mode, you must confirm before the conversion runs.

### Verification

**SHA256 hash of SaveManager.exe:**
```
<REPLACE_WITH_ACTUAL_HASH_AFTER_BUILD>
```

To verify your download matches, open PowerShell and run:
```powershell
Get-FileHash .\SaveManager.exe -Algorithm SHA256
```
The hash should match exactly. The tool also displays its own SHA256 hash at startup.

**Open Source:** The full source code is available on [GitHub](https://github.com/AlexanderArmua/nightreign-seamless-to-steam). You can read every line of code, build it yourself, or submit issues.

**VirusTotal:** [Scan results link — upload your build and paste the permalink here]

### Usage

#### Interactive mode (recommended)
Just double-click `SaveManager.exe`. You'll see a menu:
1. **Copy savegames** — Convert between Steam and Co-op formats
2. **Download & Install Seamless Co-op** — Guided mod installation
3. **Install as game launcher** — Replace the Steam launcher so the tool appears when you click "Play"
4. **Uninstall from game launcher** — Restore the original Steam launcher

#### Command line
```
SaveManager.exe --to-steam      # Convert Co-op saves to Steam
SaveManager.exe --to-coop       # Convert Steam saves to Co-op
SaveManager.exe --dry-run       # Preview changes without modifying files
SaveManager.exe --to-steam --dry-run  # Preview a specific conversion
```

#### Launcher mode
If you install Save Manager as the game launcher (option 3 in the menu), it replaces `start_protected_game.exe` in your game directory. When you click "Play" in Steam, Save Manager appears and lets you choose:
- **Classic Nightreign** — Launches the original game (auto-converts saves to .sl2 if needed)
- **Seamless Co-op** — Launches the Co-op mod (auto-converts saves to .co2 if needed)

The original launcher is always backed up as `start_protected_game_original.exe` and can be restored via the Uninstall option.

### Requirements
- Windows
- Elden Ring Nightreign
- [Seamless Co-op mod](https://www.nexusmods.com/eldenringnightreign/mods/3) (for Co-op saves to exist)

### FAQ

**Q: Is this safe? Will I lose my saves?**
A: The tool creates a full backup before every conversion. Your original files are preserved in `%APPDATA%\Nightreign\backup_<timestamp>\`. Even if the tool crashes mid-conversion, your backup is already created. You can also run `--dry-run` first to see what would happen.

**Q: Windows Defender / SmartScreen is blocking the download.**
A: This happens with all unsigned executables from new publishers. You can:
1. Click "More info" → "Run anyway" on the SmartScreen popup
2. Verify the SHA256 hash matches what's posted above
3. Check the [VirusTotal scan results](link)
4. Build it yourself from the [source code](https://github.com/AlexanderArmua/nightreign-seamless-to-steam)

**Q: Can I build this myself?**
A: Yes! Clone the [GitHub repo](https://github.com/AlexanderArmua/nightreign-seamless-to-steam), then:
```
npm install
npm run build
```
This produces `SaveManager.exe` — the exact same binary.

**Q: Does this modify game files?**
A: Only if you choose the "Install as game launcher" option, which replaces `start_protected_game.exe` (with a backup). The save conversion itself only touches files in your `%APPDATA%\Nightreign\` folder, which is your save data — not game files.

**Q: I have multiple Steam accounts. Which one does it use?**
A: If multiple Steam ID folders are detected, the tool shows a menu to let you pick which one to use.

---

## Changelog (for the mod page)

### v2.0.0
- Multi-character support (NR0000, NR0001, etc. — all converted)
- Backup integrity verification (file size check after copy)
- Pre-validation before destructive operations (never deletes without verified backup)
- `--dry-run` mode to preview changes
- Confirmation prompt before conversion
- SHA256 hash displayed at startup for download verification
- Conversion log written to backup directory
- Multiple Steam ID folder detection with user prompt
- Security: PowerShell command injection prevention
- Security: ZIP path traversal protection
- Better error messages for locked files (game running)
- Installer rollback failure reporting
