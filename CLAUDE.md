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

## Development Workflow

### Server Management
**IMPORTANT**: Never restart servers automatically. Always ask the user to restart them.

When server changes are made:
1. Ask user to stop the current server (usually `kill -TERM <pid>` or Ctrl+C)
2. Ask user to restart with: `cd server && npm start`
3. Server runs on port 3001 and serves Gradescope API endpoints

**Reason**: Automated server restarts cause hanging and timeout issues.