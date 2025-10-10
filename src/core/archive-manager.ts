import path from 'path';
import { ArchiveMetadata, ArchiveMetadataSchema } from '../types/archive.js';
import { ensureDir, pathExists, readJson, writeJson, copy, remove, readdir } from '../utils/fs.js';

/**
 * Manages workspace archives
 */
export class ArchiveManager {
  constructor(
    private archiveDir: string,
    private workspacesDir: string
  ) {}

  /**
   * Archive a workspace
   */
  async archive(workspaceName: string): Promise<string> {
    const workspacePath = path.join(this.workspacesDir, workspaceName);

    // Validate workspace exists
    if (!(await pathExists(workspacePath))) {
      throw new Error(`Workspace not found: ${workspaceName}`);
    }

    // Create archive directory
    await ensureDir(this.archiveDir);

    // Generate archive name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const archiveName = `${workspaceName}-${timestamp}`;
    const archivePath = path.join(this.archiveDir, archiveName);

    // Copy workspace to archive
    await copy(workspacePath, archivePath);

    // Create archive metadata
    const metadata: ArchiveMetadata = {
      originalName: workspaceName,
      archiveName: archiveName,
      archivedAt: new Date().toISOString(),
      archivedFrom: workspacePath,
    };

    const metadataPath = path.join(archivePath, '.archived.json');
    await writeJson(metadataPath, metadata);

    return archiveName;
  }

  /**
   * List all archives
   */
  async listArchives(): Promise<Array<{ name: string; metadata: ArchiveMetadata }>> {
    if (!(await pathExists(this.archiveDir))) {
      return [];
    }

    const entries = await readdir(this.archiveDir, { withFileTypes: true }) as import('fs').Dirent[];
    const archives: Array<{ name: string; metadata: ArchiveMetadata }> = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const metadataPath = path.join(this.archiveDir, entry.name, '.archived.json');
        if (await pathExists(metadataPath)) {
          try {
            const metadata = await readJson(metadataPath);
            const validated = ArchiveMetadataSchema.parse(metadata);
            archives.push({ name: entry.name, metadata: validated });
          } catch {
            // Skip invalid archives
            continue;
          }
        }
      }
    }

    // Sort by archived date (newest first)
    return archives.sort((a, b) =>
      b.metadata.archivedAt.localeCompare(a.metadata.archivedAt)
    );
  }

  /**
   * Restore archive to workspace
   */
  async restore(archiveName: string, newWorkspaceName?: string): Promise<string> {
    const archivePath = path.join(this.archiveDir, archiveName);

    // Validate archive exists
    if (!(await pathExists(archivePath))) {
      throw new Error(`Archive not found: ${archiveName}`);
    }

    // Read archive metadata
    const metadataPath = path.join(archivePath, '.archived.json');
    const metadata = ArchiveMetadataSchema.parse(await readJson(metadataPath));

    // Determine workspace name
    const workspaceName = newWorkspaceName || metadata.originalName;
    const workspacePath = path.join(this.workspacesDir, workspaceName);

    // Check if workspace already exists
    if (await pathExists(workspacePath)) {
      throw new Error(`Workspace already exists: ${workspaceName}`);
    }

    // Copy archive to workspace
    await copy(archivePath, workspacePath);

    // Remove .archived.json from restored workspace
    const restoredMetadataPath = path.join(workspacePath, '.archived.json');
    if (await pathExists(restoredMetadataPath)) {
      await remove(restoredMetadataPath);
    }

    return workspaceName;
  }

  /**
   * Get archive details
   */
  async getArchive(archiveName: string): Promise<{ name: string; metadata: ArchiveMetadata; path: string }> {
    const archivePath = path.join(this.archiveDir, archiveName);

    if (!(await pathExists(archivePath))) {
      throw new Error(`Archive not found: ${archiveName}`);
    }

    const metadataPath = path.join(archivePath, '.archived.json');
    const metadata = ArchiveMetadataSchema.parse(await readJson(metadataPath));

    return {
      name: archiveName,
      metadata,
      path: archivePath,
    };
  }

  /**
   * Delete archive
   */
  async delete(archiveName: string): Promise<void> {
    const archivePath = path.join(this.archiveDir, archiveName);

    if (!(await pathExists(archivePath))) {
      throw new Error(`Archive not found: ${archiveName}`);
    }

    await remove(archivePath);
  }

  /**
   * Check if archive exists
   */
  async exists(archiveName: string): Promise<boolean> {
    const archivePath = path.join(this.archiveDir, archiveName);
    return await pathExists(archivePath);
  }
}
