# Technical Specification: Enhanced Run Output

## Overview

### Purpose

Provide beautiful, informative terminal UI for the `run` command through two sub-features: (1) statistics display and (2) graceful stop. This parent specification defines the overall public contract and integration points.

### Scope

**This parent spec covers**:

- Overall public contract (what the complete feature exposes)
- Integration between sub-features
- High-level architecture

**Sub-feature specs cover**:

- **[Statistics Display SPEC](./features/statistics-display/SPEC.md)** - UI rendering, metrics tracking, ConsoleReporter API
- **[Graceful Stop SPEC](./features/graceful-stop/SPEC.md)** - StopSignal class, stop command, keyboard handling

## Public Contract

### Combined Feature API

The complete enhanced-output feature exposes:

**From Statistics Display**:

- `IterationStats` interface - Statistics data structure
- Enhanced `ConsoleReporter` class - TTY-aware UI rendering
- Helper functions: `calculateStats()`, `formatDuration()`, `formatRelativeTime()`

**From Graceful Stop**:

- `StopSignal` class - Stop detection and management
- `claude-iterate stop <workspace>` CLI command - Create .stop file

**Integration Point**:

```typescript
// IterationStats includes fields for stop state (from statistics-display)
export interface IterationStats {
  // ... progress and timing fields
  stopRequested: boolean; // Managed by StopSignal
  stopSource: 'keyboard' | 'file' | null; // Managed by StopSignal
}

// ConsoleReporter renders stop indicator based on stats.stopRequested
```

See sub-feature SPEC.md files for detailed API documentation.

## Dependencies

### External Dependencies

- **chalk** ^5.4.1 (existing) - Terminal colors and styling
- **Node.js stdlib** - `readline`, `fs/promises`, `process.stdout`

### Internal Dependencies

- `src/services/console-reporter.ts` - Enhanced by statistics-display
- `src/commands/run.ts` - Integrates both sub-features
- `src/types/iteration-stats.ts` - Created by statistics-display, used by graceful-stop

### Sub-Feature Dependencies

```
statistics-display
    ↓
graceful-stop (depends on statistics-display)
```

graceful-stop requires IterationStats interface from statistics-display.

## Architecture

### High-Level Integration

```
run.ts
  ├── IterationStats (statistics-display)
  │   ├── Tracks metrics
  │   └── Includes stopRequested/stopSource fields
  │
  ├── StopSignal (graceful-stop)
  │   ├── Manages keyboard + file stop detection
  │   └── Updates stats.stopRequested
  │
  └── ConsoleReporter (statistics-display)
      ├── Renders UI with stats
      └── Shows stop indicator when stats.stopRequested
```

### Integration Flow

1. **Initialization** (run.ts):
   - Create IterationStats object
   - Initialize StopSignal
   - Initialize enhanced ConsoleReporter

2. **Each Iteration** (run.ts):
   - Update IterationStats (timing, progress)
   - Check StopSignal.isStopRequested()
   - Update stats.stopRequested and stats.stopSource
   - Call ConsoleReporter.updateStats(stats)
   - Break loop if stop requested

3. **Cleanup** (run.ts):
   - ConsoleReporter.cleanup()
   - StopSignal.cleanup()

See sub-feature SPEC.md files for detailed implementation.

## Configuration

No new configuration needed. Uses existing `outputLevel` setting:

- `progress` → Enhanced UI if TTY, simple output if not
- `verbose` → Unchanged (streams full output)
- `quiet` → Unchanged (errors only)

## Non-Functional Requirements

See sub-feature SPEC.md files for detailed performance, security, and platform requirements.

## Related Documentation

- **[Statistics Display SPEC](./features/statistics-display/SPEC.md)** - Detailed technical spec for UI and metrics
- **[Graceful Stop SPEC](./features/graceful-stop/SPEC.md)** - Detailed technical spec for stop mechanism
