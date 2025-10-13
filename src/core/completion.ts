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
        return this.isCompleteIterative(workspacePath);
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
   * Iterative mode completion: check if all checkboxes are marked
   */
  private static async isCompleteIterative(workspacePath: string): Promise<boolean> {
    const todoPath = join(workspacePath, 'TODO.md');

    if (!(await fileExists(todoPath))) {
      return false;
    }

    const content = await readText(todoPath);

    // Count unchecked items: - [ ]
    const uncheckedPattern = /^[\s-]*\[\s\]/gm;
    const uncheckedMatches = content.match(uncheckedPattern);

    // Count checked items: - [x] or - [X]
    const checkedPattern = /^[\s-]*\[[xX]\]/gm;
    const checkedMatches = content.match(checkedPattern);

    // Complete if we have checkboxes and none are unchecked
    const hasCheckboxes = (checkedMatches?.length || 0) > 0;
    const hasUnchecked = (uncheckedMatches?.length || 0) > 0;

    return hasCheckboxes && !hasUnchecked;
  }

  /**
   * Extract remaining count from TODO.md
   * Returns null if not found or not applicable to mode
   */
  static async getRemainingCount(
    workspacePath: string,
    mode: ExecutionMode
  ): Promise<number | null> {
    switch (mode) {
      case ExecutionMode.LOOP:
        return this.getRemainingCountLoop(workspacePath);
      case ExecutionMode.ITERATIVE:
        return this.getRemainingCountIterative(workspacePath);
      default:
        return null;
    }
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
   * Iterative mode remaining: count unchecked items
   */
  private static async getRemainingCountIterative(workspacePath: string): Promise<number | null> {
    const todoPath = join(workspacePath, 'TODO.md');

    if (!(await fileExists(todoPath))) {
      return null;
    }

    const content = await readText(todoPath);

    // Count unchecked items: - [ ]
    const uncheckedPattern = /^[\s-]*\[\s\]/gm;
    const uncheckedMatches = content.match(uncheckedPattern);

    return uncheckedMatches?.length || 0;
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
