/**
 * Output levels for console reporting
 */
export type OutputLevel = 'quiet' | 'progress' | 'verbose';

/**
 * ConsoleReporter handles structured console output based on output level
 */
export class ConsoleReporter {
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
}
