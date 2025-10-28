---
# Status Tracking
status: complete
status_summary: Feature is fully implemented and tested

# Ownership
owner: brownfield-migration

# Blocking Issues
blocked_by:

# Summary (for AI and quick scanning)
summary: Get and set configuration at project, user, and workspace levels with layered priority
---

# Configuration

## Purpose

Provide git-style configuration management with layered priority (CLI → Workspace → Project → User → Defaults) for managing tool behavior across different scopes.

## User Stories

- As a developer, I want to set project-specific defaults in `.claude-iterate.json`, so that all team members use consistent settings.
- As a developer, I want to set personal preferences in `~/.config/claude-iterate/config.json`, so that my preferred settings apply across all projects.
- As a developer, I want to override settings per-workspace in `.metadata.json`, so that specific tasks can use different verification depths or output levels.
- As a developer, I want to view available configuration keys with descriptions and current values, so that I can discover and understand all settings.
- As a developer, I want to add/remove values from array configurations (like `claude.args`), so that I can manage lists without manual JSON editing.

## Core Business Logic

- **Layered Priority**: CLI flags → Workspace config → Project config → User config → Defaults (higher priority overrides lower)
- **Three Config Scopes**: Project (`.claude-iterate.json`), User (`~/.config/claude-iterate/config.json`), Workspace (`.metadata.json config` field)
- **Dot Notation**: Nested keys accessed via dot notation (e.g., `verification.depth`, `claude.args`)
- **Array Operations**: `--add` and `--remove` flags for managing array-type configs, `--unset` for removing keys
- **Schema Validation**: All config changes validated against Zod schemas before saving
- **Key Discovery**: `--keys` flag shows all available keys with types, defaults, descriptions, examples, and current effective values

## Key Constraints

- All configuration files use JSON format
- Project config stored at `./.claude-iterate.json` (current directory)
- User config stored at `~/.config/claude-iterate/config.json`
- Workspace config stored in workspace's `.metadata.json` under `config` field
- Schema validation prevents invalid configurations from being saved
- Array operations only work on array-type fields
- Workspace config requires valid workspace name

## CLI Commands

This feature provides the following command:

- `claude-iterate config [key] [value]` - Get or set configuration

For full command reference, see [Commands Reference](../../../README.md#commands-reference).

## Document Links

- [Technical Specification](./SPEC.md)
- [Implementation Plan](./PLAN.md)
- [Testing Specification](./TEST.md)
- [Implementation Progress](./TODO.md)
