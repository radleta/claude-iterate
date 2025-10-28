---
# Plan Status
status: complete
status_summary: All implementation tasks completed
summary: Implementation plan for Instructions Management
plan_mode: checklist
total_tasks: 23
completed_tasks: 23
---

# Implementation Plan: Instructions Management

This document lists the implementation tasks for the instructions management feature. This is a brownfield documentation effort - all tasks are already complete.

## Phase 1: CLI Command Handlers

- [x] Create src/commands/setup.ts command handler
- [x] Implement setup command with workspace loading and metadata config
- [x] Add Claude CLI availability check with configured command
- [x] Implement interactive Claude session execution with system prompt
- [x] Add setup iteration counter increment
- [x] Add instructions existence check after session
- [x] Add setup completion notification support

- [x] Create src/commands/edit.ts command handler
- [x] Implement edit command with workspace loading
- [x] Add instructions existence check before editing
- [x] Implement interactive Claude session for editing
- [x] Add setup iteration counter increment

- [x] Create src/commands/validate.ts command handler
- [x] Implement validate command with workspace loading
- [x] Add instructions existence check before validation
- [x] Implement non-interactive Claude session for validation
- [x] Add validation report file path generation
- [x] Add report existence check and console display

## Phase 2: Validation Criteria System

- [x] Create src/templates/validation-criteria.ts
- [x] Define 7 REQUIRED validation criteria (autonomous execution, state awareness, re-runnable, TODO format, error handling, scale, completion detection)
- [x] Define 3 RECOMMENDED criteria (dynamic counting, task focus, quality standards)
- [x] Document critical principle: instructions must describe WHAT (task), not HOW (system)

## Phase 3: Mode-Aware Prompt Templates

- [x] Create src/templates/prompts/loop/setup.md template
- [x] Add critical principle section (no system mechanics in instructions)
- [x] Add validation criteria token injection
- [x] Add clarifying questions approach

- [x] Create src/templates/prompts/loop/edit.md template
- [x] Add instruction review and improvement guidance

- [x] Create src/templates/prompts/loop/validate.md template
- [x] Add 10 criteria evaluation process
- [x] Add structured report format with evidence-based assessment

## Phase 4: CLI Integration

- [x] Register setup command in src/cli.ts
- [x] Register edit command in src/cli.ts
- [x] Register validate command in src/cli.ts

## Implementation Notes

**Key Decisions:**

1. **Mode-Aware Prompts** - Decided to use strategy pattern with ModeFactory to support loop and iterative modes. Allows different validation criteria and instruction guidance per mode without conditional logic in commands.

2. **Dual Config Loading** - Commands load config twice: once to get workspacesDir for path resolution, then again with metadata for workspace-level overrides. This ensures workspace-specific settings (claudeCommand, claudeArgs) are respected.

3. **Validation as Non-Interactive** - Validation runs non-interactively to produce consistent, automated reports. Setup and edit are interactive for user collaboration.

4. **Setup Notification Only** - Only setup command sends notifications (not edit or validate) to avoid notification spam during instruction refinement.

**Testing Strategy:**

- All commands tested via mocked ClaudeClient (no real Claude API calls)
- Test workspace loading, error handling, Claude availability checks
- Test prompt generation with correct tokens
- Test notification triggering conditions
- Coverage target: >=80%
