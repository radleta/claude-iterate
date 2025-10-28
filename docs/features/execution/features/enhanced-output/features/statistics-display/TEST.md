# Testing Specification: Statistics Display

## Overview

This document defines **ALL** testing requirements for the statistics-display sub-feature. Every test scenario, coverage target, and validation criterion is documented here.

**Testing Framework**: Vitest (existing)
**Test Location**: `tests/unit/` and `tests/integration/`
**Mocking Strategy**: Mock TTY, mock time, snapshot UI output

## Coverage Targets

### Unit Tests

- **Line coverage**: ≥80% for all new code
- **Branch coverage**: ≥75% for all new code
- **Function coverage**: 100% for public APIs
- **File coverage**: 100% (all new files must have tests)

**Specific targets by file**:

- `src/types/iteration-stats.ts`: ≥90% (simple logic, easy to test)
- `src/utils/box-characters.ts`: 100% (platform detection critical)
- `src/services/console-reporter.ts`: ≥80% (complex rendering logic)

### Integration Tests

- **Scenarios covered**: ≥95% of user workflows
- **Files**: 1 integration test file covering end-to-end flow

### Performance Tests

- **UI render time**: <10ms per update (measured with `performance.now()`)
- **Memory usage**: <1MB for stats tracking (track last 10 iterations only)

## Test Scenarios

### Layer 1: Unit Tests (Types)

**File**: `tests/unit/types/iteration-stats.test.ts`

#### Test Suite: IterationStats Interface

**Scenario 1.1**: Interface structure validation

- [ ] Interface has all required fields (currentIteration, maxIterations, etc.)
- [ ] All fields have correct TypeScript types
- [ ] Optional fields (stagnationCount) correctly typed

**Scenario 1.2**: calculateStats() function

- [ ] Calculates elapsed seconds correctly (now - startTime)
- [ ] Calculates average iteration time from last 5 durations
- [ ] Returns null ETA when <5 iterations
- [ ] Calculates accurate ETA after ≥5 iterations
- [ ] Handles empty iterationDurations array (avgIterationSeconds = 0)
- [ ] Returns correct derived stats object

**Test Data**:

```typescript
const baseStats = {
  currentIteration: 12,
  maxIterations: 50,
  tasksCompleted: 35,
  tasksTotal: 60,
  startTime: new Date(Date.now() - 342000), // 5m 42s ago
  lastUpdateTime: new Date(Date.now() - 2000), // 2s ago
  iterationDurations: [27000, 28000, 29000, 27000, 28000], // Last 5 iterations
  mode: 'loop',
  status: 'running',
  stopRequested: false,
  stopSource: null,
};
```

**Scenario 1.3**: formatDuration() function

- [ ] Formats 0 seconds: "0s"
- [ ] Formats <60 seconds: "Xs"
- [ ] Formats 60-3599 seconds: "Xm Ys" or "Xm"
- [ ] Formats ≥3600 seconds: "Xh Ym"
- [ ] Handles edge case: 59s → "59s"
- [ ] Handles edge case: 60s → "1m"
- [ ] Handles edge case: 3599s → "59m 59s"
- [ ] Handles edge case: 3600s → "1h 0m"

**Scenario 1.4**: formatRelativeTime() function

- [ ] Returns "just now" for <5 seconds
- [ ] Returns "Xs ago" for 5-59 seconds
- [ ] Returns "Xm ago" for ≥60 seconds
- [ ] Handles edge cases (exactly 5s, exactly 60s)

### Layer 2: Unit Tests (Box Characters)

**File**: `tests/unit/utils/box-characters.test.ts`

#### Test Suite: getBoxCharacters()

**Scenario 2.1**: Unicode characters (modern terminals)

- [ ] Returns Unicode box characters on macOS
- [ ] Returns Unicode box characters on Linux
- [ ] Returns Unicode box characters on Windows with WT_SESSION env var

**Scenario 2.2**: ASCII fallback (legacy Windows)

- [ ] Returns ASCII characters on Windows without WT_SESSION
- [ ] Uses '+' for corners, '-' for horizontal, '|' for vertical

**Scenario 2.3**: BoxChars interface

- [ ] Interface has all required fields (topLeft, topRight, etc.)
- [ ] All fields are strings

**Mocking Strategy**:

```typescript
// Mock platform
vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');

// Mock environment
process.env.WT_SESSION = undefined; // Legacy
process.env.WT_SESSION = 'guid'; // Modern
```

### Layer 3: Unit Tests (ConsoleReporter)

**File**: `tests/unit/services/console-reporter.test.ts`

#### Test Suite: TTY Detection

**Scenario 3.1**: Constructor TTY detection

- [ ] Detects TTY when `process.stdout.isTTY === true`
- [ ] Detects non-TTY when `process.stdout.isTTY === false`
- [ ] Defaults to false when `process.stdout.isTTY === undefined`
- [ ] Accepts explicit `isTTY` parameter in constructor

**Scenario 3.2**: initEnhanced() method

- [ ] Initializes display state when TTY is true
- [ ] Does nothing (no-op) when TTY is false
- [ ] Can only be called once (idempotent check)
- [ ] Sets `initialized` flag to true

#### Test Suite: Stats Rendering

**Scenario 3.3**: updateStats() method

- [ ] Updates stats when TTY is true
- [ ] Does nothing when TTY is false
- [ ] Debounces updates (skips if <500ms since last render)
- [ ] Writes to stdout using `process.stdout.write()`
- [ ] Tracks `lastRenderTime` correctly

**Scenario 3.4**: renderEnhancedUI() function

- [ ] Returns string with box border
- [ ] Includes title line with mode
- [ ] Includes status indicator with correct icon and color
- [ ] Includes progress bar
- [ ] Includes statistics grid (2 columns)
- [ ] Includes stop indicator if `stopRequested === true`
- [ ] Uses ANSI escape codes for in-place updates
- [ ] Tracks `linesRendered` correctly

**Scenario 3.5**: renderProgressBar() function

- [ ] Shows 0% progress: all empty blocks (░)
- [ ] Shows 50% progress: half filled (█), half empty (░)
- [ ] Shows 100% progress: all filled blocks (█)
- [ ] Shows iteration count: "X / Y"
- [ ] Shows percentage: "(Z%)"
- [ ] Uses correct width (50 characters)

**Scenario 3.6**: renderStatsGrid() function

- [ ] Returns array of formatted lines (2-column layout)
- [ ] Column 1 shows: Elapsed, Avg/iter, Tasks
- [ ] Column 2 shows: ETA, Mode, Updated
- [ ] Shows stagnation count if present (iterative mode)
- [ ] Handles null values (tasks, ETA)
- [ ] Aligns columns correctly (column 1 width = 38)

**Scenario 3.7**: getStatusColor() function

- [ ] Returns blue for 'starting'
- [ ] Returns cyan for 'running'
- [ ] Returns green for 'completing'
- [ ] Returns yellow for 'stopped'
- [ ] Returns white for unknown status

**Scenario 3.8**: getStatusIcon() function

- [ ] Returns ⏳ for 'starting'
- [ ] Returns 🔄 for 'running'
- [ ] Returns ✅ for 'completing'
- [ ] Returns 🛑 for 'stopped'
- [ ] Returns ❓ for unknown status

**Scenario 3.9**: stripAnsi() function

- [ ] Removes ANSI color codes
- [ ] Removes ANSI cursor codes
- [ ] Returns plain text length
- [ ] Handles strings with no ANSI codes

**Scenario 3.10**: cleanup() method

- [ ] Restores terminal to normal state
- [ ] Resets display state
- [ ] Can be called multiple times safely

#### Test Suite: Snapshot Tests

**Scenario 3.11**: UI output snapshots

- [ ] Starting state (3/50 iterations, calculating ETA)
- [ ] Running state (12/50 iterations, ETA shown)
- [ ] Completing state (50/50 iterations, 0s ETA)
- [ ] Stopped state (with stop indicator)
- [ ] With stagnation count (iterative mode)
- [ ] With null task progress

**Snapshot Strategy**:

- Use `toMatchSnapshot()` for entire UI output
- Update snapshots when design changes
- Review snapshot diffs carefully in PRs

### Layer 4: Integration Tests

**File**: `tests/integration/enhanced-output.test.ts`

#### Test Suite: End-to-End Statistics Display

**Scenario 4.1**: Complete flow (TTY mode)

- [ ] Initialize reporter with TTY enabled
- [ ] Initialize stats with default values
- [ ] Call `initEnhanced(stats)`
- [ ] Update stats 10 times (simulate iterations)
- [ ] Verify UI updates written to stdout
- [ ] Verify debouncing (rapid updates don't all render)
- [ ] Call `cleanup()`
- [ ] Verify terminal restored

**Scenario 4.2**: Complete flow (non-TTY mode)

- [ ] Initialize reporter with TTY disabled
- [ ] Initialize stats with default values
- [ ] Call `initEnhanced(stats)` (should no-op)
- [ ] Update stats 10 times
- [ ] Verify no UI updates (non-TTY uses simple output)
- [ ] Call `cleanup()` (should no-op)

**Scenario 4.3**: ETA accuracy over time

- [ ] First iteration: ETA is null
- [ ] Iterations 2-4: ETA is null (not enough data)
- [ ] Iteration 5+: ETA calculated and displayed
- [ ] ETA improves accuracy with more iterations
- [ ] ETA reaches 0 on final iteration

**Scenario 4.4**: Stats update from .status.json

- [ ] Mock `.status.json` file reads
- [ ] Verify `tasksCompleted` and `tasksTotal` updated correctly
- [ ] Verify stats grid shows correct task progress

**Scenario 4.5**: Debouncing behavior

- [ ] Call `updateStats()` 100 times rapidly (<10ms apart)
- [ ] Verify only ~2 renders per second (max 2 Hz)
- [ ] Verify total renders ≤ expected count

**Test Data**:

```typescript
const mockStatusFile = {
  complete: false,
  progress: {
    completed: 35,
    total: 60,
  },
  summary: 'Migrated 35/60 API endpoints',
  lastUpdated: new Date().toISOString(),
};
```

## Error Scenarios

### Error 1: TTY initialization failure

**Condition**: `initEnhanced()` throws error during initialization
**Expected behavior**: Catch error, log warning, fall back to simple output
**Test**: Mock `process.stdout.write` to throw error

### Error 2: Rendering failure

**Condition**: `updateStats()` throws error during rendering
**Expected behavior**: Catch error, log debug message, continue execution
**Test**: Mock rendering function to throw error

### Error 3: Invalid stats data

**Condition**: `updateStats()` called with malformed `IterationStats` object
**Expected behavior**: Skip rendering, log warning
**Test**: Pass stats with missing required fields

### Error 4: ANSI code injection

**Condition**: Workspace name or task summary contains ANSI codes
**Expected behavior**: Sanitize input, prevent UI corruption
**Test**: Pass stats with `\x1b[31m` in summary field

## Edge Cases

### Edge Case 1: Zero iterations

**Condition**: `currentIteration === 0`, `maxIterations === 50`
**Expected**: Progress bar shows 0%, ETA is null

### Edge Case 2: Single iteration

**Condition**: `currentIteration === 1`, `maxIterations === 1`
**Expected**: Progress bar shows 100%, ETA is 0s

### Edge Case 3: No task progress

**Condition**: `tasksCompleted === null`, `tasksTotal === null`
**Expected**: Stats grid shows "- / -" for tasks

### Edge Case 4: Stagnation in loop mode

**Condition**: `mode === 'loop'`, `stagnationCount` is set
**Expected**: Stagnation count NOT displayed (only for iterative mode)

### Edge Case 5: Very long elapsed time

**Condition**: `elapsedSeconds > 86400` (>24 hours)
**Expected**: Format as "Xh Ym" (no day units)

### Edge Case 6: Very short iteration time

**Condition**: All `iterationDurations < 1000` (all <1 second)
**Expected**: Average shows "0s", ETA calculated correctly

## Performance Benchmarks

### Benchmark 1: Render time

**Metric**: Time to execute `renderEnhancedUI()`
**Target**: <10ms per update
**Measurement**: Use `performance.now()` before/after
**Test**:

```typescript
const start = performance.now();
const output = renderEnhancedUI(stats, state);
const end = performance.now();
expect(end - start).toBeLessThan(10);
```

### Benchmark 2: Memory usage

**Metric**: Memory consumed by stats tracking
**Target**: <1MB total
**Measurement**: Track `iterationDurations` array size
**Test**:

```typescript
// Simulate 1000 iterations
for (let i = 0; i < 1000; i++) {
  stats.iterationDurations.push(27000);
}
// Should only keep last 10
expect(stats.iterationDurations.length).toBe(10);
```

### Benchmark 3: Debouncing effectiveness

**Metric**: Actual render rate vs target (max 2 Hz)
**Target**: ≤2 renders per second
**Measurement**: Count stdout writes over 5 seconds
**Test**:

```typescript
// Call updateStats() 100 times in 1 second
for (let i = 0; i < 100; i++) {
  reporter.updateStats(stats);
}
// Should render max 2 times (500ms minimum between renders)
expect(stdoutWriteCount).toBeLessThanOrEqual(2);
```

## Cross-Platform Tests

### Platform 1: Windows (legacy console)

**Environment**: Windows without `WT_SESSION`
**Expected**: ASCII box characters, ANSI colors work
**Test**: Mock `process.platform` and env vars

### Platform 2: Windows Terminal

**Environment**: Windows with `WT_SESSION`
**Expected**: Unicode box characters, ANSI colors work
**Test**: Mock `process.platform` and set `WT_SESSION` env var

### Platform 3: macOS

**Environment**: macOS Terminal.app
**Expected**: Unicode box characters, ANSI colors work
**Test**: Mock `process.platform`

### Platform 4: Linux

**Environment**: Various Linux terminals
**Expected**: Unicode box characters, ANSI colors work
**Test**: Mock `process.platform`

### Platform 5: CI/CD (non-TTY)

**Environment**: GitHub Actions, Docker
**Expected**: Simple line-by-line output, no ANSI codes
**Test**: Mock `process.stdout.isTTY = false`

## Test Data

### Sample Stats (Starting)

```typescript
const startingStats: IterationStats = {
  currentIteration: 3,
  maxIterations: 50,
  tasksCompleted: 2,
  tasksTotal: 45,
  startTime: new Date(Date.now() - 83000), // 1m 23s ago
  lastUpdateTime: new Date(Date.now() - 2000), // 2s ago
  iterationDurations: [27000, 28000, 26000], // 3 iterations
  elapsedSeconds: 83,
  avgIterationSeconds: 27,
  etaSeconds: null, // Not enough data yet
  mode: 'loop',
  status: 'starting',
  stopRequested: false,
  stopSource: null,
};
```

### Sample Stats (Running)

```typescript
const runningStats: IterationStats = {
  currentIteration: 12,
  maxIterations: 50,
  tasksCompleted: 35,
  tasksTotal: 60,
  startTime: new Date(Date.now() - 342000), // 5m 42s ago
  lastUpdateTime: new Date(Date.now() - 2000), // 2s ago
  iterationDurations: [
    27000, 28000, 29000, 27000, 28000, 27000, 28000, 29000, 27000, 28000,
  ], // 10 iterations
  elapsedSeconds: 342,
  avgIterationSeconds: 28,
  etaSeconds: 1064, // (50 - 12) * 28 = 1064s = ~18m
  mode: 'loop',
  status: 'running',
  stopRequested: false,
  stopSource: null,
};
```

### Sample Stats (Completing)

```typescript
const completingStats: IterationStats = {
  currentIteration: 45,
  maxIterations: 45,
  tasksCompleted: 45,
  tasksTotal: 45,
  startTime: new Date(Date.now() - 1115000), // 18m 35s ago
  lastUpdateTime: new Date(), // just now
  iterationDurations: [
    /* last 10 iterations */
  ],
  elapsedSeconds: 1115,
  avgIterationSeconds: 24,
  etaSeconds: 0,
  mode: 'loop',
  status: 'completing',
  stopRequested: false,
  stopSource: null,
};
```

## Mocking Strategy

### Mock 1: process.stdout

```typescript
vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
vi.spyOn(process.stdout, 'isTTY', 'get').mockReturnValue(true);
```

### Mock 2: Date and time

```typescript
vi.useFakeTimers();
vi.setSystemTime(new Date('2025-10-28T14:30:00Z'));
```

### Mock 3: Platform detection

```typescript
vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
```

### Mock 4: Environment variables

```typescript
process.env.WT_SESSION = 'mock-guid';
```

## Quality Gates

### Pre-Merge Checklist

- [ ] All unit tests pass: `npm test`
- [ ] Coverage ≥80%: Check coverage report
- [ ] All integration tests pass
- [ ] Performance benchmarks met (<10ms render, <1MB memory)
- [ ] Cross-platform tests pass (Windows, macOS, Linux)
- [ ] No flaky tests (run 10 times, all pass)
- [ ] Snapshot tests reviewed and approved

### Definition of Done (Testing)

- [ ] ≥80% line coverage for all new files
- [ ] ≥75% branch coverage for all new files
- [ ] 100% function coverage for public APIs
- [ ] All error scenarios tested
- [ ] All edge cases tested
- [ ] Performance benchmarks passing
- [ ] Cross-platform tests passing
- [ ] Integration test passing
- [ ] No test warnings or console output during test runs
