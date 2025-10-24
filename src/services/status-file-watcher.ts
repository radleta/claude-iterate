import { EventEmitter } from 'events';
import { FSWatcher, watch, readFileSync } from 'fs';
import {
  StatusChangedEvent,
  StatusDelta,
  StatusFileWatcherOptions,
} from '../types/notification.js';
import { WorkspaceStatus, WorkspaceStatusSchema } from '../types/status.js';

/**
 * Watches .status.json file for changes and emits events
 * Debounces file changes to prevent spam and detects meaningful changes only
 */
export class StatusFileWatcher extends EventEmitter {
  private readonly statusPath: string;
  private readonly debounceMs: number;
  private readonly notifyOnlyMeaningful: boolean;
  private watcher: FSWatcher | null = null;
  private previousState: WorkspaceStatus | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(statusPath: string, options: StatusFileWatcherOptions = {}) {
    super();
    this.statusPath = statusPath;
    this.debounceMs = options.debounceMs ?? 2000;
    this.notifyOnlyMeaningful = options.notifyOnlyMeaningful ?? true;
  }

  /**
   * Start watching the status file
   */
  public start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Read initial state
    this.previousState = this.readStatusFile();

    try {
      // Watch for changes to the status file
      this.watcher = watch(this.statusPath, (eventType) => {
        if (eventType === 'change') {
          this.handleFileChange();
        }
      });

      this.watcher.on('error', (error) => {
        // Log but don't crash - file might not exist yet
        console.warn(`Status file watcher error: ${error.message}`);
      });
    } catch (error) {
      // File might not exist yet - that's ok
      const err = error as Error;
      if (!err.message.includes('ENOENT')) {
        console.warn(`Could not start status file watcher: ${err.message}`);
      }
    }
  }

  /**
   * Stop watching and clean up
   */
  public stop(): void {
    this.isRunning = false;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    this.removeAllListeners();
  }

  /**
   * Handle file change with debouncing
   */
  private handleFileChange(): void {
    if (!this.isRunning) {
      return;
    }

    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Debounce to avoid rapid-fire notifications
    this.debounceTimer = setTimeout(() => {
      this.processStatusChange();
    }, this.debounceMs);
  }

  /**
   * Process the actual status change
   */
  private processStatusChange(): void {
    const currentState = this.readStatusFile();

    if (!currentState) {
      // File doesn't exist or couldn't be read
      return;
    }

    if (!this.hasSignificantChange(this.previousState, currentState)) {
      // No meaningful change
      return;
    }

    this.emitStatusChanged(this.previousState, currentState);
    this.previousState = currentState;
  }

  /**
   * Read and parse the status file
   */
  private readStatusFile(): WorkspaceStatus | null {
    try {
      const content = readFileSync(this.statusPath, 'utf-8');
      const parsed = JSON.parse(content);
      return WorkspaceStatusSchema.parse(parsed);
    } catch {
      // File doesn't exist, invalid JSON, or schema validation failed
      return null;
    }
  }

  /**
   * Determine if the change is significant enough to notify
   */
  private hasSignificantChange(
    previous: WorkspaceStatus | null,
    current: WorkspaceStatus
  ): boolean {
    if (!previous) {
      // First time we're seeing status
      return true;
    }

    if (!this.notifyOnlyMeaningful) {
      // Notify on any change
      return true;
    }

    // Check for meaningful changes
    const progressChanged =
      previous.progress?.completed !== current.progress?.completed ||
      previous.progress?.total !== current.progress?.total;

    const completionChanged = previous.complete !== current.complete;
    const summaryChanged = previous.summary !== current.summary;

    return progressChanged || completionChanged || summaryChanged;
  }

  /**
   * Calculate delta and emit event
   */
  private emitStatusChanged(
    previous: WorkspaceStatus | null,
    current: WorkspaceStatus
  ): void {
    const delta = this.calculateDelta(previous, current);

    const event: StatusChangedEvent = {
      previous,
      current,
      delta,
      timestamp: new Date(),
    };

    this.emit('statusChanged', event);
  }

  /**
   * Calculate the delta between states
   */
  private calculateDelta(
    previous: WorkspaceStatus | null,
    current: WorkspaceStatus
  ): StatusDelta {
    if (!previous) {
      return {
        progressChanged: true,
        completedDelta: current.progress?.completed ?? 0,
        totalDelta: current.progress?.total ?? 0,
        completionStatusChanged: current.complete,
        summaryChanged: true,
      };
    }

    const prevCompleted = previous.progress?.completed ?? 0;
    const currCompleted = current.progress?.completed ?? 0;
    const prevTotal = previous.progress?.total ?? 0;
    const currTotal = current.progress?.total ?? 0;

    return {
      progressChanged:
        prevCompleted !== currCompleted || prevTotal !== currTotal,
      completedDelta: currCompleted - prevCompleted,
      totalDelta: currTotal - prevTotal,
      completionStatusChanged: previous.complete !== current.complete,
      summaryChanged: previous.summary !== current.summary,
    };
  }
}
