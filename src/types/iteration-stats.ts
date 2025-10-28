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

/**
 * Base statistics input for calculateStats
 * Contains measured values before calculation
 */
export interface BaseStats {
  currentIteration: number;
  maxIterations: number;
  tasksCompleted: number | null;
  tasksTotal: number | null;
  startTime: Date;
  lastUpdateTime: Date;
  iterationDurations: number[];
  mode: 'loop' | 'iterative';
  status: 'starting' | 'running' | 'completing' | 'stopped';
  stagnationCount?: number;
  stopRequested: boolean;
  stopSource: 'keyboard' | 'file' | null;
}

/**
 * Calculate derived statistics from base measurements
 * Called after each iteration to update display
 *
 * @param base - Base statistics with measured values
 * @returns Complete IterationStats with derived values
 */
export function calculateStats(base: BaseStats): IterationStats {
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

/**
 * Format seconds into human-readable duration
 *
 * @param seconds - Number of seconds to format
 * @returns Formatted string (e.g., "5s", "2m 30s", "1h 15m")
 *
 * @example
 * formatDuration(45) // "45s"
 * formatDuration(150) // "2m 30s"
 * formatDuration(3660) // "1h 1m"
 */
export function formatDuration(seconds: number): string {
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
 * Format date as relative time from now
 *
 * @param date - Date to format
 * @returns Formatted string (e.g., "just now", "2s ago", "5m ago")
 *
 * @example
 * formatRelativeTime(new Date(Date.now() - 2000)) // "just now"
 * formatRelativeTime(new Date(Date.now() - 10000)) // "10s ago"
 * formatRelativeTime(new Date(Date.now() - 120000)) // "2m ago"
 */
export function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}
