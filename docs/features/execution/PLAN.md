---
# Plan Status
status: complete
status_summary: Implementation complete, all tasks finished
summary: Implementation plan for Execution feature
plan_mode: checklist
total_tasks: 45
completed_tasks: 45
---

# Implementation Plan: Execution

This document lists the implementation tasks that were completed to build the execution feature. All tasks are marked complete as this is brownfield documentation.

## Phase 1: CLI Command

- [x] Create `run.ts` command handler in `src/commands/`
- [x] Register command with Commander.js in `src/cli.ts`
- [x] Add command description and argument: `<name>` (workspace name)
- [x] Add option: `-m, --max-iterations <number>` with parseInt
- [x] Add option: `-d, --delay <seconds>` with parseInt
- [x] Add option: `--no-delay` to skip delays
- [x] Add option: `--stagnation-threshold <number>` with parseInt
- [x] Add option: `-v, --verbose` (equivalent to --output verbose)
- [x] Add option: `-q, --quiet` (equivalent to --output quiet)
- [x] Add option: `--output <level>` (quiet, progress, verbose)
- [x] Add option: `--dangerously-skip-permissions` (runtime only)
- [x] Add option: `--dry-run` for testing with mock Claude
- [x] Validate mutually exclusive output flags (verbose/quiet/output)

## Phase 2: Configuration Loading

- [x] Load project/user config via `ConfigManager.load()`
- [x] Get workspace path from config
- [x] Load workspace metadata
- [x] Reload config with workspace metadata for workspace-level overrides
- [x] Extract runtime config with merged values
- [x] Apply CLI option overrides to runtime config
- [x] Determine max iterations (CLI > workspace > project > user > default)
- [x] Determine delay (CLI > workspace > project > user > default)
- [x] Determine stagnation threshold (CLI > workspace > metadata > config > default)

## Phase 3: Claude Client Integration

- [x] Create `ClaudeClient` class in `src/services/claude-client.ts`
- [x] Implement `executeInteractive()` for interactive mode (stdio: inherit)
- [x] Implement `executeNonInteractive()` for one-shot mode (--print)
- [x] Implement `executeWithToolVisibility()` for verbose mode (stream-json)
- [x] Add `isAvailable()` to check Claude CLI exists
- [x] Add `getVersion()` to retrieve Claude CLI version
- [x] Track current child process via `currentChild` property
- [x] Implement `kill(signal)` to terminate child process
- [x] Implement `shutdown(gracePeriodMs)` for graceful shutdown
- [x] Add `isShutdown()` to check shutdown state
- [x] Add `hasRunningChild()` to check running state
- [x] Implement 5-minute zombie detection timeout
- [x] Pass Claude command/args from config
- [x] Run from project root (process.cwd()) as working directory
- [x] Add system prompt via `--append-system-prompt` flag

## Phase 4: Execution Modes

- [x] Create `ExecutionMode` enum: LOOP, ITERATIVE
- [x] Create `ModePromptStrategy` interface in `src/templates/modes/base-mode.ts`
- [x] Implement `LoopModeStrategy` in `src/templates/modes/loop-mode.ts`
- [x] Implement `IterativeModeStrategy` in `src/templates/modes/iterative-mode.ts`
- [x] Create `ModeFactory.getStrategy(mode)` in `src/templates/modes/mode-factory.ts`
- [x] Add loop mode prompt templates in `src/templates/prompts/loop/`
- [x] Add iterative mode prompt templates in `src/templates/prompts/iterative/`
- [x] Implement token replacement: `{{projectRoot}}`, `{{workspacePath}}`
- [x] Generate mode-specific system prompts
- [x] Generate mode-specific iteration prompts

## Phase 5: Output Levels & Logging

- [x] Create `OutputLevel` type: quiet, progress, verbose
- [x] Create `ConsoleReporter` class in `src/services/console-reporter.ts`
- [x] Implement `error()` - always shown
- [x] Implement `warning()` - always shown
- [x] Implement `progress()` - shown in progress + verbose
- [x] Implement `status()` - shown in progress + verbose
- [x] Implement `verbose()` - only shown in verbose
- [x] Implement `stream()` - only shown in verbose
- [x] Add `getLevel()` to retrieve current level
- [x] Create `FileLogger` class in `src/services/file-logger.ts`
- [x] Generate timestamped log filenames: `iterate-YYYYMMDD-HHMMSS.log`
- [x] Implement `logRunStart()` - logs metadata once
- [x] Implement `logInstructions()` - logs instructions once
- [x] Implement `logSystemPrompt()` - logs system prompt once
- [x] Implement `logStatusInstructions()` - logs status instructions once
- [x] Implement `logIterationStart()` - logs iteration timestamp
- [x] Implement `appendOutput()` - buffers streaming output
- [x] Implement `flush()` - writes buffer to file
- [x] Implement `logIterationComplete()` - logs status and remaining count
- [x] Implement `logError()` - logs error with stack trace
- [x] Add 10KB buffer with auto-flush
- [x] Graceful failure: disable logging on file write error

## Phase 6: Tool Visibility

- [x] Create `StreamJsonFormatter` class in `src/utils/stream-json-formatter.ts`
- [x] Add `ndjson` package dependency
- [x] Implement `attach(child, callbacks)` to parse stream
- [x] Parse tool_use events (assistant message with tool_use content)
- [x] Parse tool_result events (user message with tool_result content)
- [x] Parse text events (assistant message with text content)
- [x] Implement `formatToolUse()` with tool-specific formatting
- [x] Implement `formatToolResult()` with success/error detection
- [x] Implement `formatReadResult()` with line numbers
- [x] Implement `formatWriteResult()` with file path
- [x] Implement `formatBashResult()` with exit code
- [x] Implement `formatErrorResult()` - never truncate errors
- [x] Add emoji indicators: 🔧 (tool use), ✓ (success), ❌ (error), 📝 (text)
- [x] Add proper spacing and indentation
- [x] Show full commands and strings (never truncate)
- [x] Implement `extractFinalResult()` for result extraction
- [x] Handle parse errors gracefully (strict: false)

## Phase 7: Completion Detection

- [x] Create `StatusManager` class in `src/core/status-manager.ts`
- [x] Implement `read()` to read `.status.json` with validation
- [x] Implement `isComplete()` to check complete flag
- [x] Implement `getProgress()` to extract progress counts
- [x] Return default status if file missing or invalid
- [x] Create `CompletionDetector` class in `src/core/completion.ts`
- [x] Implement `isComplete()` using StatusManager
- [x] Implement `getRemainingCount()` using StatusManager
- [x] Implement `getStatus()` with detailed status
- [x] Use `.status.json` as primary source (prevents false positives)
- [x] Fallback to TODO.md parsing (legacy support)

## Phase 8: Stagnation Detection

- [x] Initialize `noWorkCount` counter at 0
- [x] Get stagnation threshold from CLI > metadata > config
- [x] Check `worked` field in `.status.json` (iterative mode only)
- [x] Increment `noWorkCount` when `worked === false`
- [x] Reset `noWorkCount` to 0 when `worked === true`
- [x] Trigger completion when `noWorkCount >= threshold`
- [x] Disable when threshold is 0
- [x] Display verbose message: "No work detected (X/Y)"
- [x] Log stagnation detection message

## Phase 9: Iteration Loop

- [x] Check workspace has instructions before loop
- [x] Initialize iteration counter at 0
- [x] Initialize completion flag at false
- [x] Create status file watcher for notifications
- [x] Setup graceful shutdown handlers (SIGINT, SIGTERM)
- [x] Log static content once (instructions, system prompt)
- [x] Send execution_start notification
- [x] Enter iteration loop (while count < max && !complete)
- [x] Generate mode-specific prompts per iteration
- [x] Execute Claude with appropriate method (verbose vs. standard)
- [x] Stream output to console and log file
- [x] Increment workspace iteration counters
- [x] Check completion via StatusManager
- [x] Get remaining count
- [x] Check stagnation in iterative mode
- [x] Log iteration completion
- [x] Display progress message (mode-specific)
- [x] Send iteration notifications
- [x] Send milestone notifications (every 10 iterations)
- [x] Delay before next iteration (if configured)
- [x] Break loop on completion
- [x] Handle max iterations reached
- [x] Flush log buffers at end
- [x] Stop status watcher in finally block

## Phase 10: Graceful Shutdown

- [x] Register SIGINT handler
- [x] Register SIGTERM handler
- [x] Set `isShuttingDown` flag on signal
- [x] Attempt graceful shutdown via `client.shutdown(5000)`
- [x] Send SIGTERM to child process
- [x] Wait for graceful exit (5 seconds)
- [x] Force SIGKILL after grace period
- [x] Flush log buffers before exit
- [x] Exit with code 0 on success, 1 on error
- [x] Prevent duplicate shutdown (check isShuttingDown flag)

## Phase 11: Status File Watching

- [x] Create `StatusFileWatcher` class in `src/services/status-file-watcher.ts`
- [x] Watch `.status.json` for changes (fs.watch)
- [x] Debounce file changes (2 seconds default)
- [x] Read previous and current status
- [x] Filter timestamp-only changes (meaningless)
- [x] Calculate progress delta (completed increase)
- [x] Emit `statusChanged` event with delta
- [x] Implement `start()` to begin watching
- [x] Implement `stop()` to cleanup watcher
- [x] Send status_update notifications
- [x] Include progress delta in notification message
- [x] Add completion indicator to notification

## Phase 12: Notifications

- [x] Create `NotificationService` class
- [x] Check if notification URL is configured
- [x] Filter events based on metadata.notifyEvents
- [x] Send execution_start notification
- [x] Send iteration notifications
- [x] Send iteration_milestone notifications (every 10)
- [x] Send status_update notifications (from watcher)
- [x] Send completion notification
- [x] Send error notifications
- [x] Include workspace name, iteration count, status in messages
- [x] Set priority: high (completion), urgent (error), default (others)
- [x] Add tags: claude-iterate, event type

## Phase 13: Error Handling

- [x] Validate CLI flags (mutually exclusive)
- [x] Check workspace exists before execution
- [x] Check INSTRUCTIONS.md exists before execution
- [x] Check Claude CLI is available before execution
- [x] Handle Claude execution errors (non-zero exit)
- [x] Mark workspace error state on iteration failure
- [x] Log errors with stack traces
- [x] Send error notifications on failure
- [x] Display user-friendly error messages
- [x] Exit with code 1 on error, 0 on success

## Phase 14: Testing

- [x] Create mock Claude client: `tests/mocks/claude-client.mock.ts`
- [x] Mock all ClaudeClient methods for testing
- [x] Write unit tests for ClaudeClient (process cleanup, shutdown)
- [x] Write tests for execution modes (loop vs. iterative)
- [x] Write tests for stagnation detection
- [x] Write tests for output levels
- [x] Write tests for completion detection
- [x] Write tests for status file watching
- [x] Write tests for tool visibility formatting
- [x] Ensure all tests pass (228 passing)
- [x] Ensure tests are fast and deterministic (no real Claude calls)

---

## Notes

### Key Decisions

**Decision: Use child process spawn, not API calls**

- Rationale: Reuse Claude CLI installation, avoid key management, leverage project awareness
- Alternative: Direct API calls - requires API key, loses project context

**Decision: Separate execution methods for tool visibility**

- Rationale: Avoid overhead of stream-json parsing in progress/quiet modes
- Alternative: Always use stream-json - adds ~10KB dependency overhead even when not needed

**Decision: Log static content once at start**

- Rationale: Reduces log file size by ~60%, improves readability
- Alternative: Log per iteration - creates redundant content

**Decision: Use .status.json for completion detection**

- Rationale: Prevents false positives from completion markers in instructions
- Alternative: Parse TODO.md - prone to ambiguity and false positives

**Decision: Stagnation detection only in iterative mode**

- Rationale: Loop mode has explicit step tracking, doesn't need stagnation detection
- Alternative: Enable for both - unnecessary complexity for loop mode

### Potential Risks

**Risk: Zombie processes on unexpected shutdown**

- Mitigation: 5-minute timeout, graceful shutdown handlers, SIGKILL fallback

**Risk: Log files growing too large**

- Mitigation: Deduplicated format, 10KB buffer, per-run log files

**Risk: False completion detection**

- Mitigation: Machine-readable .status.json, validation schema

**Risk: Tool visibility parse errors**

- Mitigation: Graceful error handling (strict: false), continue on parse failure
