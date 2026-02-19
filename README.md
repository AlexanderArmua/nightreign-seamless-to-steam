# Nightreign Seamless-to-Steam

## Commands
```bash
# Start
npm install
# Test 
npm run dev
# Build
npm run build
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
2. When the user opens Nightreign, it should show a message asking the user to choos one version
3. Continue in Automatization#3

## Research
1. Is there a way to sign the app as safe to run and avoid windows alert?
