---
# Status Tracking
status: complete
status_summary: Feature is fully implemented and tested

# Ownership
owner: brownfield-migration

# Blocking Issues
blocked_by:

# Summary (for AI and quick scanning)
summary: Send HTTP POST notifications for long-running task execution events via ntfy.sh-compatible endpoints
---

# Notifications

## Purpose

Send HTTP POST notifications for long-running task execution events via ntfy.sh-compatible endpoints.

## User Stories

- As a developer, I want to receive notifications when my long-running claude-iterate task starts, so that I know execution has begun.
- As a developer, I want to receive notifications when my task completes, so that I can review results without monitoring the console.
- As a developer, I want to receive notifications on errors, so that I can respond quickly to failures.
- As a developer, I want to receive real-time status updates when Claude updates progress, so that I can track task completion without polling.
- As a developer, I want to configure which events trigger notifications, so that I receive only relevant alerts.

## Core Business Logic

- Notifications send via HTTP POST to ntfy.sh-compatible endpoints (configurable URL)
- Eight event types: `setup_complete`, `execution_start`, `iteration`, `iteration_milestone`, `completion`, `error`, `status_update`, `all`
- Default event configuration: `all` (sends notifications for all event types)
- Status update events triggered automatically via `.status.json` file watcher with 2-second debouncing
- File watcher filters timestamp-only changes to prevent notification spam
- Notifications include ntfy.sh-compatible headers: `Title`, `Priority`, `Tags`
- Notification failures are logged but do not interrupt execution
- Configuration hierarchy: CLI flags → Workspace metadata → Project config → User config
- Status watcher detects meaningful changes: progress updates, completion status, summary text

## Key Constraints

- Must use HTTP POST with `Content-Type: text/plain` for ntfy.sh compatibility
- Priority values limited to: `low`, `default`, `high`, `urgent`
- Status file watcher must debounce rapid changes (default: 2000ms)
- Meaningful change detection must filter timestamp-only updates
- Network failures must not interrupt task execution
- Event names must match type union: `'setup_complete' | 'execution_start' | 'iteration' | 'iteration_milestone' | 'completion' | 'error' | 'status_update' | 'all'`

## CLI Commands

This feature integrates with other commands via configuration (no standalone command).

Configure notifications using:

- `claude-iterate config notifyUrl <url>` - Set notification URL
- `claude-iterate config notifyEvents <events>` - Set event subscriptions

For full command reference, see [Commands Reference](../../../README.md#commands-reference).

## Document Links

- [Technical Specification](./SPEC.md)
- [Implementation Plan](./PLAN.md)
- [Testing Specification](./TEST.md)
- [Implementation Progress](./TODO.md)
