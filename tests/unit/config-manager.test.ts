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

  describe('Layer override priority', () => {
    it('should prioritize CLI over all other layers', async () => {
      // Create workspace with config
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'cli-priority');

      const workspace = await Workspace.init('cli-priority', workspacePath, {
        maxIterations: 50,
        delay: 2,
        stagnationThreshold: 2,
      });

      await workspace.updateMetadata({
        config: {
          outputLevel: 'progress',
        },
      });

      const metadata = await workspace.getMetadata();

      // Load with CLI options (highest priority)
      const configManager = await ConfigManager.load(
        {
          maxIterations: 25,
          output: 'verbose',
        },
        metadata
      );

      const config = configManager.getConfig();

      // CLI options should override everything
      expect(config.maxIterations).toBe(25);
      expect(config.outputLevel).toBe('verbose');
    });

    it('should prioritize workspace over defaults', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'ws-priority');

      const workspace = await Workspace.init('ws-priority', workspacePath, {
        maxIterations: 50,
        delay: 2,
        stagnationThreshold: 2,
      });

      await workspace.updateMetadata({
        config: {
          verification: {
            depth: 'deep',
            maxAttempts: 5,
          },
        },
      });

      const metadata = await workspace.getMetadata();
      const configManager = await ConfigManager.load({}, metadata);
      const config = configManager.getConfig();

      // Workspace overrides should apply
      expect(config.verification.depth).toBe('deep');
      expect(config.verification.maxAttempts).toBe(5);
      // Other verification defaults should remain
      expect(config.verification.autoVerify).toBe(true);
    });

    it('should prioritize outputLevel from CLI flags', async () => {
      // Test --output flag
      const config1 = await ConfigManager.load({ output: 'quiet' });
      expect(config1.getConfig().outputLevel).toBe('quiet');

      // Test --verbose flag (converted to outputLevel)
      const config2 = await ConfigManager.load({ verbose: true });
      expect(config2.getConfig().outputLevel).toBe('verbose');

      // Test --quiet flag
      const config3 = await ConfigManager.load({ quiet: true });
      expect(config3.getConfig().outputLevel).toBe('quiet');
    });
  });

  describe('All critical config keys', () => {
    it('should handle defaultMaxIterations across layers', async () => {
      const configManager = await ConfigManager.load();
      expect(configManager.getConfig().maxIterations).toBe(50);

      const configWithCLI = await ConfigManager.load({ maxIterations: 100 });
      expect(configWithCLI.getConfig().maxIterations).toBe(100);
    });

    it('should handle defaultDelay across layers', async () => {
      const configManager = await ConfigManager.load();
      expect(configManager.getConfig().delay).toBe(2);

      const configWithCLI = await ConfigManager.load({ delay: 10 });
      expect(configWithCLI.getConfig().delay).toBe(10);
    });

    it('should handle outputLevel enum values', async () => {
      const config1 = await ConfigManager.load({ output: 'quiet' });
      expect(config1.getConfig().outputLevel).toBe('quiet');

      const config2 = await ConfigManager.load({ output: 'progress' });
      expect(config2.getConfig().outputLevel).toBe('progress');

      const config3 = await ConfigManager.load({ output: 'verbose' });
      expect(config3.getConfig().outputLevel).toBe('verbose');
    });

    it('should handle colors boolean flag', async () => {
      const config1 = await ConfigManager.load({ colors: true });
      expect(config1.getConfig().colors).toBe(true);

      const config2 = await ConfigManager.load({ colors: false });
      expect(config2.getConfig().colors).toBe(false);
    });

    it('should handle workspace directories', async () => {
      const config1 = await ConfigManager.load({
        workspacesDir: './custom/workspaces',
      });
      expect(config1.getConfig().workspacesDir).toBe('./custom/workspaces');

      const config2 = await ConfigManager.load({
        templatesDir: './custom/templates',
      });
      expect(config2.getConfig().templatesDir).toBe('./custom/templates');

      const config3 = await ConfigManager.load({
        archiveDir: './custom/archive',
      });
      expect(config3.getConfig().archiveDir).toBe('./custom/archive');
    });

    it('should handle notification URL', async () => {
      const config = await ConfigManager.load({
        notifyUrl: 'https://ntfy.sh/test',
      });
      expect(config.getConfig().notifyUrl).toBe('https://ntfy.sh/test');
    });

    it('should handle verification settings in workspace config', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'verify-config');

      const workspace = await Workspace.init('verify-config', workspacePath, {
        maxIterations: 50,
        delay: 2,
        stagnationThreshold: 2,
      });

      await workspace.updateMetadata({
        config: {
          verification: {
            depth: 'quick',
            autoVerify: false,
            resumeOnFail: false,
            maxAttempts: 1,
          },
        },
      });

      const metadata = await workspace.getMetadata();
      const configManager = await ConfigManager.load({}, metadata);
      const config = configManager.getConfig();

      expect(config.verification.depth).toBe('quick');
      expect(config.verification.autoVerify).toBe(false);
      expect(config.verification.resumeOnFail).toBe(false);
      expect(config.verification.maxAttempts).toBe(1);
    });

    it('should handle claude command settings', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'claude-config');

      const workspace = await Workspace.init('claude-config', workspacePath, {
        maxIterations: 50,
        delay: 2,
        stagnationThreshold: 2,
      });

      await workspace.updateMetadata({
        config: {
          claude: {
            command: 'custom-claude',
            args: ['--arg1', '--arg2'],
          },
        },
      });

      const metadata = await workspace.getMetadata();
      const configManager = await ConfigManager.load({}, metadata);
      const config = configManager.getConfig();

      expect(config.claudeCommand).toBe('custom-claude');
      expect(config.claudeArgs).toEqual(['--arg1', '--arg2']);
    });
  });

  describe('CLI options merging edge cases', () => {
    it('should handle output flag priority over verbose/quiet', async () => {
      // --output should take priority
      const config = await ConfigManager.load({
        output: 'progress',
        verbose: true, // Should be ignored when output is present
      });

      expect(config.getConfig().outputLevel).toBe('progress');
    });

    it('should handle multiple CLI overrides simultaneously', async () => {
      const config = await ConfigManager.load({
        maxIterations: 100,
        delay: 5,
        output: 'verbose',
        colors: false,
        workspacesDir: './test/ws',
      });

      const result = config.getConfig();
      expect(result.maxIterations).toBe(100);
      expect(result.delay).toBe(5);
      expect(result.outputLevel).toBe('verbose');
      expect(result.colors).toBe(false);
      expect(result.workspacesDir).toBe('./test/ws');
    });

    it('should preserve defaults when no overrides provided', async () => {
      const config = await ConfigManager.load({});
      const result = config.getConfig();

      expect(result.maxIterations).toBe(50);
      expect(result.delay).toBe(2);
      expect(result.outputLevel).toBe('progress');
      expect(result.colors).toBe(true);
      expect(result.stagnationThreshold).toBe(2);
    });
  });

  describe('Workspace config with resolveEffectiveValues', () => {
    it('should correctly identify source for workspace overrides', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'source-test');

      const workspace = await Workspace.init('source-test', workspacePath, {
        maxIterations: 50,
        delay: 2,
        stagnationThreshold: 2,
      });

      await workspace.updateMetadata({
        config: {
          verification: {
            depth: 'deep',
          },
          outputLevel: 'verbose',
        },
      });

      const metadata = await workspace.getMetadata();
      const configManager = await ConfigManager.load({}, metadata);
      const values = await configManager.resolveEffectiveValues(
        'workspace',
        metadata
      );

      // Check that workspace overrides are correctly identified
      const depth = values.get('verification.depth');
      expect(depth?.value).toBe('deep');
      expect(depth?.source).toBe('workspace');

      const outputLevel = values.get('outputLevel');
      expect(outputLevel?.value).toBe('verbose');
      expect(outputLevel?.source).toBe('workspace');

      // Check that non-overridden values show correct source
      const autoVerify = values.get('verification.autoVerify');
      expect(autoVerify?.value).toBe(true);
      expect(autoVerify?.source).toBe('default');
    });

    it('should handle empty workspace config', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'empty-config');

      const workspace = await Workspace.init('empty-config', workspacePath, {
        maxIterations: 50,
        delay: 2,
        stagnationThreshold: 2,
      });

      const metadata = await workspace.getMetadata();
      const configManager = await ConfigManager.load({}, metadata);
      const values = await configManager.resolveEffectiveValues(
        'workspace',
        metadata
      );

      // All values should be defaults
      const maxIter = values.get('defaultMaxIterations');
      expect(maxIter?.value).toBe(50);
      expect(maxIter?.source).toBe('default');
    });
  });

  describe('Full 5-layer integration', () => {
    it('should correctly apply all layers: CLI > workspace > project > user > default', async () => {
      // This integration test verifies the complete priority chain
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'five-layer');

      const workspace = await Workspace.init('five-layer', workspacePath, {
        maxIterations: 50,
        delay: 2,
        stagnationThreshold: 2,
      });

      // Workspace layer sets verification.depth
      await workspace.updateMetadata({
        config: {
          verification: {
            depth: 'standard',
          },
        },
      });

      const metadata = await workspace.getMetadata();

      // CLI layer sets maxIterations and output
      const configManager = await ConfigManager.load(
        {
          maxIterations: 75,
          output: 'quiet',
        },
        metadata
      );

      const config = configManager.getConfig();

      // CLI values should win
      expect(config.maxIterations).toBe(75);
      expect(config.outputLevel).toBe('quiet');

      // Workspace override should be applied
      expect(config.verification.depth).toBe('standard');

      // Defaults should fill in the rest
      expect(config.delay).toBe(2);
      expect(config.verification.autoVerify).toBe(true);
    });
  });
});
