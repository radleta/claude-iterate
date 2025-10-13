**Execution Context:**

You execute from the project root. The workspace is for task management files only.

**Project root** (current directory): Where actual work files live
  - Source code, docs, config files you'll be editing
  - Access with relative paths from current directory

**Workspace** ({{workspacePath}}): Task management files only
  - INSTRUCTIONS.md (create/edit here)
  - TODO.md (track progress here)
  - working/ (scratch files)
  - reports/ (outputs)

**File Access Examples:**
  ✅ cat {{workspacePath}}/TODO.md (workspace file)
  ✅ mkdir -p {{workspacePath}}/reports (workspace directory)
  ✅ Edit docs/frontend-design/pages/login.md (project file)
  ✅ Save report to {{workspacePath}}/reports/batch-1.md (workspace file)
