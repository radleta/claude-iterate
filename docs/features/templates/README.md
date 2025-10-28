---
# Status Tracking
status: complete
status_summary: Feature fully implemented and tested

# Ownership
owner: brownfield-migration

# Blocking Issues
blocked_by:

# Summary (for AI and quick scanning)
summary: Save, use, list, and show reusable workspace templates with project and global storage
---

# Templates

## Purpose

Save successful workspaces as reusable templates with metadata for project-specific or global storage.

## User Stories

- As a developer, I want to save a workspace as a template, so that I can reuse successful workflows for similar tasks.
- As a developer, I want to create new workspaces from templates, so that I can quickly start tasks with proven instructions and configuration.
- As a developer, I want to list available templates, so that I can discover and select appropriate templates for my task.
- As a developer, I want to view template details, so that I can understand what each template provides before using it.
- As a developer, I want to save templates globally, so that I can reuse them across all projects on my system.

## Core Business Logic

- Templates are saved from existing workspaces that have valid INSTRUCTIONS.md files
- Templates consist of INSTRUCTIONS.md, .template.json metadata, and optional README.md
- Template metadata includes: name, description, tags, estimated iterations, workspace configuration (mode, maxIterations, delay)
- Templates can be stored in project-specific directory (`./claude-iterate/templates/`) or global directory (`~/.config/claude-iterate/templates/`)
- Project templates take precedence over global templates when names conflict
- Templates with existing names require `--force` flag to overwrite
- When using a template, workspace configuration (mode, maxIterations, delay) is copied to new workspace metadata

## Key Constraints

- Template source workspace must have INSTRUCTIONS.md (workspaces without instructions cannot be saved as templates)
- Template names must be valid directory names (no special characters like `/`, `\`, `:`)
- Templates cannot be used if they don't exist (validation before workspace creation)
- Force flag required to overwrite existing templates (prevents accidental overwrites)
- Global templates require write access to user config directory (~/.config/claude-iterate/)

## CLI Commands

This feature provides the following commands:

- `claude-iterate template save <workspace> [name]` - Save workspace as template
- `claude-iterate template use <name> <workspace>` - Create workspace from template
- `claude-iterate template list` - List available templates
- `claude-iterate template show <name>` - Show template details

For full command reference, see [Commands Reference](../../../README.md#commands-reference).

## Document Links

- [Technical Specification](./SPEC.md)
- [Implementation Plan](./PLAN.md)
- [Testing Specification](./TEST.md)
- [Implementation Progress](./TODO.md)
