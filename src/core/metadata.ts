import { join } from 'path';
import { Metadata, MetadataSchema } from '../types/metadata.js';
import { ExecutionMode } from '../types/mode.js';
import { readJson, writeJson, fileExists } from '../utils/fs.js';
import { InvalidMetadataError } from '../utils/errors.js';

/**
 * Metadata manager for workspace state
 */
export class MetadataManager {
  private metadataPath: string;

  constructor(workspacePath: string) {
    this.metadataPath = join(workspacePath, '.metadata.json');
  }

  /**
   * Initialize new metadata for a workspace
   */
  static create(name: string): Metadata {
    return {
      name,
      created: new Date().toISOString(),
      status: 'in_progress',
      mode: ExecutionMode.LOOP,
      totalIterations: 0,
      setupIterations: 0,
      executionIterations: 0,
      instructionsFile: 'INSTRUCTIONS.md',
      completionMarkers: [
        'Remaining: 0',
        '**Remaining**: 0',
        'TASK COMPLETE',
        '✅ TASK COMPLETE',
      ],
      maxIterations: 50,
      delay: 2,
    };
  }

  /**
   * Check if metadata file exists
   */
  async exists(): Promise<boolean> {
    return await fileExists(this.metadataPath);
  }

  /**
   * Read metadata from file
   */
  async read(): Promise<Metadata> {
    const data = await readJson<unknown>(this.metadataPath);

    try {
      return MetadataSchema.parse(data);
    } catch (error) {
      throw new InvalidMetadataError(
        `Metadata validation failed: ${(error as Error).message}`
      );
    }
  }

  /**
   * Write metadata to file
   */
  async write(metadata: Metadata): Promise<void> {
    try {
      MetadataSchema.parse(metadata);
    } catch (error) {
      throw new InvalidMetadataError(
        `Metadata validation failed: ${(error as Error).message}`
      );
    }

    await writeJson(this.metadataPath, metadata);
  }

  /**
   * Update specific metadata fields
   */
  async update(updates: Partial<Metadata>): Promise<Metadata> {
    const current = await this.read();
    const updated = { ...current, ...updates };
    await this.write(updated);
    return updated;
  }

  /**
   * Increment iteration count
   */
  async incrementIterations(type: 'setup' | 'execution'): Promise<Metadata> {
    const metadata = await this.read();

    const updates: Partial<Metadata> = {
      totalIterations: metadata.totalIterations + 1,
      lastRun: new Date().toISOString(),
    };

    if (type === 'setup') {
      updates.setupIterations = metadata.setupIterations + 1;
    } else {
      updates.executionIterations = metadata.executionIterations + 1;
    }

    return await this.update(updates);
  }

  /**
   * Mark workspace as completed
   */
  async markCompleted(): Promise<Metadata> {
    return await this.update({
      status: 'completed',
      lastRun: new Date().toISOString(),
    });
  }

  /**
   * Mark workspace as error
   */
  async markError(): Promise<Metadata> {
    return await this.update({
      status: 'error',
      lastRun: new Date().toISOString(),
    });
  }

  /**
   * Reset iteration counts
   */
  async resetIterations(): Promise<Metadata> {
    return await this.update({
      totalIterations: 0,
      setupIterations: 0,
      executionIterations: 0,
      status: 'in_progress',
    });
  }

  /**
   * Get metadata path
   */
  getPath(): string {
    return this.metadataPath;
  }
}
