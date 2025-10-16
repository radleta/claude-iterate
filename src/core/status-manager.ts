import { join } from 'path';
import { readJson, writeJson, fileExists } from '../utils/fs.js';
import { WorkspaceStatus, WorkspaceStatusSchema, DEFAULT_STATUS } from '../types/status.js';

/**
 * Manages workspace status file (.status.json)
 */
export class StatusManager {
  private static readonly STATUS_FILE = '.status.json';

  /**
   * Read workspace status
   * Returns default status if file doesn't exist or is invalid
   */
  static async read(workspacePath: string): Promise<WorkspaceStatus> {
    const statusPath = join(workspacePath, this.STATUS_FILE);

    if (!(await fileExists(statusPath))) {
      return DEFAULT_STATUS;
    }

    try {
      const data = await readJson(statusPath);
      const parsed = WorkspaceStatusSchema.safeParse(data);

      if (parsed.success) {
        return parsed.data;
      } else {
        // Log validation errors for debugging
        console.warn('Invalid .status.json format:', parsed.error.issues);
        return DEFAULT_STATUS;
      }
    } catch (error) {
      // File exists but can't be read/parsed
      console.warn('Failed to read .status.json:', error);
      return DEFAULT_STATUS;
    }
  }

  /**
   * Check if workspace is complete based on status file
   */
  static async isComplete(workspacePath: string): Promise<boolean> {
    const status = await this.read(workspacePath);
    return status.complete === true;
  }

  /**
   * Get progress information (loop mode only)
   * Returns 0/0 for iterative mode (no explicit progress tracking)
   */
  static async getProgress(workspacePath: string): Promise<{
    completed: number;
    total: number;
    percentage: number;
  }> {
    const status = await this.read(workspacePath);

    // Iterative mode doesn't track explicit progress
    if (!status.progress) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    const percentage = status.progress.total > 0
      ? Math.round((status.progress.completed / status.progress.total) * 100)
      : 0;

    return {
      completed: status.progress.completed,
      total: status.progress.total,
      percentage,
    };
  }

  /**
   * Validate status (for debugging/testing)
   */
  static async validate(workspacePath: string): Promise<{
    valid: boolean;
    errors?: string[];
    warnings?: string[];
  }> {
    const status = await this.read(workspacePath);
    const warnings: string[] = [];

    // Loop mode validations (only if progress exists)
    if (status.progress) {
      if (status.progress.completed > status.progress.total) {
        warnings.push(`Completed (${status.progress.completed}) exceeds total (${status.progress.total})`);
      }

      if (status.complete && status.progress.completed !== status.progress.total) {
        warnings.push(`Marked complete but progress is ${status.progress.completed}/${status.progress.total}`);
      }
    }

    // Iterative mode validations (only if worked field exists)
    if (status.worked !== undefined) {
      if (status.complete && status.worked) {
        // This is fine - completed work and marked complete
      }
      if (status.complete && !status.worked) {
        // This is fine - nothing to do, task complete
      }
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Initialize status file (for testing/setup)
   */
  static async initialize(
    workspacePath: string,
    total: number,
  ): Promise<void> {
    const statusPath = join(workspacePath, this.STATUS_FILE);
    const initialStatus: WorkspaceStatus = {
      complete: false,
      progress: {
        completed: 0,
        total,
      },
      summary: `Initialized with ${total} items`,
      lastUpdated: new Date().toISOString(),
    };

    await writeJson(statusPath, initialStatus, true);
  }
}
