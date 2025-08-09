# Claude Development Notes

## Terminology
- **assignments** = **tasks** in code
  - Use "tasks" throughout the codebase for consistency
  - User-facing text can still say "assignments" if needed
  - Reasoning: Shorter, more general term that covers all types of work

## UI/UX Decisions

### Due Page
- **List view** (not cards) for better scanning on mobile
- **Two fields only**: title (truncated) + due date
- **Truncation**: Keep titles concise for mobile screens
- **Reasoning**: Follow Jakob's Law (familiar patterns) and Miller's Law (limit cognitive load)

### Development Order
1. UI/UX first (current)
2. State management
3. API integration  
4. Auth/persistence

## Architecture Notes
- Using Tamagui for UI components
- Expo Router for navigation
- Three main tabs: Due, Grades, Profile

## Git Commit Guidelines
- **Keep it concise**: One line summary, max 50 chars
- **Use conventional commits**: feat:, fix:, refactor:, docs:
- **Be specific but brief**: "add notifications" not "implement comprehensive notification system with push alerts and background services"
- **Bullet points if needed**: Use 2-4 brief bullets for complex changes
- **No verbose explanations**: Let the code speak, commits are for what/why not how

## Development Workflow

### Server Management
**IMPORTANT**: Never restart servers automatically. Always ask the user to restart them.

When server changes are made:
1. Ask user to stop the current server (usually `kill -TERM <pid>` or Ctrl+C)
2. Ask user to restart with: `cd server && npm start`
3. Server runs on port 3001 and serves Gradescope API endpoints

**Reason**: Automated server restarts cause hanging and timeout issues.

### Android APK Build & Testing

To build and test an APK:

1. **Build APK using EAS Build**:
   ```bash
   npx eas build --platform android --profile preview
   ```
   This creates a development APK that can be installed on devices/simulators.

2. **Alternative - Local build** (if EAS doesn't work):
   ```bash
   npx expo run:android
   ```
   Requires Android Studio and SDK setup.

3. **Test on Android Simulator**:
   - Open Android Studio
   - Start an Android Virtual Device (AVD)
   - Install APK: `adb install path/to/your.apk`
   - Or drag APK file to simulator window