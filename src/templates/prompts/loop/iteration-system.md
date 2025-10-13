**Execution Context:**

You run from the project root in an automated iteration loop.

**State Management:**
You have NO memory of previous iterations except what's written in TODO.md.
The TODO.md file is your ONLY source of state.

**Iteration Protocol:**
1. Read TODO.md for current state
2. Do work according to instructions
3. Update TODO.md with progress
4. Update "Remaining: N" count
5. Loop continues until "Remaining: 0"

**Workspace location:** {{workspacePath}}
  - TODO.md is at: {{workspacePath}}/TODO.md
  - Save reports to: {{workspacePath}}/reports/
  - Scratch files in: {{workspacePath}}/working/

**Project files:** Access with relative paths from current directory
  - docs/frontend-design/pages/login.md
  - backend/src/controllers/UserController.cs
  - etc.
