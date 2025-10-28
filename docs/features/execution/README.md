---
# Status Tracking
status: complete
status_summary: Feature implemented and documented

# Ownership
owner: brownfield-migration

# Blocking Issues
blocked_by:

# Summary (for AI and quick scanning)
summary: Run autonomous iteration loops with Claude in loop or iterative mode
---

# Execution

## Purpose

Run autonomous iteration loops with Claude CLI in loop or iterative mode, supporting stagnation detection, tool visibility, and comprehensive logging.

## User Stories

- As a user, I want to run autonomous iteration loops so that Claude can complete multi-step tasks without manual intervention.
- As a user, I want to choose between loop mode (incremental, one item per iteration) and iterative mode (autonomous, multiple items per iteration) so that I can optimize for my task type.
- As a user, I want stagnation detection in iterative mode so that the loop stops automatically when Claude isn't making progress.
- As a user, I want verbose output with tool visibility so that I can see exactly what Claude is doing during execution.
- As a user, I want timestamped log files so that I can review execution history and debug issues.
- As a developer, I want graceful shutdown handling so that I can interrupt execution without leaving zombie processes.

## Core Business Logic

**Execution Modes:**

- Loop mode: Complete one item per iteration, explicit step tracking, default max 50 iterations
- Iterative mode: Complete as many items as possible per iteration, autonomous work sessions, default max 20 iterations

**Stagnation Detection (Iterative Mode Only):**

- Default threshold: 2 consecutive no-work iterations
- Triggers automatic completion when threshold exceeded
- Disabled with threshold 0 (trust Claude completely)
- Reset counter to 0 when any work is detected

**Output Levels:**

- Quiet: Silent execution, errors only
- Progress: Iteration progress and completion status (default)
- Verbose: Full Claude output with real-time tool visibility

**Status Tracking:**

- Loop mode: Uses progress counts (X/Y items remaining)
- Iterative mode: Uses work detection (worked: true/false) and summary text
- Machine-readable `.status.json` file prevents false completion detection

**Completion Detection:**

- Primary: `.status.json` file with `complete: true`
- Fallback: Legacy TODO.md remaining count extraction
- Never trusts completion markers in instructions or examples

**Tool Visibility (Verbose Mode):**

- Real-time display of tool usage events (Read, Edit, Write, Bash, Grep)
- Shows tool parameters (file paths, commands, patterns)
- Displays success/error indicators with formatted results
- Uses Claude CLI `--output-format stream-json --verbose`

**Logging:**

- Timestamped log files: `iterate-YYYYMMDD-HHMMSS.log`
- Deduplicated format: Static content logged once at start
- ~60% smaller log files while maintaining auditability
- Tool events logged in verbose mode

**Graceful Shutdown:**

- Handles SIGINT and SIGTERM signals
- Attempts SIGTERM first, SIGKILL after grace period (5 seconds)
- Prevents zombie processes
- Flushes log buffers before exit

## Key Constraints

- Claude CLI must be installed and available in PATH
- Workspace must have `INSTRUCTIONS.md` file (created by `setup` command)
- Project root as working directory for Claude (workspace files accessed via absolute paths)
- Maximum iteration limits enforced (loop: 50, iterative: 20 by default)
- Stagnation detection only applies to iterative mode
- Tool visibility requires `ndjson` package (~10KB) for stream parsing
- Zombie process timeout: 5 minutes (detects process completion without exit event)

## CLI Commands

This feature provides the following command:

- `claude-iterate run <name>` - Run autonomous iteration loop

For full command reference, see [Commands Reference](../../../README.md#commands-reference).

## Document Links

- [Technical Specification](./SPEC.md)
- [Implementation Plan](./PLAN.md)
- [Testing Specification](./TEST.md)
- [Implementation Progress](./TODO.md)
