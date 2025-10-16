import { join } from 'path';
import { readText, fileExists } from '../utils/fs.js';
import { ExecutionMode } from '../types/mode.js';

/**
 * Completion detection service
 */
export class CompletionDetector {
  /**
   * Check if workspace is complete (mode-aware)
   */
  static async isComplete(
    workspacePath: string,
    mode: ExecutionMode,
    markers?: string[]
  ): Promise<boolean> {
    switch (mode) {
      case ExecutionMode.LOOP:
        return this.isCompleteLoop(workspacePath, markers || []);
      case ExecutionMode.ITERATIVE:
        return this.isCompleteIterative(workspacePath, markers || []);
      default:
        throw new Error(`Unknown execution mode: ${mode}`);
    }
  }

  /**
   * Loop mode completion: check for markers
   */
  private static async isCompleteLoop(
    workspacePath: string,
    markers: string[]
  ): Promise<boolean> {
    const todoPath = join(workspacePath, 'TODO.md');

    if (!(await fileExists(todoPath))) {
      return false;
    }

    const content = await readText(todoPath);

    // Check if any completion marker is found
    for (const marker of markers) {
      if (content.includes(marker)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Iterative mode completion: check for markers (same as loop mode)
   */
  private static async isCompleteIterative(
    workspacePath: string,
    markers: string[]
  ): Promise<boolean> {
    const todoPath = join(workspacePath, 'TODO.md');

    if (!(await fileExists(todoPath))) {
      return false;
    }

    const content = await readText(todoPath);

    // Check if any completion marker is found
    for (const marker of markers) {
      if (content.includes(marker)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract remaining count from TODO.md
   * Returns null if not found or not applicable to mode
   */
  static async getRemainingCount(
    workspacePath: string,
    _mode: ExecutionMode
  ): Promise<number | null> {
    // Both modes parse "Remaining: N" format
    return this.getRemainingCountLoop(workspacePath);
  }

  /**
   * Loop mode remaining: parse "Remaining: N"
   */
  private static async getRemainingCountLoop(workspacePath: string): Promise<number | null> {
    const todoPath = join(workspacePath, 'TODO.md');

    if (!(await fileExists(todoPath))) {
      return null;
    }

    const content = await readText(todoPath);

    const patterns = [
      /[*_]*Remaining[*_]*:\s*(\d+)/i,
      /[*_]*Items Remaining[*_]*:\s*(\d+)/i,
      /[*_]*Tasks Remaining[*_]*:\s*(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match?.[1]) {
        const count = parseInt(match[1], 10);
        if (!isNaN(count)) {
          return count;
        }
      }
    }

    return null;
  }


  /**
   * Check if workspace has TODO.md
   */
  static async hasTodo(workspacePath: string): Promise<boolean> {
    const todoPath = join(workspacePath, 'TODO.md');
    return await fileExists(todoPath);
  }

  /**
   * Check if workspace has INSTRUCTIONS.md
   */
  static async hasInstructions(workspacePath: string): Promise<boolean> {
    const instructionsPath = join(workspacePath, 'INSTRUCTIONS.md');
    return await fileExists(instructionsPath);
  }

  /**
   * Get completion status with details (mode-aware)
   */
  static async getStatus(
    workspacePath: string,
    mode: ExecutionMode,
    markers: string[]
  ): Promise<{
    isComplete: boolean;
    hasTodo: boolean;
    hasInstructions: boolean;
    remainingCount: number | null;
  }> {
    const [isComplete, hasTodo, hasInstructions, remainingCount] =
      await Promise.all([
        this.isComplete(workspacePath, mode, markers),
        this.hasTodo(workspacePath),
        this.hasInstructions(workspacePath),
        this.getRemainingCount(workspacePath, mode),
      ]);

    return {
      isComplete,
      hasTodo,
      hasInstructions,
      remainingCount,
    };
  }
}
