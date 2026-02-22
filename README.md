# Nightreign Seamless-to-Steam

```bash
          ⢸⡇
          ⢸⡇
        ⠤⣤⣼⣧⣤⠤
        ⡀⠈⢸⡇
        ⢀⣷⢸⡇⣧
       ⣠⣿⣿⢸⡇⣿⣷⡀
      ⣴⣿⣿⣿⢸⡇⣿⣿⣿⣦
     ⣾⣿⣿⣿⣿⢸⡇⣿⣿⣿⣿⣷
     ⣿⣿⣿⣿⣿⢸⡇⣿⣿⣿⣿⣿
     ⣿⣿⣿⣿⣿⢸⡇⣿⣿⣿⣿⣿
     ⠸⣿⣿⣿⣿⢸⡇⣿⣿⣿⣿⠇
    ⣀⠝⡛⢁⡴⢉⠗⠛⢰⣶⣯⢠⠺ ⠈⢥⠰⡀
 ⣠⣴⢿⣿⡟⠷⠶⣶⣵⣲⡀⣨⣿⣆⡬⠖⢛⣶⣼⡗⠈⠢
⢰⣹⠭⠽⢧⠅⢂⣳⠛⢿⡽⣿⢿⡿⢟⣟⡻⢾⣿⣿⡤⢴⣶⡃
```

## Description

Simple CLI tool that helps users keep one single savegame between SeamlessCoop and Steam for Elden Ring Nightreign.

## Requirements

- [Bun](https://bun.sh/) (for development)
- Windows (for running with actual save files)

## Commands

```bash
# Install dependencies
bun install

# Run locally
bun run dev

# Type-check
bun run check

# Build Windows executable
bun run build
```

## Usage

### Interactive mode (default)

```bash
bun run dev
```

The tool will detect your save files and present a menu to choose the conversion direction.

### Non-interactive mode

```bash
# Convert SeamlessCoop save to Steam
bun run dev -- --to-steam

# Convert Steam save to SeamlessCoop
bun run dev -- --to-coop
```

### Development mode

```bash
bun run dev -- --test
bun run dev -- --test --to-steam
bun run dev -- --test --to-coop
```

## Pending work

### Automatization

1. Detect if Nightreign and Seamless are installed
2. Create softlinks in Desktop with arguments to run both but adding script execution
3. If the user executes Steam's softlink, it should copy from co2 to sl2
4. If the user executes Seamless' softlink, it should copy from sl2 to co2

### Notifications

1. Integrate with Windows notification system

## UI

1. Implement UI with buttons if the user opens the program directly

## UI - Icons

1. Add icons

## Alternative to Automatization

1. Instead of creating two different launchers to the user, modify only Steam's launcher
2. When the user opens Nightreign, it should show a message asking the user to choose one version
3. Continue in Automatization#3

## Research

1. Is there a way to sign the app as safe to run and avoid windows alert?

## Final goal

User opens Nightreign from steam, a modal appears and asks if wants to play official version of seamless version.
Independently of the version that the user chooses to play, the system checks savegame files and creates a new version.
Also the modal offers to open the savegame folder so the user can backup manually, or there is also a button to backup automatically and send to Desktop.
The user can rollback to any version, or even maintain multiple savegames.
The system reads the savegame metadata to display useful information like name, characters and played hours.
Users can download savegames from other players and implement it easily.

### Logo image

Image copied from <https://www.deviantart.com/fathomir/art/Dark-Souls-Bonfire-Pixeled-594782264>
