import chalk from 'chalk';
import logUpdate from 'log-update';
import type { IterationStats } from '../types/iteration-stats.js';
import {
  formatDuration,
  formatRelativeTime,
} from '../types/iteration-stats.js';
import { TextTable } from '../utils/text-table.js';

/**
 * Output levels for console reporting
 */
export type OutputLevel = 'quiet' | 'progress' | 'verbose';

/**
 * Internal state for TTY rendering
 * Tracks rendering metadata for in-place updates
 */
interface DisplayState {
  lastRenderTime: number; // Debounce updates (max 2 Hz)
  initialized: boolean; // Track initialization
}

/**
 * ConsoleReporter handles structured console output based on output level
 */
export class ConsoleReporter {
  private isTTY: boolean = process.stdout.isTTY ?? false;
  private state: DisplayState = {
    lastRenderTime: 0,
    initialized: false,
  };

  constructor(private level: OutputLevel) {}

  /**
   * Log error message (always shown)
   */
  error(message: string): void {
    process.stderr.write(`${message}\n`);
  }

  /**
   * Log warning message (always shown)
   */
  warning(message: string): void {
    process.stderr.write(`${message}\n`);
  }

  /**
   * Log progress message (shown in progress + verbose)
   */
  progress(message: string): void {
    if (this.level === 'progress' || this.level === 'verbose') {
      process.stdout.write(`${message}\n`);
    }
  }

  /**
   * Log status message (shown in progress + verbose)
   */
  status(message: string): void {
    if (this.level === 'progress' || this.level === 'verbose') {
      process.stdout.write(`${message}\n`);
    }
  }

  /**
   * Log verbose message (only shown in verbose)
   */
  verbose(message: string): void {
    if (this.level === 'verbose') {
      process.stdout.write(`${message}\n`);
    }
  }

  /**
   * Stream output chunk (only shown in verbose)
   */
  stream(chunk: Buffer | string): void {
    if (this.level === 'verbose') {
      const text = typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
      process.stdout.write(text);
    }
  }

  /**
   * Get current output level
   */
  getLevel(): OutputLevel {
    return this.level;
  }

  /**
   * Initialize enhanced mode (TTY only)
   * Sets up display area for in-place rendering
   */
  initEnhanced(stats: IterationStats): void {
    if (!this.isTTY || this.state.initialized) {
      return;
    }

    this.state.initialized = true;
    this.state.lastRenderTime = 0;

    // Initial render
    this.updateStats(stats);
  }

  /**
   * Update display with current statistics (TTY only)
   * Redraws entire stats panel in-place
   * Automatically debounced to max 2 Hz
   */
  updateStats(stats: IterationStats): void {
    if (!this.isTTY || !this.state.initialized) {
      return;
    }

    // Debounce: skip update if <500ms since last render
    const now = Date.now();
    if (now - this.state.lastRenderTime < 500) {
      return;
    }

    this.state.lastRenderTime = now;
    const rendered = this.renderEnhancedUI(stats);
    logUpdate(rendered);
  }

  /**
   * Clean up: restore terminal to normal mode
   * Persists the final output and moves cursor down
   */
  cleanup(): void {
    if (!this.isTTY || !this.state.initialized) {
      return;
    }

    // Persist final output and move cursor down
    logUpdate.done();

    // Reset state
    this.state.initialized = false;
    this.state.lastRenderTime = 0;
  }

  /**
   * Render enhanced UI panel with in-place updates
   * log-update handles cursor positioning automatically
   * Uses TextTable for all layout calculations
   */
  private renderEnhancedUI(stats: IterationStats): string {
    const width = process.stdout.columns || 80;
    const halfWidth = Math.floor(width / 2);
    const table = new TextTable({
      width: width,
      padding: 1,
      borderColor: chalk.cyan,
    });

    // Title row
    const title = `${chalk.bold('claude-iterate')} ${chalk.dim('→')} ${stats.mode} mode`;
    table.addRow([{ content: title, width: 74 }], 'header');
    table.addDivider();

    // Status row
    const statusColor = this.getStatusColor(stats.status);
    const statusIcon = this.getStatusIcon(stats.status);
    const statusText = `${statusIcon} ${stats.status.toUpperCase()}`;
    table.addRow([{ content: statusColor(statusText), width: width }]);

    // Progress bar row
    const progressBar = this.renderProgressBar(stats);
    table.addRow([{ content: progressBar, width: width }]);

    // Statistics grid (2 columns)
    const statsRows = this.getStatsRows(stats);
    for (const [left, right] of statsRows) {
      table.addRow([
        { content: left, width: halfWidth, align: 'left' },
        { content: right, width: halfWidth, align: 'left' },
      ]);
    }

    // Stop signal indicator (if requested)
    if (stats.stopRequested) {
      const source =
        stats.stopSource === 'keyboard'
          ? "Press 's' to cancel"
          : 'Delete .stop file to cancel';
      const stopText =
        chalk.yellow('[STOP] Stop requested') + chalk.dim(` (${source})`);
      table.addRow([{ content: stopText, width: width }]);
    }

    // Footer
    table.addDivider();
    const footerText = chalk.dim(
      '[Stop controls reserved for graceful-stop sub-feature]'
    );
    table.addRow([{ content: footerText, width: width }], 'footer');

    return table.render().join('\n');
  }

  /**
   * Render visual progress bar with percentage
   */
  private renderProgressBar(stats: IterationStats): string {
    const width = 50;
    const percent = stats.currentIteration / stats.maxIterations;
    const filled = Math.floor(width * percent);
    const empty = width - filled;

    const bar = chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
    const label = `${stats.currentIteration} / ${stats.maxIterations}`;
    const percentText = `(${Math.floor(percent * 100)}%)`;

    return `${bar} ${chalk.bold(label)} ${chalk.dim(percentText)}`;
  }

  /**
   * Get statistics rows for two-column layout
   * Returns array of [left, right] tuples
   */
  private getStatsRows(stats: IterationStats): Array<[string, string]> {
    const col1 = [
      `Elapsed: ${formatDuration(stats.elapsedSeconds)}`,
      `Avg/iter: ${stats.avgIterationSeconds}s`,
      `Tasks: ${stats.tasksCompleted ?? '-'} / ${stats.tasksTotal ?? '-'}`,
      stats.stagnationCount !== undefined
        ? `[!] Stagnation: ${stats.stagnationCount}`
        : null,
    ].filter((item): item is string => item !== null);

    const col2 = [
      `ETA: ${stats.etaSeconds ? formatDuration(stats.etaSeconds) : 'calculating...'}`,
      `Mode: ${stats.mode}`,
      `Updated: ${formatRelativeTime(stats.lastUpdateTime)}`,
    ];

    // Pair up columns into rows and normalize content
    // Normalization prevents embedded newlines from breaking table layout
    const rows: Array<[string, string]> = [];
    const maxRows = Math.max(col1.length, col2.length);
    for (let i = 0; i < maxRows; i++) {
      const left = (col1[i] ?? '').replace(/\s+/g, ' ').trim();
      const right = (col2[i] ?? '').replace(/\s+/g, ' ').trim();
      rows.push([left, right]);
    }

    return rows;
  }

  /**
   * Get color function for status
   */
  private getStatusColor(status: string): (text: string) => string {
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
   * Get ASCII icon for status
   * No emojis - ASCII only for consistent cross-platform alignment
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'starting':
        return '[...]';
      case 'running':
        return '[>]';
      case 'completing':
        return '[OK]';
      case 'stopped':
        return '[X]';
      default:
        return '[?]';
    }
  }
}
