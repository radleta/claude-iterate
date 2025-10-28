# Graceful Stop

---

# Status Tracking

status: planning
status_summary: Second sub-feature of enhanced-output, depends on statistics-display

# Ownership

owner: user

# Blocking Issues

blocked_by: [statistics-display](../statistics-display/README.md) (needs UI foundation)

# Summary (for AI and quick scanning)

## summary: User-controlled graceful execution stop via keyboard shortcut or file signal

## Purpose

Provide users with a graceful way to stop execution without CTRL+C, allowing the current iteration to complete before stopping. Supports both keyboard shortcut ('s' key) and file-based signaling (.stop file) for maximum flexibility.

## User Stories

- As a user, I want to press the 's' key to toggle stop so that I can gracefully stop execution without CTRL+C
- As a user, I want to create a .stop file to signal stop remotely so that I can stop execution from scripts or other terminals
- As a user, I want stop to be togglable so that I can cancel a stop request if I change my mind
- As a user, I want a visual stop indicator in the UI so that I know my stop request has been registered
- As a user, I want the current iteration to complete before stopping so that work is not interrupted mid-task
- As a developer, I want a CLI command to create .stop files easily so that I don't have to manually touch files

## Core Business Logic

### Dual Stop Mechanism

**Keyboard Shortcut ('s' key):**

- User presses 's' key (no CTRL needed) during execution
- Toggles stop state in-memory (press again to cancel)
- Works only in TTY mode (skipped in CI/CD)
- Updates UI immediately to show stop status

**File-based (.stop file):**

- User creates `.stop` file in workspace directory
  - Manual: `touch workspace/.stop`
  - CLI command: `claude-iterate stop <workspace>`
- Run command detects file at iteration boundaries
- Stops gracefully after current iteration completes
- File deleted automatically on cleanup

**Both mechanisms:**

- Stop after current iteration completes (never mid-iteration)
- Toggle behavior: Can cancel stop request before it takes effect
- Visual indicator in UI shows stop status and source (keyboard vs file)
- Cleanup removes listeners and optionally deletes .stop file

### Stop Signal Flow

```
User presses 's' key
    ↓
Keyboard listener toggles stop state
    ↓
UI updates (shows stop indicator)
    ↓
Current iteration completes
    ↓
run.ts checks stop signal
    ↓
If stop requested → exit gracefully
If not → continue to next iteration
```

### Stop Indicator Display

When stop is requested, the UI shows:

```
🛑 Stop requested (Press 's' to cancel)   ← keyboard source
🛑 Stop requested (Delete .stop file to cancel)   ← file source
```

Footer shows keyboard controls:

```
Press s to toggle stop
```

## Key Constraints

- Keyboard listener only works in TTY mode (not CI/CD)
- Stop signal checked only at iteration boundaries (not during execution)
- File-based stop works in all environments (TTY and non-TTY)
- Must not interfere with SIGINT/SIGTERM (CTRL+C still works)
- Must clean up keyboard listener on exit
- Must handle raw mode terminal correctly

## Acceptance Criteria

- [ ] Creating .stop file stops execution after current iteration
- [ ] Pressing 's' key toggles stop state
- [ ] Pressing 's' again cancels stop request
- [ ] Stop indicator appears in UI when stop requested
- [ ] Stop indicator shows correct source (keyboard vs file)
- [ ] Cleanup deletes .stop file on normal exit
- [ ] Keyboard listener doesn't crash in non-TTY
- [ ] Stop signal doesn't interrupt mid-iteration
- [ ] CTRL+C still works for immediate termination
- [ ] CLI command `claude-iterate stop <workspace>` creates .stop file

## Non-Goals (Out of Scope)

- Mouse interaction
- Multiple stop signals (only one active at a time)
- Configurable keyboard shortcuts (always 's' key)
- WebSocket or HTTP stop interfaces
- Persistent stop file (always deleted on cleanup)

## Related Documentation

- **[SPEC.md](./SPEC.md)** - Technical specification
- **[PLAN.md](./PLAN.md)** - Implementation tasks
- **[TEST.md](./TEST.md)** - Testing requirements
- **[TODO.md](./TODO.md)** - Progress tracking
- **[Parent Feature](../../README.md)** - Enhanced Run Output
- **[Depends On](../statistics-display/README.md)** - Statistics Display (provides UI foundation)

## Example Usage

### Keyboard Stop (Interactive)

```bash
# Start run command
$ claude-iterate run my-task

┌──────────────────────────────────────────────────────────────────────────────┐
│ claude-iterate → loop mode                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│ 🔄 RUNNING                                                                    │
│ ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░ 12 / 50 (24%)            │
│  ⏱️  Elapsed: 5m 42s                 🔮 ETA: ~18m 30s                        │
│  ⚡ Avg/iter: 28s                     📊 Mode: loop                           │
│  🎯 Tasks: 35 / 60                    🕐 Updated: 2s ago                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ Press s to toggle stop                                                       │
└──────────────────────────────────────────────────────────────────────────────┘

# User presses 's' key
# UI updates immediately:

┌──────────────────────────────────────────────────────────────────────────────┐
│ claude-iterate → loop mode                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│ 🔄 RUNNING                                                                    │
│ ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░ 12 / 50 (24%)            │
│  ⏱️  Elapsed: 5m 42s                 🔮 ETA: ~18m 30s                        │
│  ⚡ Avg/iter: 28s                     📊 Mode: loop                           │
│  🎯 Tasks: 35 / 60                    🕐 Updated: 2s ago                      │
│ 🛑 Stop requested (Press 's' to cancel)                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ Press s to toggle stop                                                       │
└──────────────────────────────────────────────────────────────────────────────┘

# Current iteration completes, then stops:
✓ Iteration 12 complete (48 items remaining)

Stop signal received - completing gracefully
```

### File-Based Stop (Scripted)

```bash
# Terminal 1: Start run command
$ claude-iterate run my-task

# Terminal 2: Send stop signal
$ claude-iterate stop my-task
Stop signal sent to workspace: my-task
Workspace will stop after current iteration completes

To cancel, delete the .stop file:
  rm claude-iterate/workspaces/my-task/.stop

# Terminal 1: UI updates, then stops after current iteration
🛑 Stop requested (Delete .stop file to cancel)

✓ Iteration 15 complete (45 items remaining)

Stop signal received - completing gracefully
```

### Cancel Stop Request

```bash
# After pressing 's' once (stop requested):
🛑 Stop requested (Press 's' to cancel)

# Press 's' again to cancel:
# Stop indicator disappears, execution continues

┌──────────────────────────────────────────────────────────────────────────────┐
│ 🔄 RUNNING                                                                    │
│ ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░ 12 / 50 (24%)            │
│  [No stop indicator]                                                         │
└──────────────────────────────────────────────────────────────────────────────┘

# Execution continues normally
```

## Implementation Status

**Current**: Planning phase
**Next**: Implement StopSignal class and stop command
**Dependency**: Blocked until statistics-display is implemented (provides UI foundation)
