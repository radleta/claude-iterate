# Implementation Plan: Graceful Stop

## Overview

This plan outlines the implementation tasks for the graceful-stop sub-feature. This is a **leaf feature** using checklist mode (8 tasks total).

**Dependencies**: [statistics-display](../statistics-display/README.md) (needs UI foundation with IterationStats)

**Estimated effort**: 2-3 hours

## Phase 1: StopSignal Class (2 tasks)

### Task 1.1: Create StopSignal class

**File**: `src/services/stop-signal.ts` (new file)

**Description**: Implement StopSignal class with file-based and keyboard-based stop detection.

**Deliverables**:

- `StopSignal` class with public API
- `init()` method: Check for .stop file, setup keyboard listener
- `isStopRequested()` method: Return current stop state
- `toggle()` method: Toggle stop state (called by keyboard listener)
- `getState()` method: Return stop state with source
- `cleanup()` method: Remove listener, delete file
- Private methods: `setupKeyboardListener()`, `checkStopFile()`

**Acceptance Criteria**:

- [ ] Class exports correctly
- [ ] `init()` checks for existing .stop file on startup
- [ ] `init()` sets up keyboard listener only when TTY available
- [ ] `toggle()` correctly flips stop state
- [ ] `getState()` returns source ('keyboard' vs 'file')
- [ ] `cleanup()` removes keyboard listener
- [ ] `cleanup()` optionally deletes .stop file
- [ ] TypeScript compiles: `npm run typecheck` passes
- [ ] All JSDoc comments present

### Task 1.2: Implement keyboard listener helper

**File**: `src/services/stop-signal.ts` (same file as Task 1.1)

**Description**: Private helper function to setup keyboard raw mode and listen for 's' key.

**Deliverables**:

- `setupKeyboardListener()` function (private)
- Sets `process.stdin.setRawMode(true)`
- Uses `readline.emitKeypressEvents()`
- Listens for 's' or 'S' key
- Returns cleanup function

**Acceptance Criteria**:

- [ ] Only runs when `process.stdin.isTTY === true`
- [ ] Correctly detects 's' and 'S' keys
- [ ] Ignores other keys
- [ ] Calls `stopSignal.toggle()` on 's' key
- [ ] Cleanup function restores terminal to normal mode
- [ ] Doesn't interfere with CTRL+C (SIGINT still works)

## Phase 2: Stop Command (2 tasks)

### Task 2.1: Create stop command

**File**: `src/commands/stop.ts` (new file)

**Description**: Implement CLI command to create .stop file in workspace directory.

**Deliverables**:

- `stopCommand()` function returning Commander Command
- Accepts `<name>` argument (workspace name)
- Validates workspace exists
- Creates `.stop` file in workspace directory
- Outputs success message with cancellation instructions

**Acceptance Criteria**:

- [ ] Command registered as `claude-iterate stop <name>`
- [ ] Validates workspace exists (exit 1 if not found)
- [ ] Creates .stop file with timestamp
- [ ] Shows success message
- [ ] Shows cancellation instructions (how to delete .stop file)
- [ ] Handles errors gracefully (file system errors)
- [ ] TypeScript compiles

### Task 2.2: Register stop command in CLI

**File**: `src/cli.ts` (modify existing)

**Description**: Register stop command in main CLI program.

**Deliverables**:

- Import `stopCommand` from commands/stop.ts
- Add command to program: `program.addCommand(stopCommand())`

**Acceptance Criteria**:

- [ ] Command appears in `claude-iterate --help` output
- [ ] Command works: `claude-iterate stop --help` shows command help
- [ ] Existing commands still work (no breaking changes)

## Phase 3: Integration with run Command (1 task)

### Task 3.1: Integrate StopSignal in run.ts

**File**: `src/commands/run.ts` (modify existing)

**Description**: Initialize StopSignal, check stop at iteration boundaries, cleanup on exit.

**Deliverables**:

- Initialize `StopSignal` before iteration loop
- Call `stopSignal.init()`
- Update `stats.stopRequested` and `stats.stopSource` after each iteration
- Check stop signal before next iteration (break if true)
- Cleanup in finally block

**Acceptance Criteria**:

- [ ] StopSignal initialized with correct workspace path
- [ ] Stop checked at iteration boundaries (not during execution)
- [ ] Stats updated with stop state after each iteration
- [ ] Loop breaks when stop requested
- [ ] Log message: "Stop signal received - completing gracefully"
- [ ] Cleanup called in finally block
- [ ] Existing run command tests still pass
- [ ] Integration test verifies stop behavior

## Phase 4: Update ConsoleReporter Footer (1 task)

### Task 4.1: Update footer with keyboard controls

**File**: `src/services/console-reporter.ts` (modify existing)

**Description**: Replace footer placeholder with actual keyboard controls text.

**Deliverables**:

- Update `renderEnhancedUI()` to show "Press s to toggle stop" in footer
- Remove placeholder text

**Acceptance Criteria**:

- [ ] Footer shows: "Press s to toggle stop"
- [ ] Footer only shows in TTY mode (not in non-TTY)
- [ ] Text is visible and properly formatted
- [ ] Snapshot tests updated

## Phase 5: Testing (2 tasks)

### Task 5.1: Unit tests

**Files**:

- `tests/unit/services/stop-signal.test.ts`
- `tests/unit/commands/stop.test.ts`

**Description**: Write comprehensive unit tests for StopSignal and stop command.

**Deliverables**:

- Test StopSignal initialization
- Test keyboard listener (mock stdin)
- Test file-based stop (mock fs)
- Test toggle behavior
- Test cleanup
- Test stop command (mock workspace path)

**Acceptance Criteria**:

- [ ] ≥80% line coverage for new code
- [ ] All public methods tested
- [ ] Edge cases tested (non-TTY, missing .stop file, etc.)
- [ ] Tests pass: `npm test`
- [ ] No flaky tests

### Task 5.2: Integration tests

**File**: `tests/integration/graceful-stop.test.ts`

**Description**: End-to-end test for graceful stop feature.

**Deliverables**:

- Test keyboard stop flow
- Test file-based stop flow
- Test toggle (cancel) behavior
- Test integration with run command

**Acceptance Criteria**:

- [ ] Integration test passes
- [ ] Verifies stop after current iteration completes
- [ ] Verifies stop indicator appears in UI
- [ ] Verifies cleanup removes .stop file
- [ ] Test completes in <5 seconds

## Validation Checklist

After completing all tasks:

### Code Quality

- [ ] TypeScript compiles: `npm run typecheck` passes with 0 errors
- [ ] Linter passes: `npm run lint` with 0 warnings
- [ ] Build succeeds: `npm run build` completes
- [ ] No console.log statements (use logger instead)
- [ ] All public methods have JSDoc comments
- [ ] Error handling in place for all file operations

### Testing Quality

- [ ] All tests pass: `npm test` shows green
- [ ] Coverage targets met: ≥80% line coverage for new code
- [ ] Unit tests: ~30 test cases passing
- [ ] Integration tests: 1 test case passing
- [ ] Cross-platform tests: Pass on Windows, macOS, Linux
- [ ] No flaky tests

### Documentation Quality

- [ ] All 5 SDD files complete (README, SPEC, PLAN, TEST, TODO)
- [ ] Code comments explain "why", not "what"
- [ ] All public APIs documented with JSDoc
- [ ] Parent feature links to this sub-feature

### User Experience

- [ ] Keyboard shortcut 's' toggles stop reliably
- [ ] .stop file stops execution gracefully
- [ ] Stop indicator appears in UI
- [ ] Stop can be canceled before it takes effect
- [ ] CTRL+C still works for immediate stop
- [ ] CLI command `claude-iterate stop <workspace>` works
- [ ] Cleanup removes .stop file

## Notes

### Implementation Order

1. Start with StopSignal class (foundation)
2. Add stop command CLI (easy to test independently)
3. Register command in CLI
4. Integrate with run.ts (bring it all together)
5. Update footer text (simple UI change)
6. Write tests last (can test as you go)

### Testing Strategy

- **Mock stdin**: Use `vi.spyOn(process.stdin, 'isTTY')` and inject key events
- **Mock filesystem**: Use `memfs` or `vi.mock('fs/promises')`
- **Test both sources**: Keyboard and file independently, then together
- **Test toggle**: Verify cancel behavior works correctly

### Integration Points

- **Depends on statistics-display**: IterationStats interface must exist with stopRequested and stopSource fields
- **Updates ConsoleReporter**: Footer text changed from placeholder to actual controls
- **Updates run.ts**: Adds StopSignal initialization and stop check

### Potential Issues

- **Raw mode on Windows**: May not work in legacy console (graceful degradation)
- **Keyboard listener cleanup**: Ensure terminal is always restored to normal mode
- **File permissions**: .stop file uses user's umask (no custom permissions)
- **Race conditions**: Stop file created during iteration (checked at boundary, not mid-iteration)

### Performance Tips

- **Event-driven keyboard**: No polling loops, uses readline events
- **Minimal file checks**: Only check .stop file at iteration boundaries
- **Cleanup in finally**: Guaranteed cleanup even if errors occur
