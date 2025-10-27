**Execution Context:**

You run from the project root. Your current working directory (cwd) is the project root. The workspace directory is for task management only.

**File Location Guidelines:**

When deciding where to create files, use this decision tree:

1. **Project deliverables** (source code, docs, tests, config files) → **Project root** `{{projectRoot}}`
   - Examples: `./src/components/Login.tsx`, `./docs/api.md`, `./tests/login.test.ts`
   - Use relative paths from project root: `./path/to/file`

2. **Task management files** (status, metadata, iteration logs) → **Workspace directory** `{{workspacePath}}`
   - Examples: `.status.json`, `.metadata.json`, `iterate-*.log`
   - Required files - always in workspace directory
   - Use full path: `{{workspacePath}}/.status.json`

3. **Optional reports/summaries** (for user review) → **Workspace reports** `{{workspacePath}}/reports/`
   - Examples: `summary.md`, `batch-results.md`, `migration-log.md`
   - Use full path: `{{workspacePath}}/reports/summary.md`

4. **Temporary/scratch files** (experiments, drafts, working notes) → **Workspace scratch** `{{workspacePath}}/working/`
   - Examples: Draft code, test output, debugging files
   - Use full path: `{{workspacePath}}/working/draft.txt`

**Path Examples:**

✅ **Project deliverables go in project root:**

```bash
# Edit existing project file
Edit ./src/components/Login.tsx

# Create new project file
Write ./docs/api-guide.md

# Run project commands from project root
Bash: cd {{projectRoot}} && npm test
```

✅ **Task tracking goes in workspace directory:**

```bash
# Update status (required every iteration)
Write {{workspacePath}}/.status.json

# Create optional summary report
Write {{workspacePath}}/reports/summary.md
```

✅ **Scratch work goes in workspace scratch space:**

```bash
# Create temporary test file
Write {{workspacePath}}/working/test-output.txt

# Save experimental code
Write {{workspacePath}}/working/draft-implementation.ts
```

❌ **Avoid ambiguous terms:**

- Don't say "working directory" without clarifying which one
- Don't use relative paths for workspace files
- Don't put project deliverables in workspace directories

**Directory Reference:**

| Directory             | Path                         | Purpose                          | Example Files                         |
| --------------------- | ---------------------------- | -------------------------------- | ------------------------------------- |
| **Project root**      | `{{projectRoot}}`            | Your cwd, contains project files | `./src/`, `./docs/`, `./package.json` |
| **Workspace**         | `{{workspacePath}}`          | Task management files            | `INSTRUCTIONS.md`, `.status.json`     |
| **Workspace reports** | `{{workspacePath}}/reports/` | Optional reports (if needed)     | `summary.md`, `results.md`            |
| **Workspace scratch** | `{{workspacePath}}/working/` | Temporary files                  | Drafts, experiments, test output      |

**When in doubt:** Put project deliverables in project root, task tracking in workspace directory.
