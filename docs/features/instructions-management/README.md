---
# Status Tracking
status: complete
status_summary: Feature is fully implemented and tested

# Ownership
owner: brownfield-migration

# Blocking Issues
blocked_by:

# Summary (for AI and quick scanning)
summary: Interactively create, edit, and validate workspace instructions for autonomous task execution
---

# Instructions Management

## Purpose

Enable users to interactively create, edit, and validate workspace instructions that guide Claude through autonomous task execution.

## User Stories

- As a user, I want to set up instructions for a new workspace interactively, so that I can clearly define what Claude should accomplish.
- As a user, I want to edit existing instructions in an interactive session, so that I can refine or correct task definitions.
- As a user, I want to validate my instructions against quality criteria, so that I can ensure they are suitable for autonomous execution.

## Core Business Logic

- Setup command launches interactive Claude session to create INSTRUCTIONS.md with guidance on writing effective task instructions
- Edit command launches interactive Claude session to review and improve existing INSTRUCTIONS.md files
- Validate command analyzes INSTRUCTIONS.md against 10 validation criteria (7 required, 3 recommended) and generates detailed report
- All commands use mode-aware prompts (loop vs iterative) to provide context-appropriate guidance
- Instructions must focus on WHAT to accomplish (task goals), never HOW the system works (iteration mechanics)
- Validation criteria check for autonomous execution readiness: clear goals, state awareness, re-runnability, error handling, completion detection
- Setup and edit commands send notifications on success if configured
- All commands increment setup iteration count in workspace metadata

## Key Constraints

- Commands require workspace to exist (initialized via init command)
- Edit and validate require INSTRUCTIONS.md to exist (created via setup)
- All commands require Claude CLI to be installed and available in PATH
- Interactive sessions spawn Claude CLI from project root with workspace system context
- Validation generates report at workspace-path/validation-report.md
- Instructions must never reference "iterations", "loops", or system mechanics

## CLI Commands

This feature provides the following commands:

- `claude-iterate setup <name>` - Create instructions interactively
- `claude-iterate edit <name>` - Modify instructions interactively
- `claude-iterate validate <name>` - Validate instruction quality

For full command reference, see [Commands Reference](../../../README.md#commands-reference).

## Document Links

- [Technical Specification](./SPEC.md)
- [Implementation Plan](./PLAN.md)
- [Testing Specification](./TEST.md)
- [Implementation Progress](./TODO.md)
