import { StatusManager } from './status-manager.js';
import { ExecutionMode } from '../types/mode.js';

/**
 * Completion detection service
 */
export class CompletionDetector {
  /**
   * Check if workspace is complete (uses .status.json)
   */
  static async isComplete(
    workspacePath: string,
    _mode: ExecutionMode  // Keep for API compatibility, not used
  ): Promise<boolean> {
    return StatusManager.isComplete(workspacePath);
  }

  /**
   * Extract remaining count from .status.json
   */
  static async getRemainingCount(
    workspacePath: string,
    _mode: ExecutionMode  // Keep for API compatibility, not used
  ): Promise<number | null> {
    const progress = await StatusManager.getProgress(workspacePath);

    if (progress.total > 0) {
      return progress.total - progress.completed;
    }

    return null;
  }

  /**
   * Get completion status with details
   */
  static async getStatus(
    workspacePath: string,
    mode: ExecutionMode
  ): Promise<{
    isComplete: boolean;
    hasTodo: boolean;
    hasInstructions: boolean;
    remainingCount: number | null;
  }> {
    const [isComplete, remainingCount] = await Promise.all([
      this.isComplete(workspacePath, mode),
      this.getRemainingCount(workspacePath, mode),
    ]);

    return {
      isComplete,
      hasTodo: true,  // Assume TODO.md exists (created at init)
      hasInstructions: true,  // Assume INSTRUCTIONS.md exists (created at setup)
      remainingCount,
    };
  }
}
