import { promises as fs } from 'fs';
import { dirname } from 'path';
import { ensureDir } from '../utils/fs.js';

/**
 * FileLogger handles writing iteration logs to timestamped files
 */
export class FileLogger {
  private buffer: string = '';
  private initialized: boolean = false;

  constructor(
    private logPath: string,
    private enabled: boolean = true
  ) {}

  /**
   * Initialize the log file with header
   */
  private async init(): Promise<void> {
    if (this.initialized || !this.enabled) {
      return;
    }

    try {
      // Ensure log directory exists
      await ensureDir(dirname(this.logPath));

      // Create file with header
      const header = this.formatHeader();
      await fs.writeFile(this.logPath, header, 'utf8');
      this.initialized = true;
    } catch {
      // Silently fail - don't block execution if logging fails
      this.enabled = false;
    }
  }

  /**
   * Format log file header
   */
  private formatHeader(): string {
    const timestamp = new Date().toISOString();
    return `${'='.repeat(80)}
CLAUDE ITERATE - EXECUTION LOG
Started: ${timestamp}
${'='.repeat(80)}

`;
  }

  /**
   * Log run metadata (called once at start)
   */
  async logRunStart(metadata: {
    workspace: string;
    mode: string;
    maxIterations: number;
    startTime: Date;
  }): Promise<void> {
    if (!this.enabled) return;

    await this.init();

    const content = `${'='.repeat(80)}
RUN METADATA
${'='.repeat(80)}
Workspace: ${metadata.workspace}
Mode: ${metadata.mode}
Max Iterations: ${metadata.maxIterations}
Start Time: ${metadata.startTime.toISOString()}

`;

    await this.append(content);
  }

  /**
   * Log instructions content (called once at start)
   */
  async logInstructions(content: string): Promise<void> {
    if (!this.enabled) return;

    await this.init();

    const entry = `${'='.repeat(80)}
INSTRUCTIONS
${'='.repeat(80)}
${content}

`;

    await this.append(entry);
  }

  /**
   * Log system prompt (called once at start)
   */
  async logSystemPrompt(prompt: string): Promise<void> {
    if (!this.enabled) return;

    await this.init();

    const entry = `${'='.repeat(80)}
SYSTEM PROMPT
${'='.repeat(80)}
${prompt}

`;

    await this.append(entry);
  }

  /**
   * Log status instructions (called once at start)
   */
  async logStatusInstructions(content: string): Promise<void> {
    if (!this.enabled) return;

    await this.init();

    const entry = `${'='.repeat(80)}
STATUS INSTRUCTIONS
${'='.repeat(80)}
${content}

`;

    await this.append(entry);
  }

  /**
   * Log iteration start (without prompt - logged once at run start)
   */
  async logIterationStart(
    iteration: number,
    startTime: Date
  ): Promise<void> {
    if (!this.enabled) return;

    await this.init();

    const entry = `${'='.repeat(80)}
ITERATION ${iteration}
Started: ${startTime.toISOString()}
${'='.repeat(80)}

CLAUDE OUTPUT:
`;

    await this.append(entry);
  }

  /**
   * Append raw output chunk (for streaming)
   */
  async appendOutput(chunk: string): Promise<void> {
    if (!this.enabled) return;

    this.buffer += chunk;

    // Flush buffer if it gets large (> 10KB)
    if (this.buffer.length > 10240) {
      await this.flush();
    }
  }

  /**
   * Log iteration completion
   */
  async logIterationComplete(
    _iteration: number,
    status: 'success' | 'error',
    remaining?: number | null
  ): Promise<void> {
    if (!this.enabled) return;

    // Flush any buffered output first
    await this.flush();

    const timestamp = new Date().toISOString();
    let footer = `\n\nSTATUS: ${status}\n`;
    footer += `Completed: ${timestamp}\n`;

    if (remaining !== undefined && remaining !== null) {
      footer += `Remaining: ${remaining}\n`;
    }

    await this.append(footer);
  }

  /**
   * Log error
   */
  async logError(iteration: number, error: Error): Promise<void> {
    if (!this.enabled) return;

    await this.flush();

    const timestamp = new Date().toISOString();
    let content = `\n\nERROR (Iteration ${iteration}):\n`;
    content += `Time: ${timestamp}\n`;
    content += `Message: ${error.message}\n`;

    if (error.stack) {
      content += `Stack:\n${error.stack}\n`;
    }

    await this.append(content);
  }

  /**
   * Flush buffered output to file
   */
  async flush(): Promise<void> {
    if (!this.enabled || this.buffer.length === 0) return;

    try {
      await this.append(this.buffer);
      this.buffer = '';
    } catch {
      // Silently fail
      this.enabled = false;
    }
  }

  /**
   * Append text to log file
   */
  private async append(text: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await fs.appendFile(this.logPath, text, 'utf8');
    } catch {
      // Silently fail - don't block execution
      this.enabled = false;
    }
  }

  /**
   * Get the log file path
   */
  getLogPath(): string {
    return this.logPath;
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
