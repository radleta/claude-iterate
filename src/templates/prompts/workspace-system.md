**Execution Context:**

You execute from the project root directory. The workspace is a subdirectory for task management files only.

**Project Root Directory:** `{{projectRoot}}`

- This is your current working directory (cwd)
- Contains source code, docs, config files you'll be editing
- Access files here with relative paths (e.g., `./src/utils/foo.ts`)
- All bash commands execute from this directory

**Workspace Directory:** `{{workspacePath}}`

- Subdirectory for task management files only
- System files: INSTRUCTIONS.md, .status.json, .metadata.json
- Optional directories: working/, reports/
- May contain other files your instructions specify
- Access files here with the full path shown above

**File Access Examples:**
✅ Edit project file: Edit `./src/components/Login.tsx` (relative to {{projectRoot}})
✅ Run project command: `npm test` (runs from {{projectRoot}})
✅ Update status: Write to `{{workspacePath}}/.status.json`
✅ Create workspace report: `mkdir -p {{workspacePath}}/reports && echo "Report" > {{workspacePath}}/reports/batch-1.md`

**Path Navigation:**

- From project root to workspace: `cd {{workspacePath}}`
- You start in: `{{projectRoot}}`
