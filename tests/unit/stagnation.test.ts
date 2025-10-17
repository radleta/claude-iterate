import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { Workspace } from '../../src/core/workspace.js';
import { ExecutionMode } from '../../src/types/mode.js';
import { MetadataManager } from '../../src/core/metadata.js';
import { ConfigManager } from '../../src/core/config-manager.js';
import { getTestDir } from '../setup.js';

describe('Stagnation Detection', () => {
  describe('Metadata', () => {
    it('should have default stagnation threshold of 2', () => {
      const metadata = MetadataManager.create('test-workspace');
      expect(metadata.stagnationThreshold).toBe(2);
    });

    it('should persist stagnation threshold in metadata', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'test-stagnation-persist');

      const workspace = await Workspace.init('test-stagnation-persist', workspacePath, {
        stagnationThreshold: 5,
      });

      const metadata = await workspace.getMetadata();
      expect(metadata.stagnationThreshold).toBe(5);

      // Reload workspace and verify persistence
      const reloaded = await Workspace.load('test-stagnation-persist', workspacePath);
      const reloadedMetadata = await reloaded.getMetadata();
      expect(reloadedMetadata.stagnationThreshold).toBe(5);
    });
  });

  describe('Workspace Initialization', () => {
    it('should use default stagnation threshold when not specified', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'test-stagnation-default');

      const workspace = await Workspace.init('test-stagnation-default', workspacePath);
      const metadata = await workspace.getMetadata();

      expect(metadata.stagnationThreshold).toBe(2);
    });

    it('should accept custom stagnation threshold', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'test-stagnation-custom');

      const workspace = await Workspace.init('test-stagnation-custom', workspacePath, {
        stagnationThreshold: 10,
      });
      const metadata = await workspace.getMetadata();

      expect(metadata.stagnationThreshold).toBe(10);
    });

    it('should accept stagnation threshold of 0 (disabled)', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'test-stagnation-disabled');

      const workspace = await Workspace.init('test-stagnation-disabled', workspacePath, {
        stagnationThreshold: 0,
      });
      const metadata = await workspace.getMetadata();

      expect(metadata.stagnationThreshold).toBe(0);
    });
  });

  describe('Mode-specific behavior', () => {
    it('should set stagnation threshold for iterative mode', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'test-stagnation-iterative');

      const workspace = await Workspace.init('test-stagnation-iterative', workspacePath, {
        mode: ExecutionMode.ITERATIVE,
        stagnationThreshold: 3,
      });
      const metadata = await workspace.getMetadata();

      expect(metadata.mode).toBe(ExecutionMode.ITERATIVE);
      expect(metadata.stagnationThreshold).toBe(3);
    });

    it('should set stagnation threshold for loop mode (even though not used)', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'test-stagnation-loop');

      const workspace = await Workspace.init('test-stagnation-loop', workspacePath, {
        mode: ExecutionMode.LOOP,
        stagnationThreshold: 4,
      });
      const metadata = await workspace.getMetadata();

      expect(metadata.mode).toBe(ExecutionMode.LOOP);
      expect(metadata.stagnationThreshold).toBe(4);
    });
  });

  describe('Config hierarchy', () => {
    it('should use default value when no config specified', async () => {
      const config = await ConfigManager.load();
      const runtimeConfig = config.getConfig();

      // Should use the default value of 2
      expect(runtimeConfig.stagnationThreshold).toBe(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle large stagnation thresholds', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'test-stagnation-large');

      const workspace = await Workspace.init('test-stagnation-large', workspacePath, {
        stagnationThreshold: 1000,
      });
      const metadata = await workspace.getMetadata();

      expect(metadata.stagnationThreshold).toBe(1000);
    });

    it('should update stagnation threshold via metadata update', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'test-stagnation-update');

      const workspace = await Workspace.init('test-stagnation-update', workspacePath, {
        stagnationThreshold: 2,
      });

      await workspace.updateMetadata({ stagnationThreshold: 5 });

      const metadata = await workspace.getMetadata();
      expect(metadata.stagnationThreshold).toBe(5);
    });
  });
});
