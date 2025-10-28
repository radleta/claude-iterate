# Testing Specification: Execution

## Test Coverage Targets

- **Unit Test Coverage**: >=80% for business logic (ClaudeClient, ConsoleReporter, FileLogger, StreamJsonFormatter)
- **Integration Test Coverage**: All CLI commands with various option combinations
- **End-to-End Test Coverage**: Full execution loop with mock Claude (no real Claude calls)
- **Performance Test Coverage**: Zombie process detection timeout, log buffer flushing

## Testing Layers

### Layer 1: Unit Tests

**Scope:**

- ClaudeClient process management
- ConsoleReporter output filtering
- FileLogger file operations
- StreamJsonFormatter event parsing
- StatusManager file reading
- CompletionDetector completion logic
- Mode strategy prompt generation

**Key Test Scenarios:**

1. **ClaudeClient - Process Cleanup**
   - Valid Claude execution returns stdout
   - Failed Claude execution throws error with exit code
   - Graceful shutdown sends SIGTERM and waits
   - Force shutdown sends SIGKILL after grace period
   - Zombie process timeout resolves with stdout after 5 minutes
   - Shutdown prevents new processes
   - Kill terminates running process

2. **ClaudeClient - Execution Methods**
   - executeNonInteractive() pipes stdout/stderr
   - executeNonInteractive() calls onStdout/onStderr callbacks
   - executeWithToolVisibility() attaches StreamJsonFormatter
   - executeWithToolVisibility() calls onToolEvent callbacks
   - executeWithToolVisibility() extracts final result from stream

3. **ConsoleReporter - Output Levels**
   - Quiet mode: Only errors/warnings shown
   - Progress mode: Progress/status messages shown, no verbose
   - Verbose mode: All messages shown including tool events
   - Stream method: Only outputs in verbose mode

4. **FileLogger - File Operations**
   - Creates timestamped log file with header
   - Logs run metadata once at start
   - Logs instructions once
   - Logs system prompt once
   - Logs iteration start with timestamp
   - Buffers output with 10KB threshold
   - Flushes buffer at iteration completion
   - Logs errors with stack traces
   - Disables on file write failure (graceful)

5. **StreamJsonFormatter - Event Parsing**
   - Parses tool_use events (assistant message)
   - Parses tool_result events (user message)
   - Parses text events (assistant text)
   - Formats Read tool with file path and line preview
   - Formats Edit tool with old/new strings (never truncated)
   - Formats Write tool with file path and size
   - Formats Bash tool with command and exit code
   - Detects errors in tool results
   - Extracts final result from result event
   - Handles parse errors gracefully (strict: false)

6. **StatusManager - Status File**
   - Reads valid .status.json file
   - Returns default status if file missing
   - Returns default status if file invalid (parse error)
   - Validates schema with Zod
   - Extracts completion flag
   - Extracts progress counts (loop mode)
   - Extracts worked flag (iterative mode)

7. **CompletionDetector - Completion Logic**
   - Uses StatusManager as primary source
   - Checks complete flag in .status.json
   - Extracts remaining count from progress
   - Returns null remaining count if no progress field
   - Falls back to TODO.md if .status.json invalid (legacy)

**Example Test:**

```typescript
describe('ClaudeClient - Process Cleanup', () => {
  it('should gracefully shutdown when child process is running', async () => {
    const client = new ClaudeClient('claude', ['--test']);

    // Start a process
    void client.executeNonInteractive('test');
    await delay(50); // Wait for registration

    expect(client.hasRunningChild()).toBe(true);

    // Shutdown
    await client.shutdown(100);

    expect(client.hasRunningChild()).toBe(false);
    expect(client.isShutdown()).toBe(true);
  });

  it('should force kill with SIGKILL after grace period', async () => {
    const client = new ClaudeClient('claude', ['--test']);
    const mockChild = mockChildProcess(); // Mock that doesn't respond to SIGTERM

    void client.executeNonInteractive('test').catch(() => {});
    await delay(50);

    await client.shutdown(50); // Short grace period

    expect(mockChild.kill).toHaveBeenCalledWith('SIGKILL');
  });
});
```

### Layer 2: Integration Tests

**Scope:**

- CLI command invocation with various options
- Configuration loading with overrides
- Workspace loading and validation
- Claude client initialization
- Iteration loop execution (with mock Claude)
- Notification sending
- Status file watching

**Key Test Scenarios:**

1. **CLI Command - Option Parsing**
   - Parse `<name>` argument
   - Parse `-m, --max-iterations <number>`
   - Parse `-d, --delay <seconds>`
   - Parse `--no-delay` flag
   - Parse `--stagnation-threshold <number>`
   - Parse `-v, --verbose` flag
   - Parse `-q, --quiet` flag
   - Parse `--output <level>` option
   - Parse `--dangerously-skip-permissions` flag
   - Parse `--dry-run` flag
   - Reject mutually exclusive flags (verbose + quiet)
   - Reject mutually exclusive flags (verbose + output)
   - Reject mutually exclusive flags (quiet + output)

2. **Configuration Loading**
   - Load project config from .claude-iterate.json
   - Load user config from ~/.config/claude-iterate/config.json
   - Load workspace config from .metadata.json
   - Apply CLI overrides
   - Merge configurations with correct precedence
   - Extract runtime config values

3. **Workspace Validation**
   - Error if workspace doesn't exist
   - Error if INSTRUCTIONS.md doesn't exist
   - Load workspace metadata successfully
   - Load workspace instructions successfully

4. **Execution Loop (Mock Claude)**
   - Run single iteration successfully
   - Run multiple iterations until completion
   - Stop at max iterations
   - Detect stagnation in iterative mode
   - Handle Claude execution errors
   - Increment iteration counters
   - Update workspace metadata
   - Create log file with correct format

5. **Notifications**
   - Send execution_start notification
   - Send iteration notifications
   - Send milestone notifications (every 10)
   - Send status_update notifications (from watcher)
   - Send completion notification
   - Send error notifications
   - Include correct payload and tags

6. **Status File Watching**
   - Start watcher on execution start
   - Detect .status.json changes
   - Debounce changes (2 seconds)
   - Filter timestamp-only changes
   - Calculate progress delta
   - Emit statusChanged event
   - Stop watcher on execution end

### Layer 3: End-to-End Tests

**Scope:**

- Complete user workflows from CLI invocation to completion
- Multi-iteration execution
- Error handling and recovery
- Graceful shutdown

**Key User Flows:**

1. **Happy Path: Loop Mode**
   - Step 1: `claude-iterate run my-task` → Loads workspace
   - Step 2: Iteration 1 → Completes 1 item (5 remaining)
   - Step 3: Iteration 2 → Completes 1 item (4 remaining)
   - Step 4: Iteration 3 → Completes 1 item (3 remaining)
   - Step 5: Iteration 4 → Completes 1 item (2 remaining)
   - Step 6: Iteration 5 → Completes 1 item (1 remaining)
   - Step 7: Iteration 6 → Completes 1 item (0 remaining)
   - Validation: Task marked complete, completion notification sent, log file created

2. **Happy Path: Iterative Mode**
   - Step 1: `claude-iterate run my-task` → Loads workspace (iterative mode)
   - Step 2: Iteration 1 → Completes multiple items (worked: true)
   - Step 3: Iteration 2 → Completes multiple items (worked: true)
   - Step 4: Iteration 3 → No work (worked: false, noWorkCount: 1)
   - Step 5: Iteration 4 → No work (worked: false, noWorkCount: 2)
   - Validation: Stagnation detected, task marked complete, notification sent

3. **Max Iterations Reached**
   - Step 1: `claude-iterate run my-task -m 3` → Sets max iterations to 3
   - Step 2: Iteration 1 → Incomplete
   - Step 3: Iteration 2 → Incomplete
   - Step 4: Iteration 3 → Incomplete
   - Validation: Warning displayed, exit code 0, suggestions shown

4. **Graceful Shutdown (Ctrl+C)**
   - Step 1: Start execution → Iteration loop begins
   - Step 2: User presses Ctrl+C → SIGINT signal sent
   - Step 3: Graceful shutdown initiated → SIGTERM to Claude
   - Step 4: Claude exits → Cleanup complete
   - Validation: Log buffers flushed, exit code 0, no zombie processes

5. **Error Recovery**
   - Step 1: Start execution → Iteration 1 succeeds
   - Step 2: Iteration 2 → Claude exits with non-zero code
   - Validation: Error logged, error notification sent, workspace marked error, exit code 1

### Layer 4: Performance Tests

**Performance Benchmarks:**

| Operation                | Target          | Acceptable | Unacceptable |
| ------------------------ | --------------- | ---------- | ------------ |
| CLI startup time         | < 200ms         | < 500ms    | > 1s         |
| Config loading           | < 50ms          | < 100ms    | > 500ms      |
| Log buffer flush         | < 10ms          | < 50ms     | > 100ms      |
| Status file read         | < 10ms          | < 50ms     | > 100ms      |
| Stream-json parsing      | < 5ms per event | < 10ms     | > 50ms       |
| Zombie detection timeout | 5 minutes       | 5 minutes  | > 5 minutes  |

**Load Test Scenarios:**

1. **Long-running execution**: 100 iterations with 2s delay → Completes in ~200s
2. **Large log files**: 100 iterations with 10KB output each → Log file ~1MB
3. **Frequent status updates**: Status file changes every second → Debounced to 2s
4. **Tool event parsing**: 1000 tool events per iteration → Parses without blocking

## Error Scenarios

### Error Test Cases

1. **Invalid Workspace**
   - Missing workspace directory
   - Expected: Exit code 1, message "Workspace not found"

2. **Missing Instructions**
   - Workspace exists but no INSTRUCTIONS.md
   - Expected: Exit code 1, message "Instructions not found. Run setup first"

3. **Claude Not Found**
   - Claude CLI not in PATH
   - Expected: Exit code 1, message "Claude CLI not found"

4. **Claude Execution Failure**
   - Claude exits with non-zero code
   - Expected: Exit code 1, error logged, error notification sent

5. **Mutually Exclusive Flags**
   - `--verbose --quiet` provided
   - Expected: Exit code 1, message "Cannot use multiple output flags together"

6. **Invalid Config Values**
   - Invalid outputLevel in config
   - Expected: Use default value, warning logged

7. **Log File Write Failure**
   - Cannot write to log directory (permissions)
   - Expected: Logging disabled gracefully, execution continues

8. **Status File Parse Error**
   - Invalid JSON in .status.json
   - Expected: Fall back to default status, warning logged

9. **Zombie Process**
   - Claude process doesn't emit exit event
   - Expected: Timeout after 5 minutes, resolve with stdout

## Edge Cases

1. **First Iteration No Work (Iterative Mode)**
   - Condition: Claude reports `worked: false` on iteration 1
   - Expected Behavior: Increment noWorkCount to 1, continue (threshold typically 2)
   - Test: Verify doesn't complete prematurely

2. **Max Iterations = 1**
   - Condition: User sets `--max-iterations 1`
   - Expected Behavior: Run exactly 1 iteration, then stop
   - Test: Verify loop exits after 1 iteration

3. **Delay = 0**
   - Condition: User sets `--no-delay`
   - Expected Behavior: No delay between iterations
   - Test: Verify iterations run back-to-back

4. **Stagnation Threshold = 0**
   - Condition: User sets `--stagnation-threshold 0`
   - Expected Behavior: Stagnation detection disabled
   - Test: Verify loop continues even with multiple no-work iterations

5. **Empty Instructions**
   - Condition: INSTRUCTIONS.md exists but is empty
   - Expected Behavior: Execution proceeds (Claude will ask for clarification)
   - Test: Verify no crash, prompt sent to Claude

6. **Status File Changes During Iteration**
   - Condition: .status.json updated while Claude is running
   - Expected Behavior: Watcher triggers notification, iteration continues
   - Test: Verify notification sent, no interruption

7. **Multiple Run Commands Simultaneously**
   - Condition: User runs `claude-iterate run my-task` twice
   - Expected Behavior: Two separate Claude processes
   - Test: Document behavior, note no workspace locking

8. **Very Large Output (>10KB per iteration)**
   - Condition: Claude generates >10KB of output
   - Expected Behavior: Auto-flush at 10KB threshold
   - Test: Verify buffer doesn't grow unbounded

## Test Data Requirements

### Test Workspace

- Directory: `tests/fixtures/workspaces/test-execution/`
- Files:
  - `.metadata.json` with valid metadata
  - `INSTRUCTIONS.md` with test instructions
  - `TODO.md` with test TODO items
  - `.status.json` with test status

### Test Configurations

```typescript
// Loop mode workspace
const loopWorkspace = {
  mode: 'loop',
  maxIterations: 50,
  stagnationThreshold: 2,
};

// Iterative mode workspace
const iterativeWorkspace = {
  mode: 'iterative',
  maxIterations: 20,
  stagnationThreshold: 2,
};

// Test config
const testConfig = {
  workspacesDir: 'tests/fixtures/workspaces',
  outputLevel: 'progress',
  claudeCommand: 'node',
  claudeArgs: ['tests/mocks/mock-claude.cjs'],
};
```

### Mock Claude Responses

```typescript
// Success response
const successResponse = {
  stdout: 'Iteration complete\n',
  stderr: '',
  exitCode: 0,
};

// Error response
const errorResponse = {
  stdout: '',
  stderr: 'Error: Something went wrong\n',
  exitCode: 1,
};

// Tool use event (stream-json)
const toolUseEvent = {
  type: 'assistant',
  message: {
    content: [
      {
        type: 'tool_use',
        name: 'Read',
        input: { file_path: '/path/to/file' },
      },
    ],
  },
};

// Tool result event (stream-json)
const toolResultEvent = {
  type: 'user',
  message: {
    content: [
      {
        type: 'tool_result',
        content: 'File contents...',
        is_error: false,
      },
    ],
  },
};
```

## Security Testing

**Security Test Cases:**

- [ ] Command injection via user prompts (tested: no shell interpolation)
- [ ] Path traversal in log file paths (tested: log directory sanitized)
- [ ] Sensitive data in log files (documented: user responsibility)
- [ ] Permission prompts bypassed (tested: flag warning displayed)
- [ ] Zombie processes on shutdown (tested: graceful shutdown + SIGKILL)
- [ ] Resource exhaustion (tested: log buffer limit, single process)

## Testing Strategy

### Local Development

- Run unit tests on every file save (vitest watch mode)
- Run full test suite before committing
- Use mock Claude client (no real API calls)
- Fast feedback loop (<5 seconds for all tests)

### CI/CD Pipeline

- Run all tests on every pull request
- Block merge if tests fail
- Run on multiple platforms (Linux, macOS, Windows)
- 228 tests passing (all mocked)

### Test Environments

- **Local**: Developer machines with mock Claude
- **CI**: GitHub Actions with Node 18+
- **Test Fixtures**: `tests/fixtures/` directory with sample workspaces
- **Mock Claude**: `tests/mocks/claude-client.mock.ts` and `mock-claude.cjs`

## Test Maintenance

- Update tests when SPEC.md changes
- Update mock responses when Claude CLI output format changes
- Refactor tests to reduce duplication (shared fixtures)
- Keep test data fixtures synchronized with metadata schema
- Review performance benchmarks quarterly

---

## Test Checklist

Before marking feature as complete:

- [x] All unit tests written and passing (ClaudeClient, ConsoleReporter, FileLogger, etc.)
- [x] All integration tests written (CLI command parsing, config loading, execution loop)
- [x] All e2e tests written (complete workflows from CLI to completion)
- [x] Performance benchmarks met (startup time, zombie timeout)
- [x] All error scenarios tested (invalid workspace, Claude not found, etc.)
- [x] All edge cases covered (first iteration no work, max iterations = 1, etc.)
- [x] Security tests passing (command injection, path traversal, etc.)
- [x] Test coverage meets minimum thresholds (>=80%)
- [x] Tests documented and maintainable (mock Claude client)
- [x] CI/CD pipeline configured correctly (GitHub Actions, 228 passing tests)
