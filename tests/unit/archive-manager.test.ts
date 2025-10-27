import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ArchiveManager } from '../../src/core/archive-manager.js';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';
import { ensureDir, writeText, pathExists } from '../../src/utils/fs.js';

describe('ArchiveManager', () => {
  let tmpDir: string;
  let archiveDir: string;
  let workspacesDir: string;
  let manager: ArchiveManager;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'archive-test-'));
    archiveDir = path.join(tmpDir, 'archive');
    workspacesDir = path.join(tmpDir, 'workspaces');

    await ensureDir(archiveDir);
    await ensureDir(workspacesDir);

    manager = new ArchiveManager(archiveDir, workspacesDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('archive()', () => {
    it('should archive a workspace', async () => {
      // Create test workspace
      const wsPath = path.join(workspacesDir, 'test-workspace');
      await ensureDir(wsPath);
      await writeText(path.join(wsPath, 'TODO.md'), '# Test');

      const archiveName = await manager.archive('test-workspace');

      expect(archiveName).toMatch(
        /^test-workspace-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/
      );

      // Check that .tar.gz file exists
      const tarballPath = path.join(archiveDir, `${archiveName}.tar.gz`);
      expect(await pathExists(tarballPath)).toBe(true);
    });

    it('should throw if workspace does not exist', async () => {
      await expect(manager.archive('nonexistent')).rejects.toThrow(
        'Workspace not found'
      );
    });

    it('should create archive metadata', async () => {
      const wsPath = path.join(workspacesDir, 'test-ws');
      await ensureDir(wsPath);
      await writeText(path.join(wsPath, 'TODO.md'), '# Test');

      const archiveName = await manager.archive('test-ws');

      // Get archive details (which extracts and reads metadata)
      const archive = await manager.getArchive(archiveName);

      expect(archive.metadata.originalName).toBe('test-ws');
      expect(archive.metadata.archiveName).toBe(archiveName);
      expect(archive.metadata.archivedAt).toBeDefined();
      expect(archive.metadata.archivedFrom).toBeDefined();
    });
  });

  describe('listArchives()', () => {
    it('should list all archives', async () => {
      // Create test workspace and archive it
      const wsPath = path.join(workspacesDir, 'test-ws');
      await ensureDir(wsPath);
      await manager.archive('test-ws');

      const archives = await manager.listArchives();

      expect(archives.length).toBe(1);
      expect(archives[0]?.metadata.originalName).toBe('test-ws');
    });

    it('should return empty array if no archives', async () => {
      const archives = await manager.listArchives();
      expect(archives).toEqual([]);
    });

    it('should return empty array if archive directory does not exist', async () => {
      const nonExistentManager = new ArchiveManager(
        path.join(tmpDir, 'nonexistent'),
        workspacesDir
      );

      const archives = await nonExistentManager.listArchives();
      expect(archives).toEqual([]);
    });

    it('should sort archives by date (newest first)', async () => {
      // Create multiple archives
      const ws1Path = path.join(workspacesDir, 'ws1');
      const ws2Path = path.join(workspacesDir, 'ws2');
      await ensureDir(ws1Path);
      await ensureDir(ws2Path);

      const archive1 = await manager.archive('ws1');
      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 100));
      const archive2 = await manager.archive('ws2');

      const archives = await manager.listArchives();

      expect(archives.length).toBe(2);
      expect(archives[0]?.name).toBe(archive2); // Newest first
      expect(archives[1]?.name).toBe(archive1);
    });

    it('should skip invalid archives', async () => {
      // Create valid archive
      const wsPath = path.join(workspacesDir, 'test-ws');
      await ensureDir(wsPath);
      await manager.archive('test-ws');

      // Create invalid archive (missing metadata)
      const invalidArchivePath = path.join(archiveDir, 'invalid-archive');
      await ensureDir(invalidArchivePath);

      const archives = await manager.listArchives();

      expect(archives.length).toBe(1); // Only the valid one
      expect(archives[0]?.metadata.originalName).toBe('test-ws');
    });
  });

  describe('restore()', () => {
    it('should restore archive to workspace', async () => {
      // Create and archive workspace
      const wsPath = path.join(workspacesDir, 'original');
      await ensureDir(wsPath);
      await writeText(path.join(wsPath, 'TODO.md'), '# Original');

      const archiveName = await manager.archive('original');
      await fs.rm(wsPath, { recursive: true });

      const restoredName = await manager.restore(archiveName);

      expect(restoredName).toBe('original');
      expect(
        await pathExists(path.join(workspacesDir, 'original', 'TODO.md'))
      ).toBe(true);
      expect(
        await pathExists(path.join(workspacesDir, 'original', '.archived.json'))
      ).toBe(false);
    });

    it('should restore to different name', async () => {
      const wsPath = path.join(workspacesDir, 'original');
      await ensureDir(wsPath);
      const archiveName = await manager.archive('original');

      const restoredName = await manager.restore(archiveName, 'restored');

      expect(restoredName).toBe('restored');
      expect(await pathExists(path.join(workspacesDir, 'restored'))).toBe(true);
    });

    it('should throw if archive does not exist', async () => {
      await expect(manager.restore('nonexistent')).rejects.toThrow(
        'Archive not found'
      );
    });

    it('should throw if workspace already exists', async () => {
      const wsPath = path.join(workspacesDir, 'test');
      await ensureDir(wsPath);
      const archiveName = await manager.archive('test');

      await expect(manager.restore(archiveName)).rejects.toThrow(
        'Workspace already exists'
      );
    });

    it('should preserve workspace content', async () => {
      const wsPath = path.join(workspacesDir, 'test');
      await ensureDir(wsPath);
      await writeText(path.join(wsPath, 'TODO.md'), '# Test Content');
      await writeText(path.join(wsPath, 'INSTRUCTIONS.md'), '# Instructions');

      const archiveName = await manager.archive('test');
      await fs.rm(wsPath, { recursive: true });

      await manager.restore(archiveName);

      const todoContent = await fs.readFile(
        path.join(wsPath, 'TODO.md'),
        'utf-8'
      );
      const instructionsContent = await fs.readFile(
        path.join(wsPath, 'INSTRUCTIONS.md'),
        'utf-8'
      );

      expect(todoContent).toBe('# Test Content');
      expect(instructionsContent).toBe('# Instructions');
    });
  });

  describe('getArchive()', () => {
    it('should get archive details', async () => {
      const wsPath = path.join(workspacesDir, 'test');
      await ensureDir(wsPath);
      const archiveName = await manager.archive('test');

      const archive = await manager.getArchive(archiveName);

      expect(archive.name).toBe(archiveName);
      expect(archive.metadata.originalName).toBe('test');
      expect(archive.metadata.archiveName).toBe(archiveName);
      expect(archive.path).toBe(path.join(archiveDir, `${archiveName}.tar.gz`));
    });

    it('should throw if archive does not exist', async () => {
      await expect(manager.getArchive('nonexistent')).rejects.toThrow(
        'Archive not found'
      );
    });
  });

  describe('delete()', () => {
    it('should delete archive', async () => {
      const wsPath = path.join(workspacesDir, 'test');
      await ensureDir(wsPath);
      const archiveName = await manager.archive('test');

      await manager.delete(archiveName);

      expect(await pathExists(path.join(archiveDir, archiveName))).toBe(false);
    });

    it('should throw if archive does not exist', async () => {
      await expect(manager.delete('nonexistent')).rejects.toThrow(
        'Archive not found'
      );
    });
  });

  describe('exists()', () => {
    it('should return true if archive exists', async () => {
      const wsPath = path.join(workspacesDir, 'test');
      await ensureDir(wsPath);
      const archiveName = await manager.archive('test');

      const exists = await manager.exists(archiveName);

      expect(exists).toBe(true);
    });

    it('should return false if archive does not exist', async () => {
      const exists = await manager.exists('nonexistent');

      expect(exists).toBe(false);
    });
  });
});
