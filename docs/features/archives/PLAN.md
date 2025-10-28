---
# Plan Status
status: complete
status_summary: All implementation tasks completed
summary: Implementation plan for archives feature
plan_mode: checklist
total_tasks: 28
completed_tasks: 28
---

# Implementation Plan: Archives

This document lists the implementation tasks for the archives feature. All tasks are complete as this is a brownfield documentation effort.

## Phase 1: Type Definitions

- [x] Create `src/types/archive.ts` with Zod schema
- [x] Define `ArchiveMetadata` interface with originalName, archiveName, archivedAt, archivedFrom
- [x] Export `ArchiveMetadataSchema` for validation
- [x] Add JSDoc comments for type documentation

## Phase 2: Archive Manager Core

- [x] Create `src/core/archive-manager.ts` class
- [x] Implement constructor with archiveDir and workspacesDir parameters
- [x] Add tar package dependency for compression
- [x] Implement archive naming convention with ISO timestamp
- [x] Add crypto.randomBytes for secure temp directory names

## Phase 3: Archive Operation

- [x] Implement `archive(workspaceName: string): Promise<string>` method
- [x] Add workspace existence validation
- [x] Implement archive directory creation (ensureDir)
- [x] Generate archive name with ISO timestamp format
- [x] Create temporary directory for staging
- [x] Copy workspace to temp directory
- [x] Create .archived.json metadata file with schema validation
- [x] Create .tar.gz tarball using tar.create()
- [x] Clean up temporary directory in finally block
- [x] Return archive name (without .tar.gz)

## Phase 4: List Archives Operation

- [x] Implement `listArchives(): Promise<Array<{name, metadata}>>` method
- [x] Handle missing archive directory (return empty array)
- [x] Read directory entries with withFileTypes option
- [x] Filter for .tar.gz files (new format)
- [x] Filter for directories with .archived.json (legacy format)
- [x] Implement `extractMetadataFromTarball()` helper method
- [x] Extract only .archived.json from tarball (filter optimization)
- [x] Validate metadata with ArchiveMetadataSchema
- [x] Skip invalid archives gracefully
- [x] Sort archives by archivedAt descending (newest first)

## Phase 5: Restore Operation

- [x] Implement `restore(archiveName, newWorkspaceName?): Promise<string>` method
- [x] Support both .tar.gz and legacy directory formats
- [x] Extract metadata to determine original name
- [x] Determine target workspace name (parameter or original)
- [x] Validate workspace does not already exist
- [x] Create temporary directory for extraction
- [x] Extract tarball to temp directory using tar.extract()
- [x] Copy extracted workspace to workspaces directory
- [x] Remove .archived.json metadata file from restored workspace
- [x] Clean up temp directory in finally block
- [x] Return restored workspace name

## Phase 6: Archive Details Operation

- [x] Implement `getArchive(archiveName): Promise<{name, metadata, path}>` method
- [x] Check for .tar.gz tarball first (new format)
- [x] Fallback to legacy directory format
- [x] Extract metadata using extractMetadataFromTarball()
- [x] Return archive details with full path
- [x] Throw error if archive not found

## Phase 7: Delete Operation

- [x] Implement `delete(archiveName): Promise<void>` method
- [x] Check for .tar.gz tarball first
- [x] Fallback to legacy directory format
- [x] Remove archive file or directory
- [x] Throw error if archive not found

## Phase 8: Helper Methods

- [x] Implement `exists(archiveName): Promise<boolean>` method
- [x] Check for both .tar.gz and legacy directory formats
- [x] Return boolean without throwing errors

## Phase 9: CLI Commands

- [x] Create `src/commands/archive.ts` with Commander.js
- [x] Implement `archive save <workspace> [--keep]` command
- [x] Implement `archive list` command with `ls` alias
- [x] Implement `archive restore <archive> [workspace]` command
- [x] Implement `archive show <archive>` command
- [x] Implement `archive delete <archive> [--force]` command with `rm` alias
- [x] Add Logger integration for colored output
- [x] Add emoji indicators (📦, 📂, 📅, 📁) for visual clarity
- [x] Implement confirmation prompt for delete without --force
- [x] Add helpful next steps after restore operation
- [x] Integrate with ConfigManager for directory paths
- [x] Remove workspace after archive unless --keep specified

## Phase 10: Testing

- [x] Create `tests/unit/archive-manager.test.ts`
- [x] Add beforeEach/afterEach for temp directory management
- [x] Test archive() creates .tar.gz tarball
- [x] Test archive() throws for non-existent workspace
- [x] Test archive() creates valid metadata
- [x] Test listArchives() returns all archives
- [x] Test listArchives() returns empty array when no archives
- [x] Test listArchives() sorts by date (newest first)
- [x] Test listArchives() skips invalid archives
- [x] Test restore() restores workspace content
- [x] Test restore() to different name
- [x] Test restore() removes .archived.json
- [x] Test restore() throws for non-existent archive
- [x] Test restore() throws for existing workspace
- [x] Test restore() preserves file content
- [x] Test getArchive() returns metadata and path
- [x] Test getArchive() throws for non-existent archive
- [x] Test delete() removes archive
- [x] Test delete() throws for non-existent archive
- [x] Test exists() returns true/false correctly
- [x] Achieve ≥80% code coverage

## Notes

### Key Decisions

**Use tarball format over directory format**

- **Date:** Initial implementation (v2.2.0)
- **Context:** Need efficient, portable archive storage
- **Decision:** Use .tar.gz tarballs with embedded metadata
- **Rationale:** Single-file archives are more portable, gzip compression saves 60-80% space, industry standard format
- **Backwards Compatibility:** Legacy directory format still supported for existing archives

**Embed metadata inside tarball**

- **Date:** Initial implementation (v2.2.0)
- **Context:** Need archive metadata for listing without full extraction
- **Decision:** Include .archived.json inside tarball, extract only that file for list operations
- **Rationale:** Self-contained archives (single file), tar filter feature allows efficient metadata-only extraction
- **Alternative Considered:** Separate metadata file - rejected due to two-file requirement and sync issues

**Remove .archived.json on restore**

- **Date:** Initial implementation (v2.2.0)
- **Context:** Restored workspace should match original state
- **Decision:** Remove .archived.json after extraction to workspaces directory
- **Rationale:** Metadata is for archive management only, workspace should not contain archive artifacts
- **Alternative Considered:** Keep metadata - rejected to maintain clean workspace state

### Testing Strategy

- **Unit Tests:** All ArchiveManager methods tested with mocked filesystem
- **Integration Tests:** CLI commands tested end-to-end (not yet implemented)
- **Coverage Target:** ≥80% line coverage, all branches covered
- **Test Data:** Temporary directories created/cleaned per test
- **Edge Cases:** Invalid archives, missing files, concurrent operations
