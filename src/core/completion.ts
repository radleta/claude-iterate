import { join } from 'path';
import { readText, fileExists } from '../utils/fs.js';

/**
 * Completion detection service
 */
export class CompletionDetector {
  /**
   * Check if TODO.md contains completion markers
   */
  static async isComplete(
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
   * Returns null if not found or not a valid number
   */
  static async getRemainingCount(workspacePath: string): Promise<number | null> {
    const todoPath = join(workspacePath, 'TODO.md');

    if (!(await fileExists(todoPath))) {
      return null;
    }

    const content = await readText(todoPath);

    // Match patterns like:
    // - Remaining: 0
    // - **Remaining**: 0
    // - Remaining: 5
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
   * Get completion status with details
   */
  static async getStatus(
    workspacePath: string,
    markers: string[]
  ): Promise<{
    isComplete: boolean;
    hasTodo: boolean;
    hasInstructions: boolean;
    remainingCount: number | null;
  }> {
    const [isComplete, hasTodo, hasInstructions, remainingCount] =
      await Promise.all([
        this.isComplete(workspacePath, markers),
        this.hasTodo(workspacePath),
        this.hasInstructions(workspacePath),
        this.getRemainingCount(workspacePath),
      ]);

    return {
      isComplete,
      hasTodo,
      hasInstructions,
      remainingCount,
    };
  }
}
