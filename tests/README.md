# Testing Strategy - Process Cleanup

## Overview

This directory contains tests for the process cleanup implementation in `claude-iterate`. The tests are designed to be **fast, reliable, and easy to run** without requiring expensive resources or manual intervention.

## Test Pyramid

```
    ┌─────────────┐
    │ Integration │  ← Real processes, slower (~5-10s)
    │   (1 file)  │
    ├─────────────┤
    │    Unit     │  ← Mocked, fast (~1-2s)
    │  (1 file)   │
    ├─────────────┤
    │    Smoke    │  ← Quick sanity check (~1s)
    │  (1 script) │
    └─────────────┘
```

## Quick Start

```bash
# Fast unit tests only (1-2 seconds)
npm run test:quick

# Smoke test (1 second)
npm run test:smoke

# All cleanup tests (5-10 seconds)
npm run test:cleanup

# All tests in project
npm test
```

## Test Files

### 1. Unit Tests (Fast ⚡)
**File**: `tests/unit/claude-client.test.ts`
**Runtime**: ~2 seconds
**Coverage**: 13 tests

Uses mocked child processes to test:
- ✅ Graceful shutdown with SIGTERM
- ✅ Force kill with SIGKILL after timeout
- ✅ Child process tracking
- ✅ Cleanup on normal exit
- ✅ Cleanup on error exit
- ✅ Cleanup on spawn error
- ✅ State management (isShuttingDown, hasRunningChild)

**Why fast**: No real processes spawned, all behavior mocked

**Run**: `npm run test:quick`

### 2. Integration Tests (Realistic 🔄)
**File**: `tests/integration/process-cleanup.test.ts`
**Runtime**: ~5-10 seconds
**Coverage**: 5 tests

Uses real processes (sleep command) to test:
- ✅ Real process spawn and tracking
- ✅ Graceful shutdown behavior
- ✅ Force kill after grace period
- ✅ Zombie prevention
- ✅ Process state verification

**Why slower**: Spawns real processes, waits for timeouts

**Run**: `npm run test:integration`

### 3. Smoke Test (Sanity Check 🚀)
**File**: `tests/smoke-test.sh`
**Runtime**: ~1 second
**Coverage**: Basic zombie check

Quick bash script that:
- Counts zombies before
- Runs sleep with timeout
- Counts zombies after
- Verifies no new zombies

**Why fastest**: Minimal setup, single process check

**Run**: `npm run test:smoke`

## Test Strategy

### When to Run What

**During Development** (every few minutes):
```bash
npm run test:quick
```
- Fast feedback loop
- Catches logic errors
- No waiting

**Before Commit** (before git commit):
```bash
npm run test:cleanup
```
- Runs both unit and integration
- Verifies real behavior
- ~5-10 seconds total

**In CI/CD** (automated pipeline):
```bash
npm test
```
- Full test suite
- All features validated
- Coverage report

**Quick Sanity Check** (after changes):
```bash
npm run test:smoke
```
- 1-second validation
- Confirms no zombies
- Good for rapid iteration

## How Tests Validate Process Cleanup

### Unit Tests Verify:
1. **Child tracking**: `currentChild` is set/unset correctly
2. **Shutdown flag**: `isShuttingDown` prevents new processes
3. **Signal cascade**: SIGTERM → wait → SIGKILL
4. **Cleanup paths**: All exit paths clean up properly
5. **Error handling**: Failures don't leave orphans

### Integration Tests Verify:
1. **Real termination**: Actual processes are killed
2. **Timing**: Grace periods work correctly
3. **Zombie prevention**: OS doesn't create zombies
4. **Process states**: PID checks confirm cleanup

### Smoke Test Verifies:
1. **Basic functionality**: Can kill processes
2. **No regressions**: Zombie count unchanged
3. **Quick validation**: Fast sanity check

## Test Output Examples

### ✅ Passing Tests
```
 ✓ tests/unit/claude-client.test.ts (13 tests) 268ms
 Test Files  1 passed (1)
      Tests  13 passed (13)
```

### ❌ Failing Tests
```
 FAIL  tests/unit/claude-client.test.ts
   × should cleanup currentChild reference
     → expected true to be false
```

### 🔍 Verbose Mode
```bash
npm run test:quick -- --reporter=verbose
```

## Debugging Failed Tests

### If Unit Tests Fail:
1. Check mock setup in `beforeEach()`
2. Verify timing issues (add more await delays)
3. Check that cleanup logic matches implementation

### If Integration Tests Fail:
1. Check if `sleep` command is available
2. Verify no other processes interfering
3. Check zombie count before test (should be stable)

### If Smoke Test Fails:
1. Run manually: `./tests/smoke-test.sh`
2. Check for existing sleep zombies: `ps aux | grep "sleep.*defunct"`
3. Verify timeout command works: `timeout --version`

## Adding New Tests

### For New Cleanup Features:
1. Add unit test in `claude-client.test.ts`
2. Add integration test if behavior changes
3. Keep smoke test simple (don't modify)

### Test Template:
```typescript
it('should [expected behavior]', async () => {
  // Arrange
  const promise = client.executeNonInteractive('test');
  await new Promise(resolve => setTimeout(resolve, 5));

  // Act
  await client.shutdown();

  // Assert
  expect(client.hasRunningChild()).toBe(false);
});
```

## Performance Goals

| Test Type    | Target Time | Actual |
|--------------|-------------|--------|
| Unit         | < 3 seconds | ~2s    |
| Integration  | < 15 seconds| ~8s    |
| Smoke        | < 2 seconds | ~1s    |
| Full Suite   | < 30 seconds| ~10s   |

## Coverage

Current coverage for process cleanup:
- `ClaudeClient.shutdown()`: ✅ 100%
- `ClaudeClient.kill()`: ✅ 100%
- `ClaudeClient.hasRunningChild()`: ✅ 100%
- Signal handlers in `run.ts`: ⚠️ Not unit tested (integration only)

## FAQ

**Q: Why mock child processes in unit tests?**
A: Speed. Real processes take seconds, mocks take milliseconds. Unit tests should be fast.

**Q: Why have both unit and integration tests?**
A: Unit tests catch logic errors fast. Integration tests catch real-world issues (zombie creation, timing, OS behavior).

**Q: Can I skip integration tests during dev?**
A: Yes! Use `npm run test:quick` for rapid feedback. Run integration before commit.

**Q: How do I test just my changes?**
A: `npm run test:quick` runs only the cleanup tests, which is perfect for iterating on cleanup logic.

**Q: What if tests are flaky?**
A: Integration tests may be flaky due to timing. Add more delay, or increase timeouts. Unit tests should never be flaky.

## Maintenance

### Update Tests When:
- Changing shutdown logic
- Adding new cleanup paths
- Modifying grace periods
- Adding new process types

### Don't Update Tests When:
- Changing log messages
- Refactoring without behavior changes
- Adding unrelated features

## Related Documentation

- Implementation: `src/services/claude-client.ts`
- Usage: `src/commands/run.ts`
- Manual testing: `tmp/manual-test-cleanup.md`
