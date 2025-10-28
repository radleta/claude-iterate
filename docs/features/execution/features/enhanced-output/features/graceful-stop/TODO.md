# TODO: Graceful Stop

---

# Progress Tracking

status: not-started
progress_percentage: 0
blockers_count: 1

# Last Updated

## last_updated: 2025-10-28

## Current Status

**Phase**: Specification complete, blocked by dependency

**Summary**: All SDD documentation created (README, SPEC, PLAN, TEST, TODO). Cannot begin implementation until statistics-display is implemented (provides UI foundation with IterationStats interface).

**Dependencies**: [statistics-display](../statistics-display/README.md) (MUST be implemented first)

## Feature Setup Validation

### Required Files Checklist

- [x] README.md exists with valid YAML frontmatter
- [x] SPEC.md exists with complete technical specification
- [x] PLAN.md exists with implementation tasks (6 tasks in checklist mode)
- [x] TEST.md exists with testing requirements
- [x] TODO.md exists (this file)

### Cross-File Validation

- [x] README.md links to SPEC.md, PLAN.md, TEST.md, TODO.md
- [x] README.md shows blocked_by: statistics-display
- [x] SPEC.md has Public Contract section (StopSignal class, stop command)
- [x] SPEC.md has Dependencies section (depends on statistics-display)
- [x] PLAN.md has specific, actionable tasks with file paths
- [x] TEST.md has coverage targets with specific percentages (≥80% line coverage)
- [ ] All markdown links resolve (pending validation run)

### Documentation Quality

- [x] No [PLACEHOLDERS] remain in any file
- [x] All vague terms replaced with specific criteria
- [x] All measurements quantified (≥80%, <1ms, etc.)
- [x] Testing details ONLY in TEST.md (not in SPEC or PLAN)
- [x] YAML frontmatter valid in README.md and TODO.md

## Implementation Progress (From PLAN.md)

**BLOCKED**: Cannot start until statistics-display is implemented

### Phase 1: StopSignal Class (0%)

- [ ] Task 1.1: Create StopSignal class (`stop-signal.ts`)
- [ ] Task 1.2: Implement keyboard listener helper

### Phase 2: Stop Command (0%)

- [ ] Task 2.1: Create stop command (`commands/stop.ts`)
- [ ] Task 2.2: Register stop command in CLI (`cli.ts`)

### Phase 3: Integration with run Command (0%)

- [ ] Task 3.1: Integrate StopSignal in run.ts

### Phase 4: Update ConsoleReporter Footer (0%)

- [ ] Task 4.1: Update footer with keyboard controls

### Phase 5: Testing (0%)

- [ ] Task 5.1: Unit tests for StopSignal and stop command
- [ ] Task 5.2: Integration tests for end-to-end flow

**Overall Progress**: 0 / 8 tasks complete (0%)

## Validation Checkpoints

### After Phase 1 ✓

- [ ] `npm run typecheck` passes
- [ ] StopSignal class exports correctly
- [ ] Keyboard listener works (manual test)
- [ ] File detection works (manual test)
- [ ] Unit tests for StopSignal pass

### After Phase 2 ✓

- [ ] `claude-iterate stop --help` works
- [ ] Command appears in main help output
- [ ] Stop command creates .stop file
- [ ] Unit tests for stop command pass

### After Phase 3 ✓

- [ ] `npm run build` succeeds
- [ ] Can run `claude-iterate run <workspace>` with stop integration
- [ ] Stop indicator appears in UI (manual test)
- [ ] Stop signal stops execution gracefully (manual test)

### After Phase 4 ✓

- [ ] Footer shows "Press s to toggle stop"
- [ ] Footer only shows in TTY mode
- [ ] Snapshot tests updated

### After Phase 5 ✓

- [ ] `npm test` passes (all existing tests + new tests)
- [ ] New tests achieve ≥80% coverage
- [ ] Integration test verifies end-to-end flow
- [ ] Performance benchmarks met (<1ms stop check)

## Quality Validation

### Code Quality

- [ ] TypeScript compiles: `npm run typecheck` passes with 0 errors
- [ ] Linter passes: `npm run lint` with 0 warnings
- [ ] Build succeeds: `npm run build` completes
- [ ] No console.log statements (use logger instead)
- [ ] No commented-out code blocks
- [ ] All public methods have JSDoc comments
- [ ] Error handling in place for file operations
- [ ] Graceful fallbacks for keyboard listener failures

### Testing Quality

- [ ] All tests pass: `npm test` shows green
- [ ] Coverage targets met: ≥80% line coverage for new code
- [ ] Unit tests: ~30 test cases passing
- [ ] Integration tests: 1 test case passing
- [ ] Cross-platform tests: Pass on Windows, macOS, Linux
- [ ] Performance benchmarks: <1ms stop check, <10ms file check
- [ ] No flaky tests (run 5 times, all pass)

### Documentation Quality

- [ ] All 5 SDD files complete (README, SPEC, PLAN, TEST, TODO)
- [ ] Code comments explain "why", not "what"
- [ ] All public APIs documented with JSDoc
- [ ] Parent feature links to this sub-feature
- [ ] Dependencies documented correctly

### User Experience

- [ ] Keyboard shortcut 's' toggles stop reliably
- [ ] .stop file stops execution gracefully
- [ ] Stop indicator appears in UI with correct source
- [ ] Stop can be canceled before it takes effect
- [ ] Current iteration always completes before stopping
- [ ] CTRL+C still works for immediate stop
- [ ] CLI command `claude-iterate stop <workspace>` works correctly
- [ ] Cleanup removes .stop file
- [ ] Footer shows keyboard controls

## Blockers

**Current blockers**:

1. **[statistics-display](../statistics-display/README.md)** - MUST be implemented first
   - Reason: Provides IterationStats interface with stopRequested and stopSource fields
   - Reason: Provides UI rendering for stop indicator
   - Impact: Cannot implement or test graceful-stop without these foundations

**Potential blockers** (after dependency resolved):

- If raw mode doesn't work on specific platform (graceful degradation to file-based only)
- If readline module behavior differs across Node.js versions
- If file system permissions prevent .stop file creation

**Resolution plan**: Implement statistics-display first, then graceful-stop

## Decisions Log

### Decision 1: Dependency on statistics-display (Resolved)

**Date**: 2025-10-28
**Decision**: Graceful-stop depends on statistics-display, must be implemented second
**Rationale**: Needs IterationStats interface and UI foundation for stop indicator
**Impact**: Cannot start implementation until statistics-display is complete

### Decision 2: 's' key shortcut (Resolved)

**Date**: 2025-10-28
**Decision**: Use 's' key (no CTRL modifier)
**Rationale**: Simpler, more discoverable, follows tools like `less` and `top`
**Impact**: Easy to use, but requires raw mode (no buffering)

### Decision 3: Dual mechanism (Resolved)

**Date**: 2025-10-28
**Decision**: Support both keyboard and file-based stop
**Rationale**: Keyboard for interactive use, file for automation/scripting
**Impact**: More flexible, works in all environments (TTY and non-TTY)

### Decision 4: Toggle behavior (Resolved)

**Date**: 2025-10-28
**Decision**: Stop is togglable (press 's' again to cancel)
**Rationale**: User-friendly, allows changing mind before iteration completes
**Impact**: More complex logic, but better UX

## Questions & Answers

### Q: Why can't we implement graceful-stop before statistics-display?

**A**: Graceful-stop needs the IterationStats interface (with stopRequested and stopSource fields) and the UI rendering logic to show the stop indicator. Both are provided by statistics-display.

### Q: What if the user wants stop but not statistics?

**A**: These are sub-features of enhanced-output and are designed to work together. The statistics UI provides the visual context for the stop indicator. Separating them would create a poor user experience.

### Q: Can we use CTRL+S instead of 's' key?

**A**: No. CTRL+S is commonly mapped to terminal flow control (XON/XOFF). Using a simple 's' key is more reliable and follows conventions from tools like `less` and `top`.

### Q: What happens if keyboard listener fails?

**A**: The code gracefully degrades to file-based stop only. The logger shows a debug message, but execution continues normally. Users can still use `claude-iterate stop <workspace>` command.

## Notes

### Investigation Findings

- **Existing dependencies**: chalk ^5.4.1, Node.js ≥18 readline module
- **Code patterns**: PascalCase classes, camelCase functions, 2-space indent
- **Test patterns**: Vitest, mocked tests, tests/unit/ and tests/integration/
- **Similar features**: ClaudeClient (uses process spawning), FileLogger (uses file operations)
- **Integration point**: src/commands/run.ts (~650 lines)

### Implementation Tips

- **Test keyboard without real TTY**: Mock process.stdin and inject keypress events
- **Test file operations**: Use memfs or mock fs/promises
- **Cleanup in finally block**: Ensure cleanup always runs (even if errors occur)
- **Idempotent cleanup**: Make cleanup safe to call multiple times
- **Cross-platform paths**: Always use path.join() for .stop file path

### Performance Considerations

- **Event-driven keyboard**: Use readline events, no polling loops
- **Minimal file checks**: Only check .stop file at iteration boundaries
- **Stop check overhead**: Must be <1ms (negligible vs 20-60s iterations)

### Security Considerations

- **File permissions**: .stop file uses user's umask (no custom permissions)
- **Input filtering**: Keyboard listener only responds to 's' key
- **No eval**: No dynamic code execution
- **Path validation**: Workspace path validated before file operations

## Next Actions

### Immediate (Before Implementation)

1. **Wait for statistics-display**: Cannot start until dependency is complete
2. **Review statistics-display**: Verify IterationStats interface has stopRequested and stopSource fields
3. **Prepare test mocks**: Set up mocking infrastructure while waiting

### Phase 1 (After statistics-display Complete)

1. **Create stop-signal.ts**: StopSignal class with keyboard and file detection
2. **Test keyboard listener**: Verify 's' key detection works
3. **Run typecheck**: Verify types compile correctly

### Phase 2 (After Phase 1)

1. **Create stop command**: CLI command to create .stop file
2. **Register command**: Add to cli.ts
3. **Test command**: Verify `claude-iterate stop` works

### Phase 3 (After Phase 2)

1. **Integrate with run.ts**: Initialize StopSignal, check at iteration boundaries
2. **Manual testing**: Run `claude-iterate run` and test stop behavior
3. **Update footer**: Replace placeholder with actual keyboard controls

### Phase 4 (After Phase 3)

1. **Write unit tests**: Achieve ≥80% coverage
2. **Write integration test**: Verify end-to-end flow
3. **Run all tests**: Ensure everything passes

## Future Enhancements (Not in Initial Spec)

- Persistent stop file option (keep .stop after run)
- Custom keyboard shortcuts (config option to change from 's' to another key)
- Stop with reason (pass message via .stop file, display in UI)
- Stop timeout (force stop after N seconds if iteration doesn't complete)
- WebSocket/HTTP stop interface (for remote control)

---

**This TODO.md will be updated throughout implementation to track progress and validate quality.**
