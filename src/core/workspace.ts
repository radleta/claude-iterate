import { join } from 'path';
import { Metadata } from '../types/metadata.js';
import { MetadataManager } from './metadata.js';
import { CompletionDetector } from './completion.js';
import {
  ensureDir,
  dirExists,
  writeText,
  readText,
  fileExists,
} from '../utils/fs.js';
import {
  WorkspaceNotFoundError,
  WorkspaceExistsError,
} from '../utils/errors.js';

/**
 * Workspace represents a task iteration environment
 */
export class Workspace {
  private metadataManager: MetadataManager;

  constructor(
    public readonly name: string,
    public readonly path: string
  ) {
    this.metadataManager = new MetadataManager(path);
  }

  /**
   * Initialize a new workspace
   */
  static async init(
    name: string,
    workspacePath: string,
    options?: {
      maxIterations?: number;
      delay?: number;
      mode?: import('../types/mode.js').ExecutionMode;
      completionMarkers?: string[];
      notifyUrl?: string;
      notifyEvents?: Array<'setup_complete' | 'execution_start' | 'iteration' | 'iteration_milestone' | 'completion' | 'error' | 'all'>;
    }
  ): Promise<Workspace> {
    // Check if workspace already exists
    if (await dirExists(workspacePath)) {
      throw new WorkspaceExistsError(name);
    }

    // Create workspace directory
    await ensureDir(workspacePath);

    // Create metadata
    const metadata = MetadataManager.create(name);
    if (options?.maxIterations) {
      metadata.maxIterations = options.maxIterations;
    }
    if (options?.delay) {
      metadata.delay = options.delay;
    }
    if (options?.mode) {
      metadata.mode = options.mode;
    }
    if (options?.completionMarkers) {
      metadata.completionMarkers = options.completionMarkers;
    }
    if (options?.notifyUrl) {
      metadata.notifyUrl = options.notifyUrl;
    }
    if (options?.notifyEvents) {
      metadata.notifyEvents = options.notifyEvents;
    }

    // Write metadata
    const metadataManager = new MetadataManager(workspacePath);
    await metadataManager.write(metadata);

    // Create working directory
    await ensureDir(join(workspacePath, 'working'));

    // Create placeholder TODO.md
    const todoPath = join(workspacePath, 'TODO.md');
    await writeText(
      todoPath,
      `# TODO - ${name}\n\n*Instructions not yet created. Run setup command first.*\n`
    );

    // Create logs
    await writeText(join(workspacePath, 'setup.log'), '');
    await writeText(join(workspacePath, 'iterate.log'), '');

    return new Workspace(name, workspacePath);
  }

  /**
   * Load existing workspace
   */
  static async load(name: string, workspacePath: string): Promise<Workspace> {
    if (!(await dirExists(workspacePath))) {
      throw new WorkspaceNotFoundError(name);
    }

    const workspace = new Workspace(name, workspacePath);

    // Verify metadata exists
    if (!(await workspace.metadataManager.exists())) {
      throw new WorkspaceNotFoundError(
        `${name} (missing metadata file)`
      );
    }

    return workspace;
  }

  /**
   * Get workspace metadata
   */
  async getMetadata(): Promise<Metadata> {
    return await this.metadataManager.read();
  }

  /**
   * Update workspace metadata
   */
  async updateMetadata(updates: Partial<Metadata>): Promise<Metadata> {
    return await this.metadataManager.update(updates);
  }

  /**
   * Check if workspace is complete (mode-aware)
   */
  async isComplete(): Promise<boolean> {
    const metadata = await this.getMetadata();
    return await CompletionDetector.isComplete(
      this.path,
      metadata.mode,
      metadata.completionMarkers
    );
  }

  /**
   * Get completion status with details (mode-aware)
   */
  async getCompletionStatus() {
    const metadata = await this.getMetadata();
    return await CompletionDetector.getStatus(
      this.path,
      metadata.mode,
      metadata.completionMarkers
    );
  }

  /**
   * Get remaining count from TODO.md (mode-aware)
   */
  async getRemainingCount(): Promise<number | null> {
    const metadata = await this.getMetadata();
    return await CompletionDetector.getRemainingCount(this.path, metadata.mode);
  }

  /**
   * Check if instructions exist
   */
  async hasInstructions(): Promise<boolean> {
    const instructionsPath = join(this.path, 'INSTRUCTIONS.md');
    return await fileExists(instructionsPath);
  }

  /**
   * Get instructions content
   */
  async getInstructions(): Promise<string> {
    const instructionsPath = join(this.path, 'INSTRUCTIONS.md');
    return await readText(instructionsPath);
  }

  /**
   * Write instructions
   */
  async writeInstructions(content: string): Promise<void> {
    const instructionsPath = join(this.path, 'INSTRUCTIONS.md');
    await writeText(instructionsPath, content);
  }

  /**
   * Get TODO.md path
   */
  getTodoPath(): string {
    return join(this.path, 'TODO.md');
  }

  /**
   * Get INSTRUCTIONS.md path
   */
  getInstructionsPath(): string {
    return join(this.path, 'INSTRUCTIONS.md');
  }

  /**
   * Get working directory path
   */
  getWorkingDir(): string {
    return join(this.path, 'working');
  }

  /**
   * Increment iteration count
   */
  async incrementIterations(
    type: 'setup' | 'execution'
  ): Promise<Metadata> {
    return await this.metadataManager.incrementIterations(type);
  }

  /**
   * Mark as completed
   */
  async markCompleted(): Promise<void> {
    await this.metadataManager.markCompleted();
  }

  /**
   * Mark as error
   */
  async markError(): Promise<void> {
    await this.metadataManager.markError();
  }

  /**
   * Reset iteration counts
   */
  async resetIterations(): Promise<void> {
    await this.metadataManager.resetIterations();
  }

  /**
   * Get workspace info for display
   */
  async getInfo() {
    const metadata = await this.getMetadata();
    const status = await this.getCompletionStatus();

    return {
      name: this.name,
      path: this.path,
      status: metadata.status,
      totalIterations: metadata.totalIterations,
      hasInstructions: status.hasInstructions,
      hasTodo: status.hasTodo,
      isComplete: status.isComplete,
      remainingCount: status.remainingCount,
      created: metadata.created,
      lastRun: metadata.lastRun,
    };
  }
}
