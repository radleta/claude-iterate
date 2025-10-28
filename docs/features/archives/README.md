---
# Status Tracking
status: complete
status_summary: Archive feature is implemented and tested

# Ownership
owner: brownfield-migration

# Blocking Issues
blocked_by:

# Summary (for AI and quick scanning)
summary: Save, restore, list, show, and delete workspace archives as compressed tarballs
---

# Archives

## Purpose

Enable users to archive completed workspaces as compressed tarballs for long-term storage and restoration.

## User Stories

- As a user, I want to archive a completed workspace, so that I can preserve it for future reference without cluttering my active workspace directory.
- As a user, I want to restore an archived workspace, so that I can resume work or review past iterations.
- As a user, I want to list all available archives, so that I can see what workspaces I have preserved.
- As a user, I want to view archive details, so that I can verify metadata before restoring.
- As a user, I want to delete old archives, so that I can free up storage space.

## Core Business Logic

- Archives are stored as `.tar.gz` tarballs in the configured archive directory (default: `./claude-iterate/archive/`)
- Archive naming follows format: `{workspace-name}-{ISO-timestamp}` (e.g., `my-task-2025-10-28T14-30-00`)
- Archiving includes all workspace files and embeds metadata (`.archived.json`) inside the tarball
- Restoration removes the embedded `.archived.json` metadata file to return workspace to original state
- Workspaces can be restored to original name or renamed during restoration
- Archive operations prevent conflicts (cannot restore to existing workspace, cannot archive non-existent workspace)
- Legacy directory-based archives are supported for backwards compatibility alongside new tarball format
- Archives are sorted by creation date (newest first) when listed

## Key Constraints

- Archives must be compressed using gzip to minimize storage space
- Metadata must be embedded in tarball for portability (single-file archives)
- Archive directory structure must be identical to original workspace for seamless restoration
- Temporary directories must be cleaned up after archive/restore operations to prevent disk bloat
- Archive names must include ISO timestamps to ensure uniqueness and sortability
- Restoration must validate archive existence before attempting extraction

## CLI Commands

This feature provides the following commands:

- `claude-iterate archive save <name>` - Archive a workspace
- `claude-iterate archive list` - List all archives
- `claude-iterate archive restore <archive> [name]` - Restore an archive
- `claude-iterate archive show <name>` - Show archive details
- `claude-iterate archive delete <name>` - Delete an archive

For full command reference, see [Commands Reference](../../../README.md#commands-reference).

## Document Links

- [Technical Specification](./SPEC.md)
- [Implementation Plan](./PLAN.md)
- [Testing Specification](./TEST.md)
- [Implementation Progress](./TODO.md)
