# Statistics Display

---

# Status Tracking

status: complete
status_summary: Implemented with log-update for robust terminal rendering, comprehensive tests (513 passing), and zero breaking changes

# Ownership

owner: user

# Blocking Issues

blocked_by:

# Summary (for AI and quick scanning)

## summary: Beautiful terminal UI displaying real-time execution statistics with progress visualization

## Purpose

Provide beautiful, real-time execution statistics in the terminal with visual progress indicators, replacing simple line-by-line progress output with an interactive, informative UI.

## User Stories

- As a user, I want to see beautiful terminal output with boxes and colors so that monitoring execution feels professional
- As a user, I want real-time statistics (elapsed time, ETA, avg/iteration) so that I understand execution progress
- As a user, I want a visual progress bar so that I can see completion status at a glance
- As a user, I want task completion counts so that I know how much work remains
- As a user, I want automatic TTY detection so that CI/CD logs remain clean without ANSI codes
- As a developer, I want battle-tested terminal rendering so that edge cases are handled correctly

## Core Business Logic

### Statistics Tracked (9 Core Metrics)

1. **Progress**: Current iteration / max iterations (e.g., "12 / 50")
2. **Elapsed time**: Total time running (e.g., "5m 32s")
3. **Avg time/iteration**: Mean iteration duration from last 5 iterations (e.g., "27s / iter")
4. **ETA**: Estimated time remaining (e.g., "~15m remaining")
5. **Task progress**: Items completed / total from .status.json (e.g., "35 / 60 tasks")
6. **Mode indicator**: Loop or Iterative (+ stagnation counter if iterative)
7. **Status**: Current state (Starting, Running, Completing)
8. **Stop signal placeholder**: Reserved for graceful-stop sub-feature
9. **Last activity**: Timestamp of last update (e.g., "Updated 2s ago")

### Terminal UI Components

**Box border** - Unicode (┌─┐│└─┘) or ASCII (+---+) based on platform
**Status indicator** - Color-coded emoji (🔄 cyan Running, ✅ green Complete)
**Progress bar** - Filled (█) and empty (░) blocks showing percentage
**Statistics grid** - Two-column layout with left-aligned metrics
**Footer** - Reserved for graceful-stop keyboard controls

### TTY Detection and Fallback

- **TTY available**: Enhanced UI with colors, boxes, live updates (in-place rendering)
- **Non-TTY (CI/CD)**: Plain line-by-line output without ANSI escape codes
- Detection: `process.stdout.isTTY ?? false`
- No configuration needed - automatic adaptation

### Performance Requirements

- **UI update rate**: Max 2 Hz (500ms debounce) to prevent flickering
- **Render time**: <10ms per update
- **Memory**: Track only last 10 iteration durations (O(1) space)

## Key Constraints

- Minimal dependencies (use existing chalk + log-update for terminal rendering)
- Must work in existing progress output mode (replaces it)
- Quiet and verbose modes unchanged
- Must not impact iteration execution performance
- Cross-platform support (Windows, macOS, Linux)

## Acceptance Criteria

- [ ] TTY mode displays Unicode box border (or ASCII fallback on Windows)
- [ ] All 9 statistics display with correct formatting
- [ ] Progress bar updates correctly (0%, 50%, 100%)
- [ ] Non-TTY mode produces plain text without ANSI codes
- [ ] UI updates debounced to max 2 Hz
- [ ] Render completes in <10ms
- [ ] ETA becomes accurate after 5+ iterations
- [ ] Colors work correctly (chalk integration)
- [ ] Existing tests still pass (no breaking changes)

## Non-Goals (Out of Scope)

- Stop controls (handled by graceful-stop sub-feature)
- Configuration options (progress mode is enhanced by default)
- Mouse interaction
- Real-time graphing or charts
- Custom themes or color schemes

## Related Documentation

- **[SPEC.md](./SPEC.md)** - Technical specification
- **[PLAN.md](./PLAN.md)** - Implementation tasks
- **[TEST.md](./TEST.md)** - Testing requirements
- **[TODO.md](./TODO.md)** - Progress tracking
- **[Parent Feature](../../README.md)** - Enhanced Run Output

## Example Output

### TTY Mode (Terminal)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ claude-iterate → loop mode                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│ 🔄 RUNNING                                                                    │
│ ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░ 12 / 50 (24%)            │
│  ⏱️  Elapsed: 5m 42s                 🔮 ETA: ~18m 30s                        │
│  ⚡ Avg/iter: 28s                     📊 Mode: loop                           │
│  🎯 Tasks: 35 / 60                    🕐 Updated: 2s ago                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Stop controls reserved for graceful-stop sub-feature]                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Non-TTY Mode (CI/CD)

```
Starting claude-iterate run for workspace: my-task
Mode: loop | Max iterations: 50 | Delay: 2s

Running iteration 1...
✓ Iteration 1 complete (59 items remaining)

Running iteration 2...
✓ Iteration 2 complete (58 items remaining)
```

## Implementation Status

**Current**: Planning phase
**Next**: Implement types and UI rendering
**Dependency**: None (first sub-feature to implement)
