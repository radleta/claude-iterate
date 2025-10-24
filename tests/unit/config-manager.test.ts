import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { ConfigManager } from '../../src/core/config-manager.js';
import { getTestDir, writeTestFile } from '../setup.js';
import { Workspace } from '../../src/core/workspace.js';

describe('ConfigManager', () => {
  describe('resolveEffectiveValues - optional fields', () => {
    it('should resolve notifyUrl from user config when set', async () => {
      const testDir = getTestDir();
      const userConfigPath = join(
        testDir,
        '.config',
        'claude-iterate',
        'config.json'
      );

      // Create user config with notifyUrl
      await writeTestFile(
        userConfigPath,
        JSON.stringify({
          notifyUrl: 'https://ntfy.sh/test-topic',
        })
      );

      // Mock getUserConfigPath to return our test path
      const originalEnv = process.env['HOME'];
      process.env['HOME'] = testDir;

      try {
        // Load config and resolve values
        const configManager = await ConfigManager.load();
        const values = await configManager.resolveEffectiveValues('user');

        // Verify notifyUrl is present with correct value and source
        const notifyUrlValue = values.get('notifyUrl');
        expect(notifyUrlValue).toBeDefined();
        expect(notifyUrlValue?.value).toBe('https://ntfy.sh/test-topic');
        expect(notifyUrlValue?.source).toBe('user');
      } finally {
        process.env['HOME'] = originalEnv;
      }
    });

    it('should resolve notifyUrl from project config when set', async () => {
      const testDir = getTestDir();
      const projectConfigPath = join(testDir, '.claude-iterate.json');

      // Create project config with notifyUrl
      await writeTestFile(
        projectConfigPath,
        JSON.stringify({
          notifyUrl: 'https://ntfy.sh/project-topic',
        })
      );

      // Change to test directory so project config is found
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        // Load config and resolve values
        const configManager = await ConfigManager.load();
        const values = await configManager.resolveEffectiveValues('project');

        // Verify notifyUrl is present
        const notifyUrlValue = values.get('notifyUrl');
        expect(notifyUrlValue).toBeDefined();
        expect(notifyUrlValue?.value).toBe('https://ntfy.sh/project-topic');
        expect(notifyUrlValue?.source).toBe('project');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should prioritize project config over user config for notifyUrl', async () => {
      const testDir = getTestDir();
      const userConfigPath = join(
        testDir,
        '.config',
        'claude-iterate',
        'config.json'
      );
      const projectConfigPath = join(testDir, '.claude-iterate.json');

      // Set notifyUrl in both configs
      await writeTestFile(
        userConfigPath,
        JSON.stringify({
          notifyUrl: 'https://ntfy.sh/user-topic',
        })
      );

      await writeTestFile(
        projectConfigPath,
        JSON.stringify({
          notifyUrl: 'https://ntfy.sh/project-topic',
        })
      );

      // Mock paths
      const originalEnv = process.env['HOME'];
      const originalCwd = process.cwd();
      process.env['HOME'] = testDir;
      process.chdir(testDir);

      try {
        // Load config and resolve values
        const configManager = await ConfigManager.load();
        const values = await configManager.resolveEffectiveValues('project');

        // Verify project config takes priority
        const notifyUrlValue = values.get('notifyUrl');
        expect(notifyUrlValue?.value).toBe('https://ntfy.sh/project-topic');
        expect(notifyUrlValue?.source).toBe('project');
      } finally {
        process.env['HOME'] = originalEnv;
        process.chdir(originalCwd);
      }
    });

    it('should not include notifyUrl when not set anywhere', async () => {
      const testDir = getTestDir();

      // No config files created
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const configManager = await ConfigManager.load();
        const values = await configManager.resolveEffectiveValues('user');

        // Verify notifyUrl is not in the results (optional field with no default or user value)
        const notifyUrlValue = values.get('notifyUrl');
        expect(notifyUrlValue).toBeUndefined();

        // But fields with defaults should be present
        expect(values.get('defaultMaxIterations')).toBeDefined();
        expect(values.get('defaultMaxIterations')?.value).toBe(50);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should resolve nested optional fields (claude.args)', async () => {
      const testDir = getTestDir();
      const userConfigPath = join(
        testDir,
        '.config',
        'claude-iterate',
        'config.json'
      );

      // Create user config with claude.args
      await writeTestFile(
        userConfigPath,
        JSON.stringify({
          claude: {
            command: 'claude',
            args: ['--dangerously-skip-permissions'],
          },
        })
      );

      // Mock getUserConfigPath
      const originalEnv = process.env['HOME'];
      process.env['HOME'] = testDir;

      try {
        // Load config and resolve values
        const configManager = await ConfigManager.load();
        const values = await configManager.resolveEffectiveValues('user');

        // Verify claude.args is present
        const claudeArgs = values.get('claude.args');
        expect(claudeArgs).toBeDefined();
        expect(claudeArgs?.value).toEqual(['--dangerously-skip-permissions']);
        expect(claudeArgs?.source).toBe('user');
      } finally {
        process.env['HOME'] = originalEnv;
      }
    });

    it('should resolve workspace config overrides for optional fields', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'test-workspace');

      // Create workspace with config override
      const workspace = await Workspace.init('test-workspace', workspacePath, {
        maxIterations: 50,
        delay: 2,
        stagnationThreshold: 2,
      });

      // Set workspace config for verification.depth
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

      // Verify verification.depth shows workspace source
      const depth = values.get('verification.depth');
      expect(depth).toBeDefined();
      expect(depth?.value).toBe('deep');
      expect(depth?.source).toBe('workspace');
    });

    it('should include all keys from all sources in iteration', async () => {
      const testDir = getTestDir();
      const userConfigPath = join(
        testDir,
        '.config',
        'claude-iterate',
        'config.json'
      );
      const projectConfigPath = join(testDir, '.claude-iterate.json');

      // Set different optional fields in different configs
      await writeTestFile(
        userConfigPath,
        JSON.stringify({
          notifyUrl: 'https://ntfy.sh/user-topic',
          colors: false,
        })
      );

      await writeTestFile(
        projectConfigPath,
        JSON.stringify({
          defaultMaxIterations: 100,
          notification: {
            statusWatch: {
              enabled: false,
            },
          },
        })
      );

      // Mock paths
      const originalEnv = process.env['HOME'];
      const originalCwd = process.cwd();
      process.env['HOME'] = testDir;
      process.chdir(testDir);

      try {
        const configManager = await ConfigManager.load();
        const values = await configManager.resolveEffectiveValues('project');

        // Verify all keys are present, regardless of which config they're in
        expect(values.has('notifyUrl')).toBe(true);
        expect(values.has('colors')).toBe(true);
        expect(values.has('defaultMaxIterations')).toBe(true);
        expect(values.has('notification.statusWatch.enabled')).toBe(true);

        // Verify correct sources
        expect(values.get('notifyUrl')?.source).toBe('user');
        expect(values.get('defaultMaxIterations')?.source).toBe('project');
        expect(values.get('notification.statusWatch.enabled')?.source).toBe(
          'project'
        );
      } finally {
        process.env['HOME'] = originalEnv;
        process.chdir(originalCwd);
      }
    });
  });

  describe('config loading and merging', () => {
    it('should load default config when no files exist', async () => {
      const testDir = getTestDir();

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const configManager = await ConfigManager.load();
        const config = configManager.getConfig();

        // Verify defaults are loaded
        expect(config.workspacesDir).toBe('./claude-iterate/workspaces');
        expect(config.maxIterations).toBe(50);
        expect(config.delay).toBe(2);
        expect(config.claudeCommand).toBe('claude');
        expect(config.claudeArgs).toEqual([]);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should merge user config over defaults', async () => {
      const testDir = getTestDir();
      const userConfigPath = join(
        testDir,
        '.config',
        'claude-iterate',
        'config.json'
      );

      await writeTestFile(
        userConfigPath,
        JSON.stringify({
          defaultMaxIterations: 100,
          defaultDelay: 5,
        })
      );

      const originalEnv = process.env['HOME'];
      process.env['HOME'] = testDir;

      try {
        const configManager = await ConfigManager.load();
        const config = configManager.getConfig();

        // User config overrides defaults
        expect(config.maxIterations).toBe(100);
        expect(config.delay).toBe(5);

        // Other defaults remain
        expect(config.workspacesDir).toBe('./claude-iterate/workspaces');
      } finally {
        process.env['HOME'] = originalEnv;
      }
    });

    it('should merge project config over user config', async () => {
      const testDir = getTestDir();
      const userConfigPath = join(
        testDir,
        '.config',
        'claude-iterate',
        'config.json'
      );
      const projectConfigPath = join(testDir, '.claude-iterate.json');

      await writeTestFile(
        userConfigPath,
        JSON.stringify({
          defaultMaxIterations: 100,
        })
      );

      await writeTestFile(
        projectConfigPath,
        JSON.stringify({
          defaultMaxIterations: 200,
        })
      );

      const originalEnv = process.env['HOME'];
      const originalCwd = process.cwd();
      process.env['HOME'] = testDir;
      process.chdir(testDir);

      try {
        const configManager = await ConfigManager.load();
        const config = configManager.getConfig();

        // Project config overrides user config
        expect(config.maxIterations).toBe(200);
      } finally {
        process.env['HOME'] = originalEnv;
        process.chdir(originalCwd);
      }
    });
  });
});
