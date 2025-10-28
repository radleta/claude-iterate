import chalk from 'chalk';

/**
 * Logger utility with colored output
 */
export class Logger {
  constructor(
    private colors: boolean = true,
    private suppressConsole: boolean = false
  ) {}

  /**
   * Enable or disable console output suppression
   * Used when enhanced UI (log-update) is active to prevent interference
   */
  setSuppressConsole(suppress: boolean): void {
    this.suppressConsole = suppress;
  }

  /**
   * Log info message (blue)
   */
  info(message: string): void {
    if (this.suppressConsole) return;

    if (this.colors) {
      console.log(chalk.blue('ℹ'), message);
    } else {
      console.log('[INFO]', message);
    }
  }

  /**
   * Log success message (green)
   */
  success(message: string): void {
    if (this.suppressConsole) return;

    if (this.colors) {
      console.log(chalk.green('✓'), message);
    } else {
      console.log('[SUCCESS]', message);
    }
  }

  /**
   * Log warning message (yellow)
   */
  warn(message: string): void {
    if (this.colors) {
      console.warn(chalk.yellow('⚠'), message);
    } else {
      console.warn('[WARN]', message);
    }
  }

  /**
   * Log error message (red)
   */
  error(message: string, error?: Error): void {
    if (this.colors) {
      console.error(chalk.red('✗'), message);
      if (error && error.stack) {
        console.error(chalk.gray(error.stack));
      }
    } else {
      console.error('[ERROR]', message);
      if (error && error.stack) {
        console.error(error.stack);
      }
    }
  }

  /**
   * Log debug message (gray) - only in verbose mode
   */
  debug(message: string, verbose: boolean = false): void {
    if (!verbose || this.suppressConsole) return;

    if (this.colors) {
      console.log(chalk.gray('⚙'), chalk.gray(message));
    } else {
      console.log('[DEBUG]', message);
    }
  }

  /**
   * Log section header
   */
  header(message: string): void {
    if (this.suppressConsole) return;

    if (this.colors) {
      console.log(chalk.bold.cyan(`\n━━━ ${message} ━━━\n`));
    } else {
      console.log(`\n=== ${message} ===\n`);
    }
  }

  /**
   * Log plain message (no formatting)
   */
  log(message: string): void {
    if (this.suppressConsole) return;

    console.log(message);
  }

  /**
   * Log empty line
   */
  line(): void {
    if (this.suppressConsole) return;

    console.log();
  }

  /**
   * Create table output
   */
  table(data: Record<string, string>[]): void {
    if (this.suppressConsole) return;

    console.table(data);
  }
}
