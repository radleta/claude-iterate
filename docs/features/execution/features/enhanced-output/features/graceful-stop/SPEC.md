# Technical Specification: Graceful Stop

## Overview

### Purpose

Provide users with graceful execution stop capability via dual mechanism (keyboard shortcut + file-based signaling), allowing current iteration to complete before stopping. Supports both interactive (keyboard) and scripted (file) workflows.

### Scope

**In Scope:**

- StopSignal class for stop detection and management
- Keyboard listener for 's' key (TTY only)
- File-based stop detection (.stop file)
- Stop command CLI (`claude-iterate stop <workspace>`)
- Integration with IterationStats (for UI indicator)
- Toggle behavior (cancel stop before it executes)
- Cleanup (remove listener, delete file)

**Out of Scope:**

- Mouse interaction
- Configurable keyboard shortcuts (always 's' key)
- Multiple stop signals (only one active at a time)
- WebSocket/HTTP stop interfaces
- Persistent stop file (always deleted on cleanup)
- Stop during iteration (only at boundaries)

### Goals

1. **User-friendly**: Simple keyboard shortcut ('s' key, no CTRL needed)
2. **Scriptable**: File-based stop for automation and remote control
3. **Togglable**: Can cancel stop request if user changes mind
4. **Graceful**: Never interrupts mid-iteration
5. **Safe**: Works alongside SIGINT/SIGTERM, cleanup guaranteed

## Public Contract

### StopSignal Class

```typescript
/**
 * Manages graceful stop signaling via file and keyboard
 * Provides unified interface for both stop mechanisms
 */
export class StopSignal {
  constructor(
    private workspacePath: string,
    private enableKeyboard: boolean = true
  );

  /**
   * Initialize stop signal detection
   * - Checks for existing .stop file
   * - Sets up keyboard listener if TTY
   * Returns: Promise<void>
   */
  async init(): Promise<void>;

  /**
   * Check if stop has been requested (file or keyboard)
   * Returns: boolean
   */
  isStopRequested(): boolean;

  /**
   * Toggle stop state (keyboard handler calls this)
   * Can be called manually for testing
   */
  toggle(): void;

  /**
   * Get current stop state for display
   * Returns: { requested: boolean; source: 'keyboard' | 'file' | null }
   */
  getState(): { requested: boolean; source: 'keyboard' | 'file' | null };

  /**
   * Clean up: remove keyboard listener, optionally delete .stop file
   * deleteFile: If true, remove .stop file (default: true)
   * Returns: Promise<void>
   */
  async cleanup(deleteFile?: boolean): Promise<void>;
}
```

### Stop Command CLI

```bash
# Command: claude-iterate stop <workspace>
# Creates .stop file in workspace directory
# Returns exit code 0 on success, 1 on error

claude-iterate stop my-task

# Output:
# Stop signal sent to workspace: my-task
# Workspace will stop after current iteration completes
#
# To cancel, delete the .stop file:
#   rm claude-iterate/workspaces/my-task/.stop
```

## Dependencies

### External Dependencies

- **Node.js stdlib** - No new dependencies
  - `readline` - Keyboard input (raw mode)
  - `fs/promises` - File operations (.stop file)
  - `path` - File path construction

### Internal Dependencies

- **[statistics-display](../statistics-display/README.md)** - Provides UI foundation for stop indicator
  - Uses `IterationStats.stopRequested` and `IterationStats.stopSource` fields
  - UI rendering includes stop indicator when `stopRequested === true`
- `src/commands/run.ts` - Integrates StopSignal and checks stop at iteration boundaries
- `src/commands/stop.ts` - New command to create .stop file
- `src/types/iteration-stats.ts` - Uses stopRequested and stopSource fields (defined in statistics-display)

**Dependency Note**: This feature depends on statistics-display for the UI foundation. The IterationStats interface must already exist with stopRequested and stopSource fields.

## Data Structures

### StopSignal Internal State

```typescript
/**
 * Internal state for StopSignal class
 */
interface StopSignalState {
  stopRequested: boolean; // Current stop state
  stopSource: 'keyboard' | 'file' | null; // Where stop came from
  keyboardCleanup?: () => void; // Cleanup function for keyboard listener
  stopFilePath: string; // Path to .stop file
}
```

## Algorithms

### Keyboard Listener Setup

```typescript
import readline from 'readline';

/**
 * Setup keyboard listener for 's' key
 * Only works in TTY mode
 * Returns cleanup function
 */
function setupKeyboardListener(stopSignal: StopSignal): () => void {
  if (!process.stdin.isTTY) {
    return () => {}; // No-op cleanup
  }

  // Set raw mode (no buffering, no echo)
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.setRawMode) {
    process.stdin.setRawMode(true);
  }

  // Listen for 's' key
  const handler = (str: string, key: any) => {
    if (str === 's' || str === 'S') {
      stopSignal.toggle();
      // UI update triggered automatically via stats update
    }

    // CTRL+C still works (process.on('SIGINT') handles it)
  };

  process.stdin.on('keypress', handler);

  // Return cleanup function
  return () => {
    process.stdin.off('keypress', handler);
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
  };
}
```

### File-Based Stop Detection

```typescript
import { access, unlink, writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * Check if .stop file exists
 * Returns: boolean
 */
async function checkStopFile(workspacePath: string): Promise<boolean> {
  const stopFile = join(workspacePath, '.stop');
  try {
    await access(stopFile);
    return true; // File exists
  } catch {
    return false; // File doesn't exist
  }
}

/**
 * Create .stop file
 * Returns: Promise<void>
 */
async function createStopFile(workspacePath: string): Promise<void> {
  const stopFile = join(workspacePath, '.stop');
  await writeFile(stopFile, `Stop requested at ${new Date().toISOString()}\n`);
}

/**
 * Delete .stop file
 * Returns: Promise<void>
 */
async function deleteStopFile(workspacePath: string): Promise<void> {
  const stopFile = join(workspacePath, '.stop');
  try {
    await unlink(stopFile);
  } catch {
    // File might not exist, that's fine
  }
}
```

### StopSignal Implementation

```typescript
import { access, unlink } from 'fs/promises';
import { join } from 'path';

export class StopSignal {
  private stopFile: string;
  private stopRequested = false;
  private stopSource: 'keyboard' | 'file' | null = null;
  private keyboardCleanup?: () => void;

  constructor(
    private workspacePath: string,
    private enableKeyboard = true
  ) {
    this.stopFile = join(workspacePath, '.stop');
  }

  async init(): Promise<void> {
    // Check for existing .stop file
    try {
      await access(this.stopFile);
      this.stopRequested = true;
      this.stopSource = 'file';
    } catch {
      // File doesn't exist, that's fine
    }

    // Setup keyboard listener if TTY
    if (this.enableKeyboard && process.stdin.isTTY) {
      this.keyboardCleanup = setupKeyboardListener(this);
    }
  }

  isStopRequested(): boolean {
    return this.stopRequested;
  }

  toggle(): void {
    this.stopRequested = !this.stopRequested;
    this.stopSource = this.stopRequested ? 'keyboard' : null;
  }

  getState() {
    return {
      requested: this.stopRequested,
      source: this.stopSource,
    };
  }

  async cleanup(deleteFile = true): Promise<void> {
    // Remove keyboard listener
    if (this.keyboardCleanup) {
      this.keyboardCleanup();
    }

    // Optionally delete .stop file
    if (deleteFile) {
      try {
        await unlink(this.stopFile);
      } catch {
        // File might not exist
      }
    }
  }
}
```

### Stop Command Implementation

```typescript
// src/commands/stop.ts

import { Command } from 'commander';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { Logger } from '../utils/logger.js';
import { getWorkspacePath } from '../utils/paths.js';

export function stopCommand(): Command {
  return new Command('stop')
    .description('Request graceful stop for running workspace')
    .argument('<name>', 'Workspace name')
    .action(async (name: string, _options: unknown, command: Command) => {
      const logger = new Logger(command.optsWithGlobals().colors !== false);

      try {
        // Get workspace path
        const configManager = await import('../core/config-manager.js');
        const config = await configManager.ConfigManager.load(
          command.optsWithGlobals()
        );
        const workspacePath = getWorkspacePath(
          name,
          config.get('workspacesDir')
        );

        // Verify workspace exists
        try {
          await access(workspacePath);
        } catch {
          logger.error(`Workspace not found: ${name}`);
          process.exit(1);
        }

        // Create .stop file
        const stopFile = join(workspacePath, '.stop');
        await writeFile(
          stopFile,
          `Stop requested at ${new Date().toISOString()}\n`
        );

        logger.success(`Stop signal sent to workspace: ${name}`);
        logger.info('Workspace will stop after current iteration completes');
        logger.line();
        logger.log('To cancel, delete the .stop file:');
        logger.log(`  rm ${stopFile}`);
      } catch (error) {
        logger.error('Failed to send stop signal', error as Error);
        process.exit(1);
      }
    });
}
```

### Integration with run.ts

```typescript
// In run command

// 1. Initialize StopSignal before iteration loop
const stopSignal = new StopSignal(workspace.path);
await stopSignal.init();

// 2. Update stats with stop state after each iteration
stats.stopRequested = stopSignal.isStopRequested();
stats.stopSource = stopSignal.getState().source;

// 3. Check stop signal before next iteration
if (stopSignal.isStopRequested()) {
  stats.status = 'stopped';
  reporter.updateStats(stats);
  logger.line();
  logger.info('Stop signal received - completing gracefully');
  break;
}

// 4. Cleanup on exit (in finally block)
try {
  await stopSignal.cleanup(deleteFile: true);
} catch (error) {
  logger.debug('StopSignal cleanup error', error);
}
```

## Configuration

### No New Configuration Needed

Graceful stop uses existing run command behavior. No new config options required.

### Behavior

- Keyboard listener: Always enabled in TTY mode, automatically disabled in non-TTY
- File-based stop: Always enabled in all modes (TTY and non-TTY)
- Stop checked: At iteration boundaries only (never mid-iteration)

## Cross-Platform Considerations

### Keyboard Raw Mode

**macOS / Linux:**

- Full support for `process.stdin.setRawMode(true)`
- Keypress events work natively
- No special handling needed

**Windows:**

- Raw mode works in modern Windows Terminal
- Works in VS Code terminal
- May not work in legacy console (graceful degradation)

### File Operations

**All platforms:**

- `.stop` file created with user's umask (default: 0644)
- File paths use Node.js `path.join()` for cross-platform compatibility
- No platform-specific file handling needed

## Non-Functional Requirements

### Performance

- **Keyboard polling**: Event-driven (no busy-wait loops)
- **File polling**: Check .stop file only at iteration boundaries (not during execution)
- **Overhead**: Negligible (<1ms per iteration for stop check)

### Security

- **File permissions**: .stop file created with user's umask (default: 0644)
- **Path validation**: Workspace path validated before file operations
- **Input filtering**: Keyboard listener only responds to 's' key (ignores other input)
- **Signal handling**: SIGINT/SIGTERM still work (keyboard doesn't interfere)

### Error Handling

```typescript
// Keyboard listener errors don't crash execution
try {
  setupKeyboardListener(stopSignal);
} catch (error) {
  logger.debug('Keyboard listener unavailable (non-TTY or permissions)');
  // Continue without keyboard support
}

// File operation errors don't crash execution
try {
  await stopSignal.init();
} catch (error) {
  logger.debug('StopSignal initialization error', error);
  // Continue without stop file support
}

// Cleanup errors are logged but don't fail
try {
  await stopSignal.cleanup();
} catch (error) {
  logger.debug('StopSignal cleanup error', error);
}
```

## Implementation Notes

### Registration in CLI

```typescript
// src/cli.ts

import { stopCommand } from './commands/stop.js';

// Register stop command
program.addCommand(stopCommand());
```

### Stop Check Timing

Stop signal is checked **only at iteration boundaries**:

```typescript
// In run command iteration loop

for (let i = 0; i < maxIterations; i++) {
  // Execute iteration
  await executeIteration();

  // Update stats
  stats.currentIteration = i + 1;
  stats.stopRequested = stopSignal.isStopRequested();
  stats.stopSource = stopSignal.getState().source;
  reporter.updateStats(stats);

  // Check stop AFTER iteration completes
  if (stopSignal.isStopRequested()) {
    logger.info('Stop signal received - completing gracefully');
    break;
  }
}
```

This ensures:

- Current iteration always completes
- Work is never interrupted mid-task
- Stop check overhead is minimal (once per iteration, not continuously)

### Cleanup Guarantees

Cleanup is called in `finally` block to ensure it runs even if errors occur:

```typescript
try {
  // Iteration loop
  for (...) {
    // Execute iteration
  }
} catch (error) {
  logger.error('Iteration failed', error);
  throw error;
} finally {
  // Always cleanup
  await stopSignal.cleanup();
  await reporter.cleanup();
}
```

### SIGINT/SIGTERM Handling

Graceful stop does **not** interfere with CTRL+C (SIGINT):

```typescript
// SIGINT handler (existing code, unchanged)
process.on('SIGINT', async () => {
  logger.info('Interrupted by user (CTRL+C)');
  await stopSignal.cleanup();
  await reporter.cleanup();
  process.exit(130);
});
```

User can:

- Press 's' key → graceful stop (current iteration completes)
- Press CTRL+C → immediate stop (interrupts current iteration)

## UI Integration

### Stop Indicator in Statistics Display

When stop is requested, the UI (from statistics-display) shows:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🔄 RUNNING                                                                    │
│ ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░ 12 / 50 (24%)            │
│  ⏱️  Elapsed: 5m 42s                 🔮 ETA: ~18m 30s                        │
│  ⚡ Avg/iter: 28s                     📊 Mode: loop                           │
│  🎯 Tasks: 35 / 60                    🕐 Updated: 2s ago                      │
│ 🛑 Stop requested (Press 's' to cancel)                                      │  ← Added by this feature
├──────────────────────────────────────────────────────────────────────────────┤
│ Press s to toggle stop                                                       │  ← Added by this feature
└──────────────────────────────────────────────────────────────────────────────┘
```

The stop indicator and footer are rendered by statistics-display based on `stats.stopRequested` and `stats.stopSource` fields.

## Testing Considerations

- **Mock stdin**: Inject key events without actual keyboard input
- **Mock filesystem**: Use `memfs` or similar for .stop file tests
- **Mock TTY**: Control `process.stdin.isTTY` value
- **Test both sources**: Keyboard and file independently
- **Test toggle**: Verify cancel behavior works

## Future Enhancements

- Persistent stop file option (keep .stop after run)
- Custom keyboard shortcuts (config option)
- WebSocket/HTTP stop interface
- Stop timeout (force stop after N seconds)
- Stop with reason (pass message via .stop file)
