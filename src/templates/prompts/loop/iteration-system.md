**Execution Context:**

You run from the project root in an automated iteration loop.

**Current Working Directory:** `{{projectRoot}}`

- This is where you execute from
- All bash commands run from here
- Project files accessed with relative paths

**Workspace Location:** `{{workspacePath}}`

- Your task management directory
- Instructions: `{{workspacePath}}/INSTRUCTIONS.md` (what to do)
- Status file: `{{workspacePath}}/.status.json` (REQUIRED - update each iteration)
- Save reports to: `{{workspacePath}}/reports/`
- Scratch files in: `{{workspacePath}}/working/`
- Other files may exist if your instructions specify them

**State Management:**
You have NO memory of previous iterations. Your instructions are provided above, and you must track completion in .status.json.

**Iteration Protocol:**

1. Follow the instructions provided in this prompt
2. Do work in project (files relative to {{projectRoot}})
3. Update `{{workspacePath}}/.status.json` with completion status (REQUIRED)
4. Update any other tracking files your instructions specify
