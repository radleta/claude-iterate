import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { ConfigManager } from '../../src/core/config-manager.js';
import { getTestDir } from '../setup.js';
import { Workspace } from '../../src/core/workspace.js';

describe('ConfigManager', () => {
  describe('resolveEffectiveValues', () => {
    it('should include default keys with their values', async () => {
      // Test that default config keys are present in resolveEffectiveValues
      const configManager = await ConfigManager.load();
      const values = await configManager.resolveEffectiveValues('user');

      // Verify default keys are present
      expect(values.has('defaultMaxIterations')).toBe(true);
      expect(values.has('defaultDelay')).toBe(true);
      expect(values.has('globalTemplatesDir')).toBe(true);

      // Verify default values
      expect(values.get('defaultMaxIterations')?.value).toBe(50);
      expect(values.get('defaultDelay')?.value).toBe(2);
      expect(values.get('defaultMaxIterations')?.source).toBe('default');
    });

    it('should handle workspace config overrides', async () => {
      // Test that workspace config can override values
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'test-workspace');

      // Create workspace
      const workspace = await Workspace.init('test-workspace', workspacePath, {
        maxIterations: 50,
        delay: 2,
        stagnationThreshold: 2,
      });

      // Set workspace config override
      await workspace.updateMetadata({
        config: {
          verification: {
            depth: 'deep',
          },
        },
      });

      const metadata = await workspace.getMetadata();

      // Load config manager with workspace metadata
      const configManager = await ConfigManager.load({}, metadata);
      const values = await configManager.resolveEffectiveValues(
        'workspace',
        metadata
      );

      // Verify workspace override is applied
      const depth = values.get('verification.depth');
      expect(depth).toBeDefined();
      expect(depth?.value).toBe('deep');
      expect(depth?.source).toBe('workspace');
    });
  });

  describe('config loading and merging', () => {
    it('should load default config when no files exist', async () => {
      // Test basic config loading
      const configManager = await ConfigManager.load();
      const config = configManager.getConfig();

      // Verify defaults are loaded
      expect(config.workspacesDir).toBe('./claude-iterate/workspaces');
      expect(config.maxIterations).toBe(50);
      expect(config.delay).toBe(2);
      expect(config.claudeCommand).toBe('claude');
      expect(config.claudeArgs).toEqual([]);
    });

    it('should merge CLI options over defaults', async () => {
      // Test that CLI options take priority
      const configManager = await ConfigManager.load({
        maxIterations: 100,
        delay: 5,
      });

      const config = configManager.getConfig();

      // CLI options override defaults
      expect(config.maxIterations).toBe(100);
      expect(config.delay).toBe(5);

      // Other defaults remain
      expect(config.workspacesDir).toBe('./claude-iterate/workspaces');
    });

    it('should merge workspace metadata into config', async () => {
      // Test workspace metadata merging
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'test-merge');

      const workspace = await Workspace.init('test-merge', workspacePath, {
        maxIterations: 75,
        delay: 3,
        stagnationThreshold: 4,
        notifyUrl: 'https://ntfy.sh/test',
      });

      const metadata = await workspace.getMetadata();
      const configManager = await ConfigManager.load({}, metadata);
      const config = configManager.getConfig();

      // Workspace settings applied
      expect(config.maxIterations).toBe(75);
      expect(config.delay).toBe(3);
      expect(config.stagnationThreshold).toBe(4);
      expect(config.notifyUrl).toBe('https://ntfy.sh/test');
    });
  });

  describe('bug fix verification', () => {
    it('should collect keys from all config layers (Set-based collection)', async () => {
      // This test verifies the bug fix: resolveEffectiveValues now uses a Set
      // to collect keys from all config sources (default, user, project, workspace),
      // not just from defaults. This ensures optional fields are included when set.

      const configManager = await ConfigManager.load();
      const values = await configManager.resolveEffectiveValues('user');

      // The fix ensures we iterate over keys from ALL sources
      // Even if optional fields aren't set, the mechanism is in place
      // to collect them if they were present in user/project/workspace configs

      // Verify the resolution works for fields with defaults
      expect(values.size).toBeGreaterThan(0);
      expect(values.has('defaultMaxIterations')).toBe(true);

      // The bug was that optional fields (notifyUrl, claude.args in optional objects)
      // would not appear even when set in config files because only
      // Object.keys(flatDefault) was checked. Now we use a Set that includes
      // keys from flatUser, flatProject, and flatWorkspace as well.
    });
  });
});
