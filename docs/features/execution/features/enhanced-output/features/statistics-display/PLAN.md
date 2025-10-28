# Implementation Plan: Statistics Display

## Overview

This plan outlines the implementation tasks for the statistics-display sub-feature. This is a **leaf feature** using checklist mode (8 implementation tasks).

**Dependencies**: None (can start immediately)

**Estimated effort**: 2-3 hours

## Phase 1: Core Types and Utilities (2 tasks)

### Task 1.1: Create iteration statistics types

**File**: `src/types/iteration-stats.ts` (new file)

**Description**: Define TypeScript interfaces and types for iteration statistics tracking.

**Deliverables**:

- `IterationStats` interface with all 9 core metrics
- Helper functions: `calculateStats()`, `formatDuration()`, `formatRelativeTime()`
- Unit tests in `tests/unit/types/iteration-stats.test.ts`

**Acceptance Criteria**:

- [ ] `IterationStats` interface exported with correct types
- [ ] `calculateStats()` correctly computes derived statistics (elapsed, avg, ETA)
- [ ] `formatDuration()` handles edge cases (0s, 59s, 60s, 3599s, 3600s)
- [ ] `formatRelativeTime()` returns "just now", "Xs ago", "Xm ago" correctly
- [ ] TypeScript compiles: `npm run typecheck` passes
- [ ] Unit tests pass with ≥80% coverage

### Task 1.2: Create box character utilities

**File**: `src/utils/box-characters.ts` (new file)

**Description**: Platform-aware box drawing character selection.

**Deliverables**:

- `BoxChars` interface
- `getBoxCharacters()` function with Windows legacy detection
- Unit tests in `tests/unit/utils/box-characters.test.ts`

**Acceptance Criteria**:

- [ ] Returns Unicode characters for modern terminals
- [ ] Returns ASCII fallback for legacy Windows (no `WT_SESSION` env var)
- [ ] Unit tests cover all platforms
- [ ] TypeScript compiles

## Phase 2: Enhanced ConsoleReporter (2 tasks)

### Task 2.1: Add TTY detection and display state

**File**: `src/services/console-reporter.ts` (modify existing)

**Description**: Add TTY detection, display state tracking, and initialization method.

**Deliverables**:

- Add `isTTY` property to constructor
- Add `DisplayState` interface (private)
- Add `initEnhanced(stats)` method
- Add `cleanup()` method

**Acceptance Criteria**:

- [ ] TTY detection uses `process.stdout.isTTY ?? false`
- [ ] Display state tracks `linesRendered`, `lastRenderTime`, `initialized`
- [ ] `initEnhanced()` only works when `isTTY === true`
- [ ] Existing ConsoleReporter tests still pass
- [ ] TypeScript compiles

### Task 2.2: Add statistics rendering methods

**File**: `src/services/console-reporter.ts` (modify existing)

**Description**: Implement UI rendering logic for enhanced statistics display.

**Deliverables**:

- Add `updateStats(stats)` method with debouncing
- Add private rendering helper methods:
  - `renderEnhancedUI(stats, state)`
  - `renderProgressBar(stats)`
  - `renderStatsGrid(stats)`
  - `getStatusColor(status)`
  - `getStatusIcon(status)`
  - `stripAnsi(str)`

**Acceptance Criteria**:

- [ ] `updateStats()` debounces to max 2 Hz (500ms minimum between renders)
- [ ] Rendered output matches mockup format (box border, progress bar, stats grid)
- [ ] Progress bar correctly shows filled/empty blocks and percentage
- [ ] Stats grid displays two columns with proper alignment
- [ ] Status colors match specification (blue=starting, cyan=running, green=completing, yellow=stopped)
- [ ] In-place updates work (ANSI escape codes for cursor movement)
- [ ] Unit tests for each rendering function
- [ ] Snapshot tests for complete UI output

## Phase 3: Integration with run Command (2 tasks)

### Task 3.1: Initialize statistics tracker in run.ts

**File**: `src/commands/run.ts` (modify existing)

**Description**: Add statistics tracking initialization before iteration loop.

**Deliverables**:

- Initialize `IterationStats` object before loop
- Initialize enhanced reporter if progress mode + TTY
- Add cleanup in finally block

**Acceptance Criteria**:

- [ ] Stats initialized with correct default values
- [ ] Enhanced reporter initialized only when `outputLevel === 'progress'` and TTY available
- [ ] Cleanup called on both normal exit and errors
- [ ] Existing run command tests still pass

### Task 3.2: Update stats during iteration loop

**File**: `src/commands/run.ts` (modify existing)

**Description**: Update statistics after each iteration and trigger UI updates.

**Deliverables**:

- Update `currentIteration`, `iterationDurations`, `lastUpdateTime` after each iteration
- Read `.status.json` and update `tasksCompleted`, `tasksTotal`
- Calculate derived stats using `calculateStats()`
- Call `reporter.updateStats(updatedStats)`

**Acceptance Criteria**:

- [ ] Stats updated after every iteration
- [ ] Task progress correctly read from `.status.json`
- [ ] ETA calculation becomes available after 5 iterations
- [ ] Status changes correctly (starting → running → completing)
- [ ] UI updates visible in terminal (manual test)
- [ ] Integration test verifies stats tracking

## Phase 4: Testing (2 tasks)

### Task 4.1: Unit tests

**Files**:

- `tests/unit/types/iteration-stats.test.ts`
- `tests/unit/utils/box-characters.test.ts`
- `tests/unit/services/console-reporter.test.ts`

**Description**: Write comprehensive unit tests for all new code.

**Deliverables**:

- Test all public functions and methods
- Mock `process.stdout.isTTY` for TTY detection tests
- Mock `Date.now()` for timing tests
- Snapshot tests for rendered UI output

**Acceptance Criteria**:

- [ ] ≥80% line coverage for new code
- [ ] All edge cases tested (empty arrays, null values, zero durations)
- [ ] Tests pass: `npm test`
- [ ] No flaky tests (run 5 times, all pass)

### Task 4.2: Integration tests

**File**: `tests/integration/enhanced-output.test.ts`

**Description**: End-to-end test for statistics display feature.

**Deliverables**:

- Test complete flow: initialize → update stats → render → cleanup
- Test TTY vs non-TTY behavior
- Test debouncing (rapid updates don't cause flicker)

**Acceptance Criteria**:

- [ ] Integration test passes
- [ ] Verifies correct output in TTY mode
- [ ] Verifies simple output in non-TTY mode
- [ ] Verifies debouncing works (max 2 Hz)
- [ ] Test completes in <5 seconds

## Validation Checklist

After completing all tasks:

### Code Quality

- [ ] TypeScript compiles: `npm run typecheck` passes with 0 errors
- [ ] Linter passes: `npm run lint` with 0 warnings
- [ ] Build succeeds: `npm run build` completes
- [ ] No console.log statements (use logger instead)
- [ ] All public methods have JSDoc comments

### Testing Quality

- [ ] All tests pass: `npm test` shows green
- [ ] Coverage targets met: ≥80% line coverage for new code
- [ ] Unit tests: ~40 test cases passing
- [ ] Integration tests: 1 test case passing
- [ ] Cross-platform tests: Pass on Windows, macOS, Linux
- [ ] Performance benchmarks: <10ms render time
- [ ] No flaky tests

### Documentation Quality

- [ ] All 5 SDD files complete (README, SPEC, PLAN, TEST, TODO)
- [ ] Code comments explain "why", not "what"
- [ ] All public APIs documented with JSDoc
- [ ] UI mockups match actual output

### User Experience

- [ ] Enhanced UI displays correctly in TTY mode
- [ ] Non-TTY mode shows plain text (no ANSI codes)
- [ ] Statistics update in real-time without flicker
- [ ] ETA becomes accurate after 5+ iterations
- [ ] Unicode characters display on modern terminals
- [ ] ASCII fallback works on legacy Windows

## Notes

### Implementation Order

1. Start with types (`iteration-stats.ts`) - foundation for everything else
2. Add box characters utility (simple, no dependencies)
3. Enhance ConsoleReporter (core rendering logic)
4. Integrate with run.ts (bring it all together)
5. Write tests last (can test as you go)

### Testing Strategy

- **Mock TTY early**: Set up test mocks for `process.stdout.isTTY` before implementation
- **Snapshot tests**: Use for UI rendering (easy to update if design changes)
- **Don't test on real terminals**: Use synthetic output capture in tests
- **Cross-platform CI**: Run tests on all platforms in GitHub Actions

### Performance Tips

- **Debounce is critical**: Without it, UI will flicker on rapid updates
- **Limit array size**: Only keep last 10 iteration durations (O(1) space)
- **Minimize calculations**: ETA formula is simple O(1) operation
- **String concatenation**: Use array + join() instead of repeated +=

### Potential Issues

- **ANSI codes in non-TTY**: Make sure TTY detection works correctly
- **Unicode on Windows**: Test with both Windows Terminal and legacy console
- **Timer accuracy**: Node.js timers have ~10ms precision (acceptable for our use case)
- **String length with emojis**: Use `stripAnsi()` helper to calculate actual display width
