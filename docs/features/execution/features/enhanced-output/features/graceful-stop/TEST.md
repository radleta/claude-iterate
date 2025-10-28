# Testing Specification: Graceful Stop

## Overview

This document defines **ALL** testing requirements for the graceful-stop sub-feature. Every test scenario, coverage target, and validation criterion is documented here.

**Testing Framework**: Vitest (existing)
**Test Location**: `tests/unit/` and `tests/integration/`
**Mocking Strategy**: Mock stdin (keyboard), mock fs (files), inject events

## Coverage Targets

### Unit Tests

- **Line coverage**: ≥80% for all new code
- **Branch coverage**: ≥75% for all new code
- **Function coverage**: 100% for public APIs
- **File coverage**: 100% (all new files must have tests)

**Specific targets by file**:

- `src/services/stop-signal.ts`: ≥85% (critical logic, keyboard + file)
- `src/commands/stop.ts`: ≥80% (CLI command logic)

### Integration Tests

- **Scenarios covered**: ≥90% of user workflows
- **Files**: 1 integration test file covering end-to-end stop behavior

## Test Scenarios

### Layer 1: Unit Tests (StopSignal Class)

**File**: `tests/unit/services/stop-signal.test.ts`

#### Test Suite: Initialization

**Scenario 1.1**: Constructor

- [ ] Accepts workspace path parameter
- [ ] Accepts optional enableKeyboard parameter (default: true)
- [ ] Stores workspace path correctly
- [ ] Constructs stop file path: `{workspacePath}/.stop`

**Scenario 1.2**: init() method - file detection

- [ ] Detects existing .stop file (sets stopRequested=true, source='file')
- [ ] Handles missing .stop file (stopRequested=false, source=null)
- [ ] Handles file system errors (logs error, continues)

**Scenario 1.3**: init() method - keyboard listener

- [ ] Sets up keyboard listener when TTY available and enableKeyboard=true
- [ ] Skips keyboard listener when TTY not available
- [ ] Skips keyboard listener when enableKeyboard=false
- [ ] Stores cleanup function for later use

**Test Data**:

```typescript
// Mock workspace path
const workspacePath = '/test/workspace';
const stopFilePath = '/test/workspace/.stop';

// Mock TTY availability
vi.spyOn(process.stdin, 'isTTY', 'get').mockReturnValue(true);

// Mock file system
vi.mock('fs/promises', () => ({
  access: vi.fn(),
  unlink: vi.fn(),
  writeFile: vi.fn(),
}));
```

#### Test Suite: Stop State Management

**Scenario 2.1**: isStopRequested() method

- [ ] Returns false initially
- [ ] Returns true after stop requested via file
- [ ] Returns true after stop requested via keyboard
- [ ] Returns false after toggle cancels stop

**Scenario 2.2**: toggle() method

- [ ] Toggles stopRequested from false to true
- [ ] Toggles stopRequested from true to false
- [ ] Sets source to 'keyboard' when toggling to true
- [ ] Sets source to null when toggling to false
- [ ] Can be called multiple times

**Scenario 2.3**: getState() method

- [ ] Returns { requested: false, source: null } initially
- [ ] Returns { requested: true, source: 'file' } after file detection
- [ ] Returns { requested: true, source: 'keyboard' } after keyboard toggle
- [ ] Returns { requested: false, source: null } after cancel

#### Test Suite: Keyboard Listener

**Scenario 3.1**: setupKeyboardListener() function

- [ ] Returns no-op cleanup when not TTY
- [ ] Enables raw mode on stdin
- [ ] Sets up keypress event listener
- [ ] Calls toggle() when 's' key pressed
- [ ] Calls toggle() when 'S' key pressed (uppercase)
- [ ] Ignores other keys (a-z except s, numbers, special chars)
- [ ] Returns cleanup function that disables raw mode
- [ ] Returns cleanup function that removes event listener

**Scenario 3.2**: Keyboard listener edge cases

- [ ] Handles error when setRawMode() not available
- [ ] Doesn't crash if stdin is not available
- [ ] Cleanup is idempotent (can call multiple times)

**Mocking Strategy**:

```typescript
// Mock stdin
vi.spyOn(process.stdin, 'isTTY', 'get').mockReturnValue(true);
vi.spyOn(process.stdin, 'setRawMode').mockImplementation(() => {});
vi.spyOn(process.stdin, 'on').mockImplementation(() => {});
vi.spyOn(process.stdin, 'off').mockImplementation(() => {});

// Simulate key press
const simulateKeyPress = (key: string) => {
  const handlers = process.stdin.on.mock.calls
    .filter((call) => call[0] === 'keypress')
    .map((call) => call[1]);
  handlers.forEach((handler) => handler(key, { name: key }));
};

// Test
simulateKeyPress('s');
expect(stopSignal.isStopRequested()).toBe(true);
```

#### Test Suite: Cleanup

**Scenario 4.1**: cleanup() method

- [ ] Calls keyboard listener cleanup function
- [ ] Deletes .stop file when deleteFile=true (default)
- [ ] Keeps .stop file when deleteFile=false
- [ ] Handles missing .stop file (no error)
- [ ] Handles file system errors (logs, doesn't throw)
- [ ] Can be called multiple times safely (idempotent)
- [ ] Disables raw mode on stdin

### Layer 2: Unit Tests (Stop Command)

**File**: `tests/unit/commands/stop.test.ts`

#### Test Suite: Command Definition

**Scenario 5.1**: Command structure

- [ ] Command name is 'stop'
- [ ] Has description
- [ ] Accepts `<name>` argument (workspace name)
- [ ] No options defined
- [ ] Action function defined

#### Test Suite: Command Execution

**Scenario 5.2**: Successful stop signal

- [ ] Validates workspace exists
- [ ] Creates .stop file in workspace directory
- [ ] File contains timestamp
- [ ] Outputs success message
- [ ] Outputs cancellation instructions
- [ ] Exit code 0

**Scenario 5.3**: Workspace not found

- [ ] Detects missing workspace
- [ ] Outputs error message
- [ ] Exit code 1
- [ ] Does not create .stop file

**Scenario 5.4**: File system errors

- [ ] Handles permission errors
- [ ] Handles disk full errors
- [ ] Outputs error message
- [ ] Exit code 1

**Test Data**:

```typescript
// Mock config manager
vi.mock('../core/config-manager.js', () => ({
  ConfigManager: {
    load: vi.fn().mockResolvedValue({
      get: vi.fn((key) => {
        if (key === 'workspacesDir') return '/test/workspaces';
      }),
    }),
  },
}));

// Mock workspace path
const workspaceName = 'my-task';
const workspacePath = '/test/workspaces/my-task';
const stopFilePath = '/test/workspaces/my-task/.stop';

// Mock file system
vi.mock('fs/promises', () => ({
  access: vi.fn().mockResolvedValue(undefined), // Workspace exists
  writeFile: vi.fn().mockResolvedValue(undefined),
}));
```

### Layer 3: Integration Tests

**File**: `tests/integration/graceful-stop.test.ts`

#### Test Suite: End-to-End Stop Flows

**Scenario 6.1**: Keyboard stop flow (TTY mode)

- [ ] Initialize StopSignal with TTY enabled
- [ ] Call init()
- [ ] Simulate 's' key press
- [ ] Verify stopRequested becomes true
- [ ] Verify source is 'keyboard'
- [ ] Simulate 's' key press again (cancel)
- [ ] Verify stopRequested becomes false
- [ ] Call cleanup()
- [ ] Verify keyboard listener removed

**Scenario 6.2**: File-based stop flow

- [ ] Create .stop file in workspace
- [ ] Initialize StopSignal
- [ ] Call init()
- [ ] Verify stopRequested is true (detected existing file)
- [ ] Verify source is 'file'
- [ ] Call cleanup(deleteFile=true)
- [ ] Verify .stop file deleted

**Scenario 6.3**: Stop during iteration (integration with run command)

- [ ] Mock run command iteration loop
- [ ] Start iteration loop
- [ ] After 3 iterations, create .stop file
- [ ] Verify current iteration (3) completes
- [ ] Verify loop breaks before iteration 4
- [ ] Verify stop message logged
- [ ] Verify cleanup called

**Scenario 6.4**: Toggle cancel flow

- [ ] Initialize StopSignal
- [ ] Simulate 's' key press (stop requested)
- [ ] Verify stop indicator appears in UI (mock stats update)
- [ ] Simulate 's' key press again (cancel)
- [ ] Verify stop indicator disappears from UI
- [ ] Verify iteration loop continues normally

**Scenario 6.5**: Non-TTY mode (CI/CD)

- [ ] Initialize StopSignal with TTY disabled
- [ ] Call init()
- [ ] Verify keyboard listener not created
- [ ] Create .stop file
- [ ] Verify file-based stop still works
- [ ] Call cleanup()
- [ ] Verify .stop file deleted

**Test Data**:

```typescript
// Mock stats object
const stats: IterationStats = {
  currentIteration: 3,
  maxIterations: 50,
  stopRequested: false,
  stopSource: null,
  // ... other fields
};

// Mock iteration function
const executeIteration = vi.fn().mockResolvedValue(undefined);

// Simulate iteration loop
for (let i = 0; i < maxIterations; i++) {
  await executeIteration();

  stats.currentIteration = i + 1;
  stats.stopRequested = stopSignal.isStopRequested();
  stats.stopSource = stopSignal.getState().source;

  if (stopSignal.isStopRequested()) {
    break;
  }
}
```

## Error Scenarios

### Error 1: setRawMode() not available

**Condition**: `process.stdin.setRawMode` is undefined (some environments)
**Expected behavior**: Skip keyboard listener, continue with file-based stop only
**Test**: Mock `setRawMode` as undefined

### Error 2: File system error creating .stop file

**Condition**: `writeFile()` throws EACCES (permission denied)
**Expected behavior**: Catch error, show error message, exit code 1
**Test**: Mock `writeFile` to throw error

### Error 3: File system error deleting .stop file

**Condition**: `unlink()` throws error during cleanup
**Expected behavior**: Catch error, log debug message, continue (don't crash)
**Test**: Mock `unlink` to throw error

### Error 4: Workspace not found for stop command

**Condition**: Workspace path doesn't exist
**Expected behavior**: Show error message, exit code 1, don't create .stop file
**Test**: Mock `access()` to throw error

### Error 5: Multiple cleanup calls

**Condition**: `cleanup()` called multiple times
**Expected behavior**: Idempotent (no errors, no duplicate operations)
**Test**: Call `cleanup()` 3 times in a row

## Edge Cases

### Edge Case 1: .stop file exists before init

**Condition**: .stop file already exists when StopSignal is initialized
**Expected**: Detects file, sets stopRequested=true, source='file'

### Edge Case 2: Both keyboard and file stop

**Condition**: User presses 's' key, then .stop file is created
**Expected**: Stop remains requested, source stays 'keyboard' (first source wins)

### Edge Case 3: Toggle during non-TTY

**Condition**: Call `toggle()` manually when TTY not available
**Expected**: Works correctly (toggle is public method, can be called anytime)

### Edge Case 4: Cleanup without init

**Condition**: Call `cleanup()` before calling `init()`
**Expected**: No errors, safe no-op

### Edge Case 5: Stop file contains invalid content

**Condition**: .stop file exists but is empty or has invalid format
**Expected**: Still detects file (content doesn't matter, only existence)

### Edge Case 6: Keyboard listener in Docker

**Condition**: Running in Docker container without TTY
**Expected**: `process.stdin.isTTY` is false, keyboard listener not created

## Cross-Platform Tests

### Platform 1: Windows (legacy console)

**Environment**: Windows without `WT_SESSION`
**Expected**: Keyboard listener may not work, file-based stop works
**Test**: Mock `process.platform = 'win32'`, `process.env.WT_SESSION = undefined`

### Platform 2: Windows Terminal

**Environment**: Windows with `WT_SESSION`
**Expected**: Keyboard listener works, file-based stop works
**Test**: Mock `process.platform = 'win32'`, `process.env.WT_SESSION = 'guid'`

### Platform 3: macOS

**Environment**: macOS Terminal.app
**Expected**: Keyboard listener works, file-based stop works
**Test**: Mock `process.platform = 'darwin'`

### Platform 4: Linux

**Environment**: Various Linux terminals
**Expected**: Keyboard listener works, file-based stop works
**Test**: Mock `process.platform = 'linux'`

### Platform 5: CI/CD (non-TTY)

**Environment**: GitHub Actions, Docker
**Expected**: Keyboard listener not created, file-based stop works
**Test**: Mock `process.stdout.isTTY = false`

## Test Data

### Sample Workspace Paths

```typescript
const workspacePathLinux = '/home/user/claude-iterate/workspaces/my-task';
const workspacePathMac = '/Users/user/claude-iterate/workspaces/my-task';
const workspacePathWindows =
  'C:\\Users\\user\\claude-iterate\\workspaces\\my-task';
```

### Sample .stop File Content

```
Stop requested at 2025-10-28T14:30:00.000Z
```

### Sample Key Press Events

```typescript
// Lowercase 's'
{ str: 's', key: { name: 's', sequence: 's', ctrl: false } }

// Uppercase 'S'
{ str: 'S', key: { name: 'S', sequence: 'S', shift: true } }

// Other keys (should be ignored)
{ str: 'a', key: { name: 'a', sequence: 'a', ctrl: false } }
{ str: '\x03', key: { name: 'c', sequence: '\x03', ctrl: true } } // CTRL+C
```

## Mocking Strategy

### Mock 1: process.stdin

```typescript
vi.spyOn(process.stdin, 'isTTY', 'get').mockReturnValue(true);
vi.spyOn(process.stdin, 'setRawMode').mockImplementation(() => {});
vi.spyOn(process.stdin, 'on').mockImplementation(() => {});
vi.spyOn(process.stdin, 'off').mockImplementation(() => {});
```

### Mock 2: fs/promises

```typescript
vi.mock('fs/promises', () => ({
  access: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));
```

### Mock 3: readline

```typescript
vi.mock('readline', () => ({
  emitKeypressEvents: vi.fn(),
}));
```

### Mock 4: Workspace path resolution

```typescript
vi.mock('../utils/paths.js', () => ({
  getWorkspacePath: vi.fn((name, baseDir) => `${baseDir}/${name}`),
}));
```

## Performance Benchmarks

### Benchmark 1: Stop check overhead

**Metric**: Time to execute `stopSignal.isStopRequested()`
**Target**: <1ms per call
**Measurement**: Use `performance.now()` before/after
**Test**:

```typescript
const start = performance.now();
for (let i = 0; i < 1000; i++) {
  stopSignal.isStopRequested();
}
const end = performance.now();
expect((end - start) / 1000).toBeLessThan(1);
```

### Benchmark 2: File check overhead

**Metric**: Time to check .stop file existence
**Target**: <10ms per check
**Measurement**: Use `performance.now()` before/after `access()`
**Test**:

```typescript
const start = performance.now();
await checkStopFile(workspacePath);
const end = performance.now();
expect(end - start).toBeLessThan(10);
```

## Quality Gates

### Pre-Merge Checklist

- [ ] All unit tests pass: `npm test`
- [ ] Coverage ≥80%: Check coverage report
- [ ] All integration tests pass
- [ ] Performance benchmarks met (<1ms stop check)
- [ ] Cross-platform tests pass (Windows, macOS, Linux)
- [ ] No flaky tests (run 10 times, all pass)
- [ ] Error scenarios tested

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

## Acceptance Tests (Manual)

### Manual Test 1: Keyboard stop in terminal

1. Run `claude-iterate run my-task` in terminal
2. Wait for iteration 2-3 to start
3. Press 's' key
4. Verify stop indicator appears immediately
5. Verify current iteration completes
6. Verify execution stops gracefully
7. Verify .stop file deleted

### Manual Test 2: File-based stop from another terminal

1. Terminal 1: Run `claude-iterate run my-task`
2. Terminal 2: Run `claude-iterate stop my-task`
3. Terminal 1: Verify stop indicator appears
4. Terminal 1: Verify current iteration completes, then stops
5. Verify .stop file deleted after stop

### Manual Test 3: Cancel stop request

1. Run `claude-iterate run my-task`
2. Press 's' key (stop requested)
3. Verify stop indicator appears
4. Press 's' key again (cancel)
5. Verify stop indicator disappears
6. Verify execution continues normally

### Manual Test 4: CTRL+C still works

1. Run `claude-iterate run my-task`
2. Press CTRL+C during iteration
3. Verify execution stops immediately (doesn't wait for iteration)
4. Verify cleanup called (keyboard listener removed)
