# Testing Specification: Notifications

## Test Coverage Targets

- **Unit Test Coverage**: ≥80% line coverage for notification service and status file watcher
- **Integration Test Coverage**: All notification event types and configuration scenarios
- **End-to-End Test Coverage**: Full notification flow from command execution to HTTP POST
- **Performance Test Coverage**: Debouncing behavior and rapid file change handling

## Testing Layers

### Layer 1: Unit Tests

**Scope:**

- NotificationService methods (`send`, `isConfigured`, `shouldNotify`)
- StatusFileWatcher lifecycle (`start`, `stop`)
- Debouncing logic
- Meaningful change detection
- Delta calculation
- Error handling

**Key Test Scenarios:**

1. **NotificationService.send()**
   - Valid request → HTTP POST sent with correct headers and body
   - Title header → Included in request
   - Priority header → Included in request
   - Tags header → Comma-joined in request
   - All headers combined → All headers present
   - HTTP error response → Returns `false`, logs warning
   - Network error → Returns `false`, logs warning
   - Content-Type header → Always `text/plain`

2. **NotificationService.isConfigured()**
   - notifyUrl exists → Returns `true`
   - notifyUrl undefined → Returns `false`
   - notifyUrl empty string → Returns `false`
   - notifyUrl whitespace → Returns `false`

3. **NotificationService.shouldNotify()**
   - notifyEvents includes 'all' → Returns `true` for all events
   - notifyEvents includes specific event → Returns `true` for that event
   - notifyEvents does not include event → Returns `false`
   - Empty notifyEvents array → Returns `false` for all events
   - Single event → Returns `true` for match, `false` for others
   - Multiple specific events → Returns `true` for matches

4. **StatusFileWatcher Lifecycle**
   - start() → Watcher starts without throwing
   - stop() → Watcher stops, removes listeners
   - stop() after start() → No events emitted after stop
   - Multiple start() calls → Idempotent, no duplicate watchers
   - stop() before start() → No-op, no error

5. **StatusFileWatcher Events**
   - File changes → Event emitted with correct structure
   - Event structure → Contains `previous`, `current`, `delta`, `timestamp`
   - First status update → `previous` is `null`
   - Multiple changes → Multiple events emitted in sequence
   - Rapid changes → Debounced to single event

6. **StatusFileWatcher Delta Calculation**
   - Progress change → Correct `completedDelta` and `totalDelta`
   - Completion status change → `completionStatusChanged` is `true`
   - Summary change → `summaryChanged` is `true`
   - No change → Delta reflects no changes

7. **StatusFileWatcher Debouncing**
   - Rapid updates (5 writes in 500ms) → Single event with last state
   - Update after debounce period → Event emitted after delay

8. **StatusFileWatcher Meaningful Change Detection**
   - notifyOnlyMeaningful=true, timestamp-only change → No event
   - notifyOnlyMeaningful=true, progress change → Event emitted
   - notifyOnlyMeaningful=false, timestamp-only change → Event emitted

9. **StatusFileWatcher Error Handling**
   - File not found → Starts without error
   - Malformed JSON → No event, continues watching
   - File read error → Gracefully handled, continues watching

**Example Test:**

```typescript
describe('NotificationService', () => {
  it('should send notification successfully', async () => {
    fetchMock.mockResolvedValue({ ok: true });

    const result = await service.send('Test message', {
      url: 'https://ntfy.sh/test',
    });

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://ntfy.sh/test',
      expect.objectContaining({
        method: 'POST',
        body: 'Test message',
      })
    );
  });
});
```

### Layer 2: Integration Tests

**Scope:**

- Command integration with NotificationService
- Workspace metadata configuration
- Config fallback behavior
- Event type filtering
- Different execution modes (loop, iterative)

**Key Test Scenarios:**

1. **Execution Start Notification**
   - notifyUrl configured, events include 'execution_start' → Notification sent
   - Message includes workspace name and max iterations
   - Headers include title and tags

2. **Completion Notification**
   - notifyUrl configured, events include 'completion' → Notification sent
   - Message includes workspace name, iterations, and status
   - Priority set to 'high'

3. **Error Notification**
   - notifyUrl configured, events include 'error' → Notification sent
   - Message includes error details
   - Priority set to 'urgent'

4. **Iteration Notification**
   - notifyUrl configured, events include 'iteration' → Notification sent
   - Message includes iteration count and remaining items

5. **Milestone Notification**
   - notifyUrl configured, events include 'iteration_milestone' → Notification sent
   - Sent every 10th iteration
   - Message includes milestone count

6. **All Events Configuration**
   - notifyEvents set to ['all'] → All event types return `true` from `shouldNotify`

7. **Default Events**
   - notifyEvents not specified → Defaults to ['all']

8. **No Notification URL**
   - notifyUrl not configured → No notifications sent

9. **Config Fallback**
   - Metadata has no notifyUrl, config has notifyUrl → Uses config value
   - Metadata has notifyUrl, config has different value → Uses metadata value

10. **Different Execution Modes**
    - Loop mode → Notifications sent correctly
    - Iterative mode → Notifications sent correctly

11. **Notification Failure Handling**
    - Network error → Returns `false`, execution continues
    - HTTP error → Returns `false`, execution continues

**Example Test:**

```typescript
describe('Notification Integration', () => {
  it('should send execution_start notification when configured', async () => {
    const workspace = await Workspace.init('test', workspacePath, {
      notifyUrl: 'https://ntfy.sh/test-topic',
      notifyEvents: ['execution_start'],
    });

    const metadata = await workspace.getMetadata();
    const notificationService = new NotificationService();

    if (notificationService.shouldNotify('execution_start', metadata)) {
      await notificationService.send('EXECUTION STARTED', {
        url: metadata.notifyUrl,
        title: 'Execution Started',
      });
    }

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toBe('https://ntfy.sh/test-topic');
  });
});
```

### Layer 3: End-to-End Tests

**Scope:**

- Full command execution with notifications
- Real-world workflow: init → setup → run → notifications
- Status file watcher integration with run command

**Key User Flows:**

1. **Basic Notification Flow**
   - Step 1: `claude-iterate init my-task --notify-url https://ntfy.sh/test`
   - Step 2: `claude-iterate setup my-task`
   - Step 3: `claude-iterate run my-task`
   - Validation: Notifications sent for execution_start, iterations, completion

2. **Selective Event Notification**
   - Step 1: `claude-iterate init my-task --notify-url https://ntfy.sh/test --notify-events completion,error`
   - Step 2: `claude-iterate run my-task`
   - Validation: Only completion and error notifications sent

3. **Status Update Notification**
   - Step 1: `claude-iterate init my-task --notify-url https://ntfy.sh/test`
   - Step 2: `claude-iterate run my-task`
   - Step 3: Claude updates `.status.json` during execution
   - Validation: Status update notifications sent with progress deltas

### Layer 4: Performance Tests

**Performance Benchmarks:**

| Operation                        | Target          | Acceptable     | Unacceptable |
| -------------------------------- | --------------- | -------------- | ------------ |
| Notification send (non-blocking) | < 50ms overhead | < 100ms        | > 500ms      |
| File watcher startup             | < 10ms          | < 50ms         | > 100ms      |
| Debounce response time           | 2000ms ± 100ms  | 2000ms ± 200ms | > 2500ms     |
| Event emission                   | < 5ms           | < 10ms         | > 50ms       |

**Load Test Scenarios:**

1. **Rapid File Changes**: 100 file writes in 1 second → Debounced to 1 event after 2s
2. **Multiple Notifications**: 10 notifications in sequence → Each completes within 1s total
3. **Long-Running Watch**: File watcher active for 1 hour → No memory leaks, stable CPU

## Error Scenarios

### Error Test Cases

1. **Invalid Notification URL**
   - Input: Malformed URL (e.g., "not-a-url")
   - Expected: `fetch` throws, caught by service
   - Result: Returns `false`, logs warning
   - Execution: Continues normally

2. **Network Timeout**
   - Input: URL that times out
   - Expected: `fetch` timeout error
   - Result: Returns `false`, logs warning
   - Execution: Continues normally

3. **HTTP 404 Not Found**
   - Input: Valid URL, server returns 404
   - Expected: `response.ok` is `false`
   - Result: Returns `false`, logs warning with status
   - Execution: Continues normally

4. **HTTP 500 Server Error**
   - Input: Server error response
   - Expected: `response.ok` is `false`
   - Result: Returns `false`, logs warning with status
   - Execution: Continues normally

5. **File Watcher on Non-Existent File**
   - Input: Start watcher on file that doesn't exist yet
   - Expected: No error, watcher starts
   - Result: When file created, events emitted
   - Error Handling: ENOENT caught and ignored

6. **Malformed JSON in Status File**
   - Input: Write invalid JSON to `.status.json`
   - Expected: Parse error caught
   - Result: No event emitted, continues watching
   - Error Handling: Silent failure (performance)

7. **Permission Denied on File Read**
   - Input: Status file exists but not readable
   - Expected: Read error caught
   - Result: No event emitted, watcher continues
   - Error Handling: Logged as warning

## Edge Cases

1. **Concurrent file changes within debounce window**
   - Condition: Multiple writes in < 2 seconds
   - Expected Behavior: Only last state emitted after quiet period
   - Test: Write 5 times in 500ms, verify 1 event with final state

2. **Notification URL with special characters**
   - Condition: URL contains query params, fragments
   - Expected Behavior: URL preserved exactly as provided
   - Test: Send to `https://ntfy.sh/topic?priority=high#section`

3. **Empty notification message**
   - Condition: `send('')` called
   - Expected Behavior: POST request sent with empty body
   - Test: Verify `fetch` called with empty string body

4. **Very large notification message (>10KB)**
   - Condition: Message exceeds typical size limits
   - Expected Behavior: `fetch` sends entire message
   - Test: Send 50KB message, verify no truncation

5. **Status file deleted during watching**
   - Condition: File removed while watcher active
   - Expected Behavior: Watch continues, next write triggers event
   - Test: Delete file, recreate, verify event emitted

6. **Rapid start/stop cycles**
   - Condition: Call `start()` and `stop()` 100 times in loop
   - Expected Behavior: No memory leaks, no errors
   - Test: Verify cleanup happens correctly

7. **notifyEvents includes duplicates**
   - Condition: `['completion', 'completion', 'error']`
   - Expected Behavior: Duplicates ignored, behaves as `['completion', 'error']`
   - Test: Verify `shouldNotify` works correctly

8. **notifyEvents includes 'all' plus specific events**
   - Condition: `['all', 'completion']`
   - Expected Behavior: 'all' takes precedence
   - Test: Verify all events return `true`

## Test Data Requirements

### Test Fixtures

```typescript
// Example notification options
const testNotificationOptions = {
  url: 'https://ntfy.sh/test-topic',
  title: 'Test Notification',
  priority: 'high' as const,
  tags: ['test', 'claude-iterate'],
};

// Example metadata with notifications
const testMetadata = {
  name: 'test-workspace',
  notifyUrl: 'https://ntfy.sh/test-topic',
  notifyEvents: ['all'] as const,
  maxIterations: 10,
};

// Example status file content
const testStatus = {
  complete: false,
  progress: { completed: 5, total: 10 },
  summary: 'In progress',
  lastUpdated: '2025-10-28T12:00:00Z',
};
```

### Mock Setup

- **fetch**: Mock `global.fetch` to capture HTTP requests without network calls
- **fs.watch**: Use real file system with temporary test directories
- **Logger**: Optional mock for verbose mode testing

## Security Testing

**Security Test Cases:**

- [x] HTTPS URLs supported (not blocked)
- [x] HTTP URLs supported (for local testing)
- [x] No credentials leaked in error messages
- [x] No internal paths exposed in notifications
- [x] Malicious URLs do not crash service (fetch handles)
- [x] XSS in notification message does not affect system (plain text only)
- [x] File watcher does not follow symlinks outside workspace

## Testing Strategy

### Local Development

- Run unit tests on file save: `npm test -- --watch`
- Run integration tests before commit: `npm test tests/integration/notification.test.ts`
- Check coverage: `npm run coverage`

### CI/CD Pipeline

- Run all tests on every pull request: `npm test`
- Enforce ≥80% coverage threshold (fails build if below)
- Run tests on Node 18, 20, 22 (multi-version matrix)
- Mock `fetch` in all environments (no real HTTP requests)

### Test Environments

- **Local**: Developer machines with Vitest watch mode
- **CI**: GitHub Actions with temporary directories for file tests
- **Staging**: Manual testing with real ntfy.sh URLs (optional)

## Test Maintenance

- Update tests when SPEC.md changes
- Remove obsolete tests when features deprecated
- Keep mock fetch responses synchronized with ntfy.sh API
- Update test fixtures when metadata schema changes
- Review performance benchmarks quarterly

---

## Test Checklist

- [x] All unit tests written and passing (228 total tests passing)
- [x] All integration tests written and passing
- [x] All e2e tests written and passing
- [x] Performance benchmarks met (debouncing verified)
- [x] All error scenarios tested
- [x] All edge cases covered
- [x] Security tests passing
- [x] Test coverage ≥80% (notification-service.ts, status-file-watcher.ts)
- [x] Tests documented and maintainable
- [x] CI/CD pipeline configured correctly
