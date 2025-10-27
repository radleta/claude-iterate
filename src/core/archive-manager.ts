import path from 'path';
import * as tar from 'tar';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { ArchiveMetadata, ArchiveMetadataSchema } from '../types/archive.js';
import {
  ensureDir,
  pathExists,
  readJson,
  writeJson,
  copy,
  remove,
  readdir,
} from '../utils/fs.js';

/**
 * Manages workspace archives with tarball support
 *
 * Supports both new tarball format (.tar.gz) and legacy directory format
 * for backwards compatibility.
 */
export class ArchiveManager {
  constructor(
    private archiveDir: string,
    private workspacesDir: string
  ) {}

  /**
   * Archive a workspace as a .tar.gz file
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
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    const archiveName = `${workspaceName}-${timestamp}`;
    const tarballPath = path.join(this.archiveDir, `${archiveName}.tar.gz`);

    // Create temporary directory for metadata
    const tempDir = path.join(
      tmpdir(),
      `claude-iterate-archive-${randomBytes(8).toString('hex')}`
    );
    await ensureDir(tempDir);
    const tempWorkspacePath = path.join(tempDir, workspaceName);

    try {
      // Copy workspace to temp location
      await copy(workspacePath, tempWorkspacePath);

      // Create archive metadata
      const metadata: ArchiveMetadata = {
        originalName: workspaceName,
        archiveName: archiveName,
        archivedAt: new Date().toISOString(),
        archivedFrom: workspacePath,
      };

      // Write metadata to temp workspace
      const metadataPath = path.join(tempWorkspacePath, '.archived.json');
      await writeJson(metadataPath, metadata);

      // Create tarball
      await tar.create(
        {
          gzip: true,
          file: tarballPath,
          cwd: tempDir,
        },
        [workspaceName]
      );
    } finally {
      // Cleanup temp directory
      await remove(tempDir);
    }

    return archiveName;
  }

  /**
   * List all archives (.tar.gz files and legacy directories)
   */
  async listArchives(): Promise<
    Array<{ name: string; metadata: ArchiveMetadata }>
  > {
    if (!(await pathExists(this.archiveDir))) {
      return [];
    }

    const entries = (await readdir(this.archiveDir, {
      withFileTypes: true,
    })) as import('fs').Dirent[];
    const archives: Array<{ name: string; metadata: ArchiveMetadata }> = [];

    for (const entry of entries) {
      // Support both .tar.gz files (new format) and directories (legacy format)
      if (entry.name.endsWith('.tar.gz') && entry.isFile()) {
        const archivePath = path.join(this.archiveDir, entry.name);
        try {
          // Extract metadata from tarball
          const metadata = await this.extractMetadataFromTarball(archivePath);
          archives.push({
            name: entry.name.replace('.tar.gz', ''),
            metadata,
          });
        } catch {
          // Skip invalid archives
          continue;
        }
      } else if (entry.isDirectory()) {
        // Legacy directory format - still support for backwards compatibility
        const metadataPath = path.join(
          this.archiveDir,
          entry.name,
          '.archived.json'
        );
        if (await pathExists(metadataPath)) {
          try {
            const metadata = await readJson(metadataPath);
            const validated = ArchiveMetadataSchema.parse(metadata);
            archives.push({ name: entry.name, metadata: validated });
          } catch {
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
   * Extract metadata from tarball without fully extracting
   */
  private async extractMetadataFromTarball(
    tarballPath: string
  ): Promise<ArchiveMetadata> {
    // Create temp directory for metadata extraction
    const tempDir = path.join(
      tmpdir(),
      `claude-iterate-meta-${randomBytes(8).toString('hex')}`
    );
    await ensureDir(tempDir);

    try {
      // Extract only .archived.json file
      await tar.extract({
        file: tarballPath,
        cwd: tempDir,
        filter: (path) => path.endsWith('.archived.json'),
      });

      // Find and read metadata file (need to handle nested directory structure)
      const findMetadataFile = async (dir: string): Promise<string | null> => {
        const entries = (await readdir(dir, {
          withFileTypes: true,
        })) as import('fs').Dirent[];

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.name === '.archived.json' && entry.isFile()) {
            return fullPath;
          } else if (entry.isDirectory()) {
            const found = await findMetadataFile(fullPath);
            if (found) return found;
          }
        }
        return null;
      };

      const metadataPath = await findMetadataFile(tempDir);

      if (!metadataPath) {
        throw new Error('No metadata file found in archive');
      }

      const metadata = await readJson(metadataPath);
      return ArchiveMetadataSchema.parse(metadata);
    } finally {
      await remove(tempDir);
    }
  }

  /**
   * Restore archive to workspace
   */
  async restore(
    archiveName: string,
    newWorkspaceName?: string
  ): Promise<string> {
    // Support both .tar.gz and directory formats
    const tarballPath = path.join(this.archiveDir, `${archiveName}.tar.gz`);
    const dirPath = path.join(this.archiveDir, archiveName);

    let metadata: ArchiveMetadata;
    let isLegacyDir = false;

    // Check for .tar.gz first (new format)
    if (await pathExists(tarballPath)) {
      metadata = await this.extractMetadataFromTarball(tarballPath);
    } else if (await pathExists(dirPath)) {
      // Legacy directory format
      isLegacyDir = true;
      const metadataPath = path.join(dirPath, '.archived.json');
      metadata = ArchiveMetadataSchema.parse(await readJson(metadataPath));
    } else {
      throw new Error(`Archive not found: ${archiveName}`);
    }

    // Determine workspace name
    const workspaceName = newWorkspaceName || metadata.originalName;
    const workspacePath = path.join(this.workspacesDir, workspaceName);

    // Check if workspace already exists
    if (await pathExists(workspacePath)) {
      throw new Error(`Workspace already exists: ${workspaceName}`);
    }

    // Ensure workspaces directory exists
    await ensureDir(this.workspacesDir);

    if (isLegacyDir) {
      // Legacy: Copy directory
      await copy(dirPath, workspacePath);
      // Remove metadata file (not needed in restored workspace)
      await remove(path.join(workspacePath, '.archived.json'));
    } else {
      // New: Extract tarball
      const tempDir = path.join(
        tmpdir(),
        `claude-iterate-restore-${randomBytes(8).toString('hex')}`
      );
      await ensureDir(tempDir);

      try {
        // Extract tarball to temp location
        await tar.extract({
          file: tarballPath,
          cwd: tempDir,
        });

        // Find extracted workspace directory
        const entries = (await readdir(tempDir, {
          withFileTypes: true,
        })) as import('fs').Dirent[];
        const workspaceDir = entries.find((e) => e.isDirectory());

        if (!workspaceDir) {
          throw new Error('No workspace directory found in archive');
        }

        const extractedPath = path.join(tempDir, workspaceDir.name);

        // Copy to workspaces directory
        await copy(extractedPath, workspacePath);

        // Remove metadata file
        const metadataFile = path.join(workspacePath, '.archived.json');
        if (await pathExists(metadataFile)) {
          await remove(metadataFile);
        }
      } finally {
        await remove(tempDir);
      }
    }

    return workspaceName;
  }

  /**
   * Get archive details
   */
  async getArchive(
    archiveName: string
  ): Promise<{ name: string; metadata: ArchiveMetadata; path: string }> {
    // Try .tar.gz first
    const tarballPath = path.join(this.archiveDir, `${archiveName}.tar.gz`);
    if (await pathExists(tarballPath)) {
      const metadata = await this.extractMetadataFromTarball(tarballPath);
      return {
        name: archiveName,
        metadata,
        path: tarballPath,
      };
    }

    // Try legacy directory format
    const dirPath = path.join(this.archiveDir, archiveName);
    const metadataPath = path.join(dirPath, '.archived.json');

    if (!(await pathExists(metadataPath))) {
      throw new Error(`Archive not found: ${archiveName}`);
    }

    const metadata = ArchiveMetadataSchema.parse(await readJson(metadataPath));
    return {
      name: archiveName,
      metadata,
      path: dirPath,
    };
  }

  /**
   * Delete an archive
   */
  async delete(archiveName: string): Promise<void> {
    // Try .tar.gz first
    const tarballPath = path.join(this.archiveDir, `${archiveName}.tar.gz`);
    if (await pathExists(tarballPath)) {
      await remove(tarballPath);
      return;
    }

    // Try legacy directory format
    const dirPath = path.join(this.archiveDir, archiveName);
    if (await pathExists(dirPath)) {
      await remove(dirPath);
      return;
    }

    throw new Error(`Archive not found: ${archiveName}`);
  }

  /**
   * Check if archive exists
   */
  async exists(archiveName: string): Promise<boolean> {
    const tarballPath = path.join(this.archiveDir, `${archiveName}.tar.gz`);
    const dirPath = path.join(this.archiveDir, archiveName);

    return (await pathExists(tarballPath)) || (await pathExists(dirPath));
  }
}
