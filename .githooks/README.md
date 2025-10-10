# Git Hooks

This directory contains git hooks for the claude-iterate project.

## Setup

To enable these hooks, run one of the following commands from the project root:

### Option 1: Configure git to use this hooks directory (recommended)

```bash
git config core.hooksPath .githooks
```

This tells git to use the `.githooks/` directory instead of `.git/hooks/`.

### Option 2: Copy hooks manually

```bash
cp .githooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Available Hooks

### pre-commit

Prevents committing:
- **Workspace files** (`scratch/`, `claude-iterate/workspaces/`)
  - These contain temporary iteration state and should not be version controlled
  - These files are intentionally NOT in `.gitignore` so Claude can access them
  - The git hook provides protection against accidental commits

## Bypassing Hooks

If you need to bypass the pre-commit hook (not recommended), use:

```bash
git commit --no-verify
```

Only do this if you're absolutely certain the files should be committed.
