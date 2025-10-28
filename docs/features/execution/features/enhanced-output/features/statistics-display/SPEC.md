# Technical Specification: Statistics Display

## Overview

### Purpose

Provide beautiful, real-time execution statistics in the terminal with visual progress indicators, replacing simple line-by-line progress output with an interactive UI that automatically adapts to TTY vs non-TTY environments.

### Scope

**In Scope:**

- Enhanced ConsoleReporter with TTY-aware rendering
- Real-time statistics display (9 core metrics)
- Unicode box-drawing UI with color-coded status
- Visual progress bar and statistics grid
- Graceful degradation for non-TTY environments (CI/CD)
- Cross-platform support (Windows, macOS, Linux)
- Performance-optimized rendering (<10ms per update)

**Out of Scope:**

- Stop signal handling (handled by graceful-stop sub-feature)
- Keyboard interaction (handled by graceful-stop sub-feature)
- Mouse interaction
- Real-time graphing/charts (future enhancement)
- Configuration options for UI themes
- Changes to verbose or quiet output modes

### Goals

1. **Beautiful DX**: Modern, color-coded terminal UI that looks professional
2. **Informative**: Display actionable metrics without information overload
3. **Adaptive**: Automatically detect TTY capability and adapt rendering
4. **Performant**: Minimal overhead (<10ms render time, 2 Hz max update rate)
5. **Robust**: Use battle-tested libraries (log-update) to handle terminal edge cases correctly

## Public Contract

### IterationStats Interface

```typescript
/**
 * Statistics tracked during execution
 * Provides all data needed for UI rendering
 */
export interface IterationStats {
  // Progress
  currentIteration: number;
  maxIterations: number;
  tasksCompleted: number | null; // From .status.json
  tasksTotal: number | null; // From .status.json

  // Timing
  startTime: Date;
  lastUpdateTime: Date;
  iterationDurations: number[]; // Milliseconds, last N iterations

  // Calculated (derived from above)
  elapsedSeconds: number;
  avgIterationSeconds: number;
  etaSeconds: number | null; // Null until enough data

  // Mode and status
  mode: 'loop' | 'iterative';
  status: 'starting' | 'running' | 'completing' | 'stopped';
  stagnationCount?: number; // Iterative mode only

  // Stop signal (managed by graceful-stop sub-feature)
  stopRequested: boolean;
  stopSource: 'keyboard' | 'file' | null;
}
```

### Enhanced ConsoleReporter API

```typescript
/**
 * Enhanced console reporter with TTY-aware rendering
 * Extends existing ConsoleReporter with new methods
 */
export class ConsoleReporter {
  constructor(
    private level: OutputLevel,
    private isTTY: boolean = process.stdout.isTTY ?? false
  );

  /**
   * Initialize enhanced mode (TTY only)
   * Sets up display area for in-place rendering
   */
  initEnhanced(stats: IterationStats): void;

  /**
   * Update display with current statistics (TTY only)
   * Redraws entire stats panel in-place
   * Automatically debounced to max 2 Hz
   */
  updateStats(stats: IterationStats): void;

  /**
   * Clean up: restore terminal to normal mode
   */
  cleanup(): void;

  // Existing methods (unchanged)
  error(message: string): void;
  warning(message: string): void;
  progress(message: string): void;
  status(message: string): void;
  verbose(message: string): void;
  stream(chunk: Buffer | string): void;
  getLevel(): OutputLevel;
}
```

## Dependencies

### External Dependencies

- **chalk** ^5.4.1 (existing) - Terminal colors and styling
- **log-update** ^6.1.0 (new) - Automatic terminal output updating with cursor positioning
  - Battle-tested library by Sindre Sorhus (same author as chalk)
  - Handles ANSI cursor positioning, clearing, and edge cases
  - Small footprint (~3KB), zero dependencies except ansi-escapes
  - Widely used (5M+ downloads/week) in popular CLIs (Listr, Ora, etc.)
- **Node.js stdlib** - Standard library only
  - `process.stdout` - TTY detection

### Internal Dependencies

- `src/services/console-reporter.ts` - Will be enhanced with new methods
- `src/commands/run.ts` - Will integrate IterationStats tracking
- `src/types/iteration-stats.ts` - New file for IterationStats interface

**Can be implemented independently** - This feature does not require graceful-stop to function. It provides the UI foundation that graceful-stop will integrate with.

## Data Structures

### Statistics Calculation

```typescript
/**
 * Calculate derived statistics from base measurements
 * Called after each iteration to update display
 */
function calculateStats(base: BaseStats): IterationStats {
  const elapsed = Date.now() - base.startTime.getTime();
  const elapsedSeconds = Math.floor(elapsed / 1000);

  // Average iteration time (last 5 iterations for accuracy)
  const recentDurations = base.iterationDurations.slice(-5);
  const avgIterationSeconds =
    recentDurations.length > 0
      ? Math.floor(
          recentDurations.reduce((a, b) => a + b, 0) /
            recentDurations.length /
            1000
        )
      : 0;

  // ETA calculation (null until enough data)
  const remainingIterations = base.maxIterations - base.currentIteration;
  const etaSeconds =
    avgIterationSeconds > 0 && recentDurations.length >= 5
      ? remainingIterations * avgIterationSeconds
      : null;

  return {
    ...base,
    elapsedSeconds,
    avgIterationSeconds,
    etaSeconds,
  };
}
```

### Display State

```typescript
/**
 * Internal state for TTY rendering
 * Tracks rendering metadata for in-place updates
 */
interface DisplayState {
  linesRendered: number; // Track lines for clearing
  lastRenderTime: number; // Debounce updates (max 2 Hz)
  initialized: boolean; // Track initialization
}
```

## Algorithms

### TTY Detection and Mode Selection

```typescript
/**
 * Determine output mode based on TTY capability
 * Progress mode: enhanced UI if TTY, simple output if not
 * Verbose/quiet modes: unchanged
 */
function selectOutputMode(
  level: OutputLevel
): 'enhanced' | 'simple' | 'quiet' | 'verbose' {
  // Quiet and verbose unchanged
  if (level === 'quiet' || level === 'verbose') {
    return level;
  }

  // Progress mode: detect TTY capability
  if (level === 'progress') {
    const isTTY = process.stdout.isTTY ?? false;
    const supportsColor = process.stdout.hasColors?.() ?? true;

    if (isTTY && supportsColor) {
      return 'enhanced'; // Rich UI
    } else {
      return 'simple'; // Plain line-by-line
    }
  }

  return 'simple';
}
```

### UI Rendering (TTY Mode)

```typescript
/**
 * Render enhanced UI panel with in-place updates
 * Uses ANSI escape codes to update existing content
 */
function renderEnhancedUI(stats: IterationStats, state: DisplayState): string {
  const lines: string[] = [];

  // Clear previous render (move cursor up, clear lines)
  if (state.linesRendered > 0) {
    lines.push(`\x1b[${state.linesRendered}A`); // Move up N lines
    lines.push('\x1b[0J'); // Clear from cursor down
  }

  // Box characters (platform-aware)
  const box = getBoxCharacters();

  // Box top
  lines.push(
    chalk.cyan(box.topLeft + box.horizontal.repeat(76) + box.topRight)
  );

  // Title
  const title = ` ${chalk.bold('claude-iterate')} ${chalk.dim('→')} ${stats.mode} mode`;
  const titlePadding = 78 - stripAnsi(title).length;
  lines.push(
    chalk.cyan(box.vertical) +
      title +
      ' '.repeat(titlePadding) +
      chalk.cyan(box.vertical)
  );

  // Divider
  lines.push(
    chalk.cyan(box.horizontal + box.horizontal.repeat(76) + box.horizontal)
  );

  // Status indicator with color
  const statusColor = getStatusColor(stats.status);
  const statusIcon = getStatusIcon(stats.status);
  const statusText = `${statusIcon} ${stats.status.toUpperCase()}`;
  const statusPadding = 78 - stripAnsi(statusText).length - 2;
  lines.push(
    chalk.cyan(box.vertical) +
      ' ' +
      statusColor(statusText) +
      ' '.repeat(statusPadding) +
      chalk.cyan(box.vertical)
  );

  // Progress bar
  const progressBar = renderProgressBar(stats);
  const barPadding = 78 - stripAnsi(progressBar).length - 2;
  lines.push(
    chalk.cyan(box.vertical) +
      ' ' +
      progressBar +
      ' '.repeat(barPadding) +
      chalk.cyan(box.vertical)
  );

  // Statistics grid (2 columns)
  const gridLines = renderStatsGrid(stats);
  for (const gridLine of gridLines) {
    const gridPadding = 78 - stripAnsi(gridLine).length - 2;
    lines.push(
      chalk.cyan(box.vertical) +
        ' ' +
        gridLine +
        ' '.repeat(gridPadding) +
        chalk.cyan(box.vertical)
    );
  }

  // Stop signal indicator (if requested) - managed by graceful-stop sub-feature
  if (stats.stopRequested) {
    const source =
      stats.stopSource === 'keyboard'
        ? "Press 's' to cancel"
        : 'Delete .stop file to cancel';
    const stopText =
      chalk.yellow('🛑 Stop requested') + chalk.dim(` (${source})`);
    const stopPadding = 78 - stripAnsi(stopText).length - 2;
    lines.push(
      chalk.cyan(box.vertical) +
        ' ' +
        stopText +
        ' '.repeat(stopPadding) +
        chalk.cyan(box.vertical)
    );
  }

  // Box bottom (footer reserved for graceful-stop sub-feature)
  lines.push(
    chalk.cyan(box.horizontal + box.horizontal.repeat(76) + box.horizontal)
  );
  lines.push(
    chalk.cyan(box.vertical) +
      chalk.dim(' [Stop controls reserved for graceful-stop sub-feature]') +
      ' '.repeat(33) +
      chalk.cyan(box.vertical)
  );
  lines.push(
    chalk.cyan(box.bottomLeft + box.horizontal.repeat(76) + box.bottomRight)
  );

  state.linesRendered = lines.length;
  return lines.join('\n');
}

/**
 * Strip ANSI codes to calculate actual string length
 */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}
```

### Progress Bar

```typescript
/**
 * Render visual progress bar with percentage
 */
function renderProgressBar(stats: IterationStats): string {
  const width = 50;
  const percent = stats.currentIteration / stats.maxIterations;
  const filled = Math.floor(width * percent);
  const empty = width - filled;

  const bar = chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
  const label = `${stats.currentIteration} / ${stats.maxIterations}`;
  const percentText = `(${Math.floor(percent * 100)}%)`;

  return `${bar} ${chalk.bold(label)} ${chalk.dim(percentText)}`;
}
```

### Statistics Grid

```typescript
/**
 * Render two-column statistics grid
 * Returns array of formatted lines
 */
function renderStatsGrid(stats: IterationStats): string[] {
  const grid = [
    // Column 1 (left side)
    [
      `⏱️  Elapsed: ${formatDuration(stats.elapsedSeconds)}`,
      `⚡ Avg/iter: ${stats.avgIterationSeconds}s`,
      `🎯 Tasks: ${stats.tasksCompleted ?? '-'} / ${stats.tasksTotal ?? '-'}`,
      stats.stagnationCount !== undefined
        ? `⚠️  Stagnation: ${stats.stagnationCount}`
        : null,
    ].filter(Boolean),

    // Column 2 (right side)
    [
      `🔮 ETA: ${stats.etaSeconds ? formatDuration(stats.etaSeconds) : 'calculating...'}`,
      `📊 Mode: ${stats.mode}`,
      `🕐 Updated: ${formatRelativeTime(stats.lastUpdateTime)}`,
    ],
  ];

  // Render two columns side-by-side
  const col1Width = 38;
  const lines: string[] = [];

  for (let i = 0; i < Math.max(grid[0].length, grid[1].length); i++) {
    const left = (grid[0][i] ?? '').padEnd(col1Width);
    const right = grid[1][i] ?? '';
    lines.push(`${left}${right}`);
  }

  return lines;
}

/**
 * Format seconds into human-readable duration
 * Examples: "5s", "2m 30s", "1h 15m"
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Format date as relative time
 * Examples: "just now", "2s ago", "5m ago"
 */
function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}
```

### Status Colors and Icons

```typescript
/**
 * Get color function for status
 */
function getStatusColor(status: string): (text: string) => string {
  switch (status) {
    case 'starting':
      return chalk.blue;
    case 'running':
      return chalk.cyan;
    case 'completing':
      return chalk.green;
    case 'stopped':
      return chalk.yellow;
    default:
      return chalk.white;
  }
}

/**
 * Get icon for status
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'starting':
      return '⏳';
    case 'running':
      return '🔄';
    case 'completing':
      return '✅';
    case 'stopped':
      return '🛑';
    default:
      return '❓';
  }
}
```

## Cross-Platform Considerations

### Box Character Selection

```typescript
/**
 * Get box drawing characters based on platform
 * Modern terminals: Unicode box-drawing characters
 * Legacy Windows: ASCII fallback
 */
interface BoxChars {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
}

function getBoxCharacters(): BoxChars {
  const platform = process.platform;
  const isWindowsLegacy = platform === 'win32' && !process.env.WT_SESSION;

  if (isWindowsLegacy) {
    // Fallback for older Windows console
    return {
      topLeft: '+',
      topRight: '+',
      bottomLeft: '+',
      bottomRight: '+',
      horizontal: '-',
      vertical: '|',
    };
  }

  // Modern terminals (including Windows Terminal)
  return {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
  };
}
```

### Platform Support Matrix

| Platform               | Unicode Box         | ANSI Colors  | TTY Detection |
| ---------------------- | ------------------- | ------------ | ------------- |
| Windows Terminal       | ✅                  | ✅           | ✅            |
| Legacy Windows Console | ❌ (ASCII fallback) | ✅           | ✅            |
| macOS Terminal         | ✅                  | ✅           | ✅            |
| Linux Terminals        | ✅                  | ✅           | ✅            |
| CI/CD (non-TTY)        | N/A (simple output) | ❌ (no ANSI) | ✅            |

## Non-Functional Requirements

### Performance

- **UI update rate**: Max 2 Hz (500ms minimum between renders) to prevent flickering
- **Render time**: <10ms per update (measured with `performance.now()`)
- **Memory usage**: Track only last 10 iteration durations (O(1) space, ~80 bytes)
- **Overhead**: Negligible vs iteration time (~20-60s per iteration)
- **Debouncing**: Automatic debouncing in `updateStats()` method

```typescript
/**
 * Debounce logic in updateStats()
 */
updateStats(stats: IterationStats): void {
  const now = Date.now();
  if (now - this.state.lastRenderTime < 500) {
    return; // Skip update (too soon)
  }

  this.state.lastRenderTime = now;
  const rendered = renderEnhancedUI(stats, this.state);
  process.stdout.write(rendered);
}
```

### Accessibility

- **Color-blind friendly**: Use icons + text labels, not color alone
  - Status: ⏳ (starting), 🔄 (running), ✅ (completing), 🛑 (stopped)
- **Screen readers**: Non-TTY mode provides plain text output
- **High contrast**: Use bold text for important information
- **No flickering**: Max 2 Hz update rate prevents visual strain

### Error Handling

```typescript
// Graceful degradation if UI initialization fails
try {
  reporter.initEnhanced(stats);
} catch (error) {
  logger.warn(
    'Enhanced UI initialization failed, falling back to simple output'
  );
  useFallbackOutput = true;
}

// Rendering errors don't crash execution
try {
  reporter.updateStats(stats);
} catch (error) {
  logger.debug('Stats update failed, continuing execution');
  // Execution continues normally
}
```

## Configuration

### No New Configuration Needed

Enhanced output uses existing `outputLevel` configuration:

```typescript
// Existing config (no changes)
{
  "outputLevel": "progress"  // Now uses enhanced UI if TTY
}
```

### Behavior by Output Level

| Level      | TTY Available | Behavior                                         |
| ---------- | ------------- | ------------------------------------------------ |
| `progress` | Yes           | Enhanced UI with stats (this feature)            |
| `progress` | No (CI/CD)    | Simple line-by-line output (backward compatible) |
| `verbose`  | Any           | Full Claude output streaming (unchanged)         |
| `quiet`    | Any           | Errors only (unchanged)                          |

## Implementation Notes

### Terminal Rendering Library Choice: log-update

**Decision**: Use `log-update` library instead of manual ANSI cursor positioning.

**Rationale**:

1. **Battle-tested**: 5M+ downloads/week, used by popular CLIs (Listr, Ora, etc.)
2. **Edge case handling**: Handles complex terminal scenarios we might miss:
   - Cursor positioning bugs (off-by-one errors with trailing newlines)
   - Terminal resize events
   - Multi-line update race conditions
   - TTY detection edge cases
3. **Maintainability**: ~50% less code in ConsoleReporter (no manual cursor math)
4. **Trusted source**: By Sindre Sorhus (same author as chalk, which we already use)
5. **Small footprint**: ~3KB, minimal dependency tree (only ansi-escapes)

**Initial implementation attempt**: Manual ANSI escape codes (`\x1b[NA\x1b[0J`) had bugs:

- ANSI codes incorrectly counted in line count, causing cursor to move too far
- Trailing newline placement issues causing overlapping renders
- Fragile cursor positioning logic prone to off-by-one errors

**log-update benefits**:

- Automatic cursor positioning and clearing
- Abstracts away ANSI complexity
- Well-tested against terminal edge cases
- Simple API: `logUpdate(content)`, `logUpdate.clear()`, `logUpdate.done()`

**Tradeoff**: Adds 1 new dependency, but significantly improves robustness and maintainability.

### Integration with run.ts

The `run` command will:

1. **Initialize statistics tracker** before iteration loop:

   ```typescript
   const stats: IterationStats = {
     currentIteration: 0,
     maxIterations,
     tasksCompleted: null,
     tasksTotal: null,
     startTime: new Date(),
     lastUpdateTime: new Date(),
     iterationDurations: [],
     elapsedSeconds: 0,
     avgIterationSeconds: 0,
     etaSeconds: null,
     mode: metadata.mode,
     status: 'starting',
     stopRequested: false,
     stopSource: null,
   };
   ```

2. **Initialize enhanced reporter** (if progress mode + TTY):

   ```typescript
   if (reporter.getLevel() === 'progress' && process.stdout.isTTY) {
     reporter.initEnhanced(stats);
   }
   ```

3. **Update stats after each iteration**:

   ```typescript
   stats.currentIteration = iterationCount;
   stats.iterationDurations.push(iterationDuration);
   stats.lastUpdateTime = new Date();

   // Read .status.json
   const status = await workspace.getStatus();
   stats.tasksCompleted = status.progress?.completed ?? null;
   stats.tasksTotal = status.progress?.total ?? null;

   // Calculate derived stats
   const updatedStats = calculateStats(stats);

   // Update UI
   reporter.updateStats(updatedStats);
   ```

4. **Cleanup on exit**:

   ```typescript
   try {
     await reporter.cleanup();
   } catch (error) {
     logger.debug('Cleanup error', error);
   }
   ```

### Backward Compatibility

- Existing `ConsoleReporter` API unchanged (new methods added)
- Verbose mode: No changes (still streams full output)
- Quiet mode: No changes (still errors only)
- Non-TTY: Automatically falls back to simple output
- Tests: Existing tests pass (new tests added for enhanced mode)

### Testing Considerations

- **Mock TTY**: Use `process.stdout.isTTY = false` in tests
- **Mock log-update**: Mock `logUpdate()`, `logUpdate.clear()`, `logUpdate.done()` for testing
- **Mock time**: Control iteration durations for ETA calculation
- **Snapshot tests**: Capture rendered output for visual regression
- **Cross-platform tests**: Test box character selection on different platforms

**Note**: By mocking `log-update`, we test our rendering logic while delegating cursor positioning complexity to the well-tested library.

## UI Mockup (Example Output)

### Starting State (TTY Mode)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ claude-iterate → loop mode                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│ ⏳ STARTING                                                                   │
│ ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 3 / 50 (6%)              │
│  ⏱️  Elapsed: 1m 23s                 🔮 ETA: calculating...                  │
│  ⚡ Avg/iter: 27s                     📊 Mode: loop                           │
│  🎯 Tasks: 2 / 45                     🕐 Updated: 2s ago                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Stop controls reserved for graceful-stop sub-feature]                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Running State (TTY Mode)

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

### Non-TTY Output (CI/CD Mode)

```
Starting claude-iterate run for workspace: my-task
Mode: loop | Max iterations: 50 | Delay: 2s

Running iteration 1...
✓ Iteration 1 complete (59 items remaining)

Running iteration 2...
✓ Iteration 2 complete (58 items remaining)

...
```

## Security Considerations

- **No user input**: This feature only displays information, doesn't accept input
- **ANSI injection**: All user-controlled strings (workspace names, task summaries) are sanitized before display
- **Terminal state**: Cleanup ensures terminal is restored to normal mode even if process crashes

## Future Enhancements

- **More statistics**: Success/failure rate, memory usage, cost estimation
- **Export stats**: JSON output of execution statistics
- **Notification integration**: Send stats updates via existing notification system
- **Custom themes**: Config option to customize colors and icons
