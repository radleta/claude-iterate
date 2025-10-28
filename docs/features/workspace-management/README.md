---
# Status Tracking
status: complete
status_summary: Feature is implemented, tested, and deployed

# Ownership
owner: brownfield-migration

# Blocking Issues
blocked_by:

# Summary (for AI and quick scanning)
summary: Create, list, show, clean, and reset workspaces for managing isolated task iteration environments
---

# Workspace Management

## Purpose

Manage isolated task iteration environments with lifecycle operations including creation, listing, inspection, cleanup, and resetting.

## User Stories

- As a user, I want to create a new workspace with custom settings, so that I can start a new automated task with specific iteration limits and execution modes.
- As a user, I want to list all workspaces with their status, so that I can see which tasks are in progress, completed, or have errors.
- As a user, I want to view detailed information about a workspace, so that I can inspect its configuration, progress, and files.
- As a user, I want to clean (delete) a workspace, so that I can remove completed or obsolete tasks from my system.
- As a user, I want to archive a workspace before deletion, so that I can preserve completed work for future reference.
- As a user, I want to reset a workspace's iteration count, so that I can re-run a task without losing its configuration and files.

## Core Business Logic

- Workspaces are isolated directories containing task state, instructions, and progress tracking files
- Each workspace has a unique name validated to contain only letters, numbers, hyphens, and underscores
- Workspace metadata tracks iteration counts (total, setup, execution), status (in_progress, completed, error), and configuration
- Workspaces support two execution modes: loop (incremental progress) and iterative (autonomous sessions)
- Workspace status is determined by `.status.json` file with machine-readable completion signals
- Default workspace directory is `./claude-iterate/workspaces/` (configurable via project/user config)
- Workspace initialization creates directory structure: `INSTRUCTIONS.md`, `TODO.md`, `.metadata.json`, `.status.json`, `working/`
- Clean operation archives workspace before deletion unless `--no-archive` flag is provided
- Reset operation preserves workspace files and configuration but resets iteration counts to zero
- List operation filters workspaces by status (in_progress, completed, error) and displays progress information

## Key Constraints

- Workspace names must be unique within the workspaces directory
- Workspace directories must not already exist when initializing (prevents accidental overwrites)
- Metadata file (`.metadata.json`) must be valid JSON conforming to Zod schema (`MetadataSchema`)
- Clean operation requires `--force` flag in non-interactive mode to prevent accidental deletion
- Workspaces are not .gitignored by design (AI agents treat ignored content differently)
- Pre-commit hook protects workspaces from accidental commits (user must configure `git config core.hooksPath .githooks`)

## CLI Commands

This feature provides the following commands:

- `claude-iterate init <name>` - Initialize workspace
- `claude-iterate list` - List workspaces
- `claude-iterate show <name>` - Show workspace details
- `claude-iterate clean <name>` - Delete workspace (with optional archive)
- `claude-iterate reset <name>` - Reset iteration counts

For full command reference, see [Commands Reference](../../../README.md#commands-reference).

## Document Links

- [Technical Specification](./SPEC.md)
- [Implementation Plan](./PLAN.md)
- [Testing Specification](./TEST.md)
- [Implementation Progress](./TODO.md)
