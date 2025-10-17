import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { StatusManager } from '../../src/core/status-manager.js';
import { WorkspaceStatus } from '../../src/types/status.js';
import { createTestWorkspace, writeTestFile } from '../setup.js';

describe('StatusManager', () => {
  describe('read', () => {
    it('should return default status if file does not exist', async () => {
      const workspacePath = await createTestWorkspace('test-workspace');

      const status = await StatusManager.read(workspacePath);

      expect(status.complete).toBe(false);
      expect(status.progress).toBeDefined();
      expect(status.progress?.completed).toBe(0);
      expect(status.progress?.total).toBe(0);
    });

    it('should read valid status file', async () => {
      const workspacePath = await createTestWorkspace('test-workspace');
      const statusPath = join(workspacePath, '.status.json');

      const validStatus: WorkspaceStatus = {
        complete: false,
        progress: {
          completed: 35,
          total: 60,
        },
        summary: 'Migrated 35/60 API endpoints',
        lastUpdated: '2025-10-16T14:30:00Z',
      };

      await writeTestFile(statusPath, JSON.stringify(validStatus, null, 2));

      const status = await StatusManager.read(workspacePath);

      expect(status.complete).toBe(false);
      expect(status.progress).toBeDefined();
      expect(status.progress?.completed).toBe(35);
      expect(status.progress?.total).toBe(60);
      expect(status.summary).toBe('Migrated 35/60 API endpoints');
    });

    it('should return default status if file is corrupted', async () => {
      const workspacePath = await createTestWorkspace('test-workspace');
      const statusPath = join(workspacePath, '.status.json');

      await writeTestFile(statusPath, 'invalid json {{{');

      const status = await StatusManager.read(workspacePath);

      expect(status.complete).toBe(false);
      expect(status.progress).toBeDefined();
      expect(status.progress?.completed).toBe(0);
      expect(status.progress?.total).toBe(0);
    });

    it('should return default status if schema validation fails', async () => {
      const workspacePath = await createTestWorkspace('test-workspace');
      const statusPath = join(workspacePath, '.status.json');

      const invalidStatus = {
        complete: 'not a boolean',
        progress: {
          completed: -5, // negative not allowed
          total: 'not a number',
        },
      };

      await writeTestFile(statusPath, JSON.stringify(invalidStatus));

      const status = await StatusManager.read(workspacePath);

      expect(status.complete).toBe(false);
      expect(status.progress).toBeDefined();
      expect(status.progress?.completed).toBe(0);
      expect(status.progress?.total).toBe(0);
    });

    it('should handle optional fields', async () => {
      const workspacePath = await createTestWorkspace('test-workspace');
      const statusPath = join(workspacePath, '.status.json');

      const statusWithOptionals: WorkspaceStatus = {
        complete: false,
        progress: {
          completed: 8,
          total: 12,
        },
        summary: 'Making progress',
        phase: 'development',
        blockers: ['Missing API key'],
        notes: 'Some additional context',
      };

      await writeTestFile(statusPath, JSON.stringify(statusWithOptionals, null, 2));

      const status = await StatusManager.read(workspacePath);

      expect(status.phase).toBe('development');
      expect(status.blockers).toEqual(['Missing API key']);
      expect(status.notes).toBe('Some additional context');
    });
  });

  describe('isComplete', () => {
    it('should return false for missing file', async () => {
      const workspacePath = await createTestWorkspace('test-workspace');

      const isComplete = await StatusManager.isComplete(workspacePath);

      expect(isComplete).toBe(false);
    });

    it('should return true when complete is true', async () => {
      const workspacePath = await createTestWorkspace('test-workspace');
      const statusPath = join(workspacePath, '.status.json');

      const status: WorkspaceStatus = {
        complete: true,
        progress: {
          completed: 60,
          total: 60,
        },
      };

      await writeTestFile(statusPath, JSON.stringify(status));

      const isComplete = await StatusManager.isComplete(workspacePath);

      expect(isComplete).toBe(true);
    });

    it('should return false when complete is false', async () => {
      const workspacePath = await createTestWorkspace('test-workspace');
      const statusPath = join(workspacePath, '.status.json');

      const status: WorkspaceStatus = {
        complete: false,
        progress: {
          completed: 35,
          total: 60,
        },
      };

      await writeTestFile(statusPath, JSON.stringify(status));

      const isComplete = await StatusManager.isComplete(workspacePath);

      expect(isComplete).toBe(false);
    });
  });

  describe('getProgress', () => {
    it('should return progress information', async () => {
      const workspacePath = await createTestWorkspace('test-workspace');
      const statusPath = join(workspacePath, '.status.json');

      const status: WorkspaceStatus = {
        complete: false,
        progress: {
          completed: 35,
          total: 60,
        },
      };

      await writeTestFile(statusPath, JSON.stringify(status));

      const progress = await StatusManager.getProgress(workspacePath);

      expect(progress.completed).toBe(35);
      expect(progress.total).toBe(60);
      expect(progress.percentage).toBe(58);
    });

    it('should calculate percentage correctly', async () => {
      const workspacePath = await createTestWorkspace('test-workspace');
      const statusPath = join(workspacePath, '.status.json');

      const status: WorkspaceStatus = {
        complete: false,
        progress: {
          completed: 50,
          total: 100,
        },
      };

      await writeTestFile(statusPath, JSON.stringify(status));

      const progress = await StatusManager.getProgress(workspacePath);

      expect(progress.percentage).toBe(50);
    });

    it('should handle zero total gracefully', async () => {
      const workspacePath = await createTestWorkspace('test-workspace');
      const statusPath = join(workspacePath, '.status.json');

      const status: WorkspaceStatus = {
        complete: false,
        progress: {
          completed: 0,
          total: 0,
        },
      };

      await writeTestFile(statusPath, JSON.stringify(status));

      const progress = await StatusManager.getProgress(workspacePath);

      expect(progress.percentage).toBe(0);
    });
  });

  describe('validate', () => {
    it('should warn when completed exceeds total', async () => {
      const workspacePath = await createTestWorkspace('test-workspace');
      const statusPath = join(workspacePath, '.status.json');

      const status: WorkspaceStatus = {
        complete: false,
        progress: {
          completed: 70,
          total: 60,
        },
      };

      await writeTestFile(statusPath, JSON.stringify(status));

      const validation = await StatusManager.validate(workspacePath);

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toBeDefined();
      expect(validation.warnings?.length).toBeGreaterThan(0);
      expect(validation.warnings?.[0]).toContain('exceeds total');
    });

    it('should warn when complete but progress incomplete', async () => {
      const workspacePath = await createTestWorkspace('test-workspace');
      const statusPath = join(workspacePath, '.status.json');

      const status: WorkspaceStatus = {
        complete: true,
        progress: {
          completed: 50,
          total: 60,
        },
      };

      await writeTestFile(statusPath, JSON.stringify(status));

      const validation = await StatusManager.validate(workspacePath);

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toBeDefined();
      expect(validation.warnings?.length).toBeGreaterThan(0);
      expect(validation.warnings?.[0]).toContain('Marked complete');
    });

    it('should pass for valid status', async () => {
      const workspacePath = await createTestWorkspace('test-workspace');
      const statusPath = join(workspacePath, '.status.json');

      const status: WorkspaceStatus = {
        complete: true,
        progress: {
          completed: 60,
          total: 60,
        },
      };

      await writeTestFile(statusPath, JSON.stringify(status));

      const validation = await StatusManager.validate(workspacePath);

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toBeUndefined();
    });
  });

  describe('initialize', () => {
    it('should create initial status file', async () => {
      const workspacePath = await createTestWorkspace('test-workspace');

      await StatusManager.initialize(workspacePath, 60);

      const status = await StatusManager.read(workspacePath);

      expect(status.complete).toBe(false);
      expect(status.progress).toBeDefined();
      expect(status.progress?.completed).toBe(0);
      expect(status.progress?.total).toBe(60);
      expect(status.summary).toContain('60 items');
      expect(status.lastUpdated).toBeDefined();
    });
  });
});
