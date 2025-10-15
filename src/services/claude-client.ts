import { spawn, SpawnOptions, ChildProcess } from 'child_process';
import { ClaudeExecutionError } from '../utils/errors.js';
import { Logger } from '../utils/logger.js';

/**
 * Claude CLI client wrapper with proper process lifecycle management
 */
export class ClaudeClient {
  private currentChild: ChildProcess | null = null;
  private isShuttingDown = false;

  constructor(
    private command: string = 'claude',
    private args: string[] = [],
    private logger: Logger = new Logger()
  ) {}

  /**
   * Execute Claude interactively with a prompt
   * @param prompt - The prompt to pass to Claude
   * @param systemPrompt - Optional system prompt to append
   * @param cwd - Working directory for Claude execution (defaults to process.cwd())
   *              Normally runs from project root so Claude can access all project files.
   *              Workspace files are accessed via absolute paths in the prompt.
   */
  async executeInteractive(
    prompt: string,
    systemPrompt?: string,
    cwd?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isShuttingDown) {
        reject(new ClaudeExecutionError('Client is shutting down'));
        return;
      }

      const allArgs = [...this.args];

      // Add system prompt if provided
      if (systemPrompt) {
        allArgs.push('--append-system-prompt', systemPrompt);
      }

      allArgs.push(prompt);

      const options: SpawnOptions = {
        cwd: cwd || process.cwd(), // Project root - Claude accesses all files
        stdio: 'inherit', // Interactive mode - pass through all I/O
        shell: false, // Don't use shell - we're passing args directly
      };

      this.logger.debug(`Executing: ${this.command} with ${allArgs.length} args`, true);

      const child = spawn(this.command, allArgs, options);
      this.currentChild = child;

      const cleanup = () => {
        this.currentChild = null;
      };

      child.on('error', (error) => {
        cleanup();
        reject(
          new ClaudeExecutionError(
            `Failed to spawn Claude process: ${error.message}`
          )
        );
      });

      child.on('exit', (code) => {
        cleanup();
        if (code === 0) {
          resolve();
        } else {
          reject(
            new ClaudeExecutionError(
              `Claude exited with code ${code ?? 'unknown'}`,
              code ?? undefined
            )
          );
        }
      });
    });
  }

  /**
   * Execute Claude non-interactively with a prompt (one-shot mode)
   * @param prompt - The prompt to pass to Claude
   * @param systemPrompt - Optional system prompt to append
   * @param cwd - Working directory for Claude execution (defaults to process.cwd())
   *              Normally runs from project root. Workspace files accessed via absolute paths.
   * @param callbacks - Optional callbacks for streaming output
   */
  async executeNonInteractive(
    prompt: string,
    systemPrompt?: string,
    cwd?: string,
    callbacks?: {
      onStdout?: (chunk: string) => void;
      onStderr?: (chunk: string) => void;
    }
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.isShuttingDown) {
        reject(new ClaudeExecutionError('Client is shutting down'));
        return;
      }

      const allArgs = [...this.args, '--print'];

      // Add system prompt if provided
      if (systemPrompt) {
        allArgs.push('--append-system-prompt', systemPrompt);
      }

      allArgs.push(prompt);

      const spawnOptions: SpawnOptions = {
        cwd: cwd || process.cwd(), // Project root - Claude accesses all files
        shell: false, // Don't use shell - we're passing args directly
        stdio: ['ignore', 'pipe', 'pipe'], // Close stdin, pipe stdout/stderr
      };

      this.logger.debug(`Executing: ${this.command} with ${allArgs.length} args`, true);

      const child = spawn(this.command, allArgs, spawnOptions);
      this.currentChild = child;

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        // Call streaming callback if provided
        callbacks?.onStdout?.(chunk);
      });

      child.stderr?.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        // Call streaming callback if provided
        callbacks?.onStderr?.(chunk);
      });

      const cleanup = () => {
        this.currentChild = null;
      };

      child.on('error', (error) => {
        cleanup();
        reject(
          new ClaudeExecutionError(
            `Failed to spawn Claude process: ${error.message}`
          )
        );
      });

      child.on('exit', (code) => {
        cleanup();
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(
            new ClaudeExecutionError(
              `Claude exited with code ${code ?? 'unknown'}\nStderr: ${stderr}`,
              code ?? undefined
            )
          );
        }
      });
    });
  }

  /**
   * Check if Claude CLI is available
   */
  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn(this.command, ['--version'], { shell: false });

      child.on('error', () => resolve(false));
      child.on('exit', (code) => resolve(code === 0));
    });
  }

  /**
   * Get Claude CLI version
   */
  async getVersion(): Promise<string | null> {
    return new Promise((resolve) => {
      const child = spawn(this.command, ['--version'], { shell: false });

      let output = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.on('error', () => resolve(null));
      child.on('exit', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Kill the current child process if running
   * @param signal - Signal to send (default: SIGTERM)
   */
  kill(signal: NodeJS.Signals = 'SIGTERM'): boolean {
    if (this.currentChild && !this.currentChild.killed) {
      this.logger.debug(`Killing child process (PID: ${this.currentChild.pid}) with ${signal}`, true);
      this.currentChild.kill(signal);
      return true;
    }
    return false;
  }

  /**
   * Gracefully shutdown the client
   * Attempts SIGTERM first, then SIGKILL after timeout
   */
  async shutdown(gracePeriodMs: number = 5000): Promise<void> {
    this.isShuttingDown = true;

    if (!this.currentChild || this.currentChild.killed) {
      this.logger.debug('No child process to shutdown', true);
      return;
    }

    this.logger.debug('Initiating graceful shutdown...', true);

    return new Promise((resolve) => {
      const child = this.currentChild;
      if (!child) {
        resolve();
        return;
      }

      const pid = child.pid;
      let resolved = false;

      const onExit = () => {
        if (!resolved) {
          resolved = true;
          this.logger.debug(`Child process (PID: ${pid}) exited`, true);
          this.currentChild = null;
          resolve();
        }
      };

      child.once('exit', onExit);

      // Try graceful termination first
      this.logger.debug(`Sending SIGTERM to child process (PID: ${pid})`, true);
      child.kill('SIGTERM');

      // Force kill after grace period
      setTimeout(() => {
        if (!resolved && child && !child.killed) {
          this.logger.warn(`Grace period expired, sending SIGKILL to child process (PID: ${pid})`);
          child.kill('SIGKILL');

          // Give SIGKILL a moment to work
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              this.currentChild = null;
              resolve();
            }
          }, 1000);
        }
      }, gracePeriodMs);
    });
  }

  /**
   * Check if client is currently shutting down
   */
  isShutdown(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Check if a child process is currently running
   */
  hasRunningChild(): boolean {
    return this.currentChild !== null && !this.currentChild.killed;
  }
}
