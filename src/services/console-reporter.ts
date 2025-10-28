import chalk from 'chalk';
import logUpdate from 'log-update';
import type { IterationStats } from '../types/iteration-stats.js';
import {
  formatDuration,
  formatRelativeTime,
} from '../types/iteration-stats.js';
import { getBoxCharacters } from '../utils/box-characters.js';

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
   */
  private renderEnhancedUI(stats: IterationStats): string {
    const lines: string[] = [];

    // Box characters (platform-aware)
    const box = getBoxCharacters();

    // Box top
    lines.push(
      chalk.cyan(box.topLeft + box.horizontal.repeat(76) + box.topRight)
    );

    // Title
    const title = ` ${chalk.bold('claude-iterate')} ${chalk.dim('→')} ${stats.mode} mode`;
    const titlePadding = 78 - this.stripAnsi(title).length;
    lines.push(
      chalk.cyan(box.vertical) +
        title +
        ' '.repeat(titlePadding) +
        chalk.cyan(box.vertical)
    );

    // Divider
    lines.push(chalk.cyan(box.leftT + box.horizontal.repeat(76) + box.rightT));

    // Status indicator with color
    const statusColor = this.getStatusColor(stats.status);
    const statusIcon = this.getStatusIcon(stats.status);
    const statusText = `${statusIcon} ${stats.status.toUpperCase()}`;
    const statusPadding = 78 - this.stripAnsi(statusText).length - 2;
    lines.push(
      chalk.cyan(box.vertical) +
        ' ' +
        statusColor(statusText) +
        ' '.repeat(statusPadding) +
        chalk.cyan(box.vertical)
    );

    // Progress bar
    const progressBar = this.renderProgressBar(stats);
    const barPadding = 78 - this.stripAnsi(progressBar).length - 2;
    lines.push(
      chalk.cyan(box.vertical) +
        ' ' +
        progressBar +
        ' '.repeat(barPadding) +
        chalk.cyan(box.vertical)
    );

    // Statistics grid (2 columns)
    const gridLines = this.renderStatsGrid(stats);
    for (const gridLine of gridLines) {
      const gridPadding = 78 - this.stripAnsi(gridLine).length - 2;
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
      const stopPadding = 78 - this.stripAnsi(stopText).length - 2;
      lines.push(
        chalk.cyan(box.vertical) +
          ' ' +
          stopText +
          ' '.repeat(stopPadding) +
          chalk.cyan(box.vertical)
      );
    }

    // Box bottom (footer reserved for graceful-stop sub-feature)
    lines.push(chalk.cyan(box.leftT + box.horizontal.repeat(76) + box.rightT));
    const footerText = chalk.dim(
      ' [Stop controls reserved for graceful-stop sub-feature]'
    );
    const footerPadding = 78 - this.stripAnsi(footerText).length - 2;
    lines.push(
      chalk.cyan(box.vertical) +
        footerText +
        ' '.repeat(footerPadding) +
        chalk.cyan(box.vertical)
    );
    lines.push(
      chalk.cyan(box.bottomLeft + box.horizontal.repeat(76) + box.bottomRight)
    );

    return lines.join('\n');
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
   * Render two-column statistics grid
   * Returns array of formatted lines
   */
  private renderStatsGrid(stats: IterationStats): string[] {
    const col1 = [
      `⏱️  Elapsed: ${formatDuration(stats.elapsedSeconds)}`,
      `⚡ Avg/iter: ${stats.avgIterationSeconds}s`,
      `🎯 Tasks: ${stats.tasksCompleted ?? '-'} / ${stats.tasksTotal ?? '-'}`,
      stats.stagnationCount !== undefined
        ? `⚠️  Stagnation: ${stats.stagnationCount}`
        : null,
    ].filter((item): item is string => item !== null);

    const col2 = [
      `🔮 ETA: ${stats.etaSeconds ? formatDuration(stats.etaSeconds) : 'calculating...'}`,
      `📊 Mode: ${stats.mode}`,
      `🕐 Updated: ${formatRelativeTime(stats.lastUpdateTime)}`,
    ];

    // Render two columns side-by-side
    const col1Width = 38;
    const lines: string[] = [];

    const maxRows = Math.max(col1.length, col2.length);
    for (let i = 0; i < maxRows; i++) {
      const left = (col1[i] ?? '').padEnd(col1Width);
      const right = col2[i] ?? '';
      lines.push(`${left}${right}`);
    }

    return lines;
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
   * Get icon for status
   */
  private getStatusIcon(status: string): string {
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

  /**
   * Strip ANSI codes to calculate actual string length
   */
  private stripAnsi(str: string): string {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  }
}
