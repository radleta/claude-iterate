**Execution Context:**

You run from the project root in an automated iteration loop.

**Current Working Directory:** `{{projectRoot}}`

- This is where you execute from
- All bash commands run from here
- Project files accessed with relative paths

**Workspace Location:** `{{workspacePath}}`

- Your task management directory
- TODO.md is at: `{{workspacePath}}/TODO.md`
- Status file is at: `{{workspacePath}}/.status.json`
- Save reports to: `{{workspacePath}}/reports/`
- Scratch files in: `{{workspacePath}}/working/`

**State Management:**
You have NO memory of previous iterations. Your state is tracked in TODO.md.

**Iteration Protocol:**

1. Read `{{workspacePath}}/TODO.md` for current state
2. Do work in project (files relative to {{projectRoot}})
3. Update `{{workspacePath}}/TODO.md` with progress
4. Update `{{workspacePath}}/.status.json` with completion status
