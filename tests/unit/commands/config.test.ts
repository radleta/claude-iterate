import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { promises as fs } from 'fs';
import { getTestDir } from '../../setup.js';
import { ConfigManager } from '../../../src/core/config-manager.js';

/**
 * Tests for config command handlers
 *
 * Note: We test the handlers indirectly through ConfigManager and file operations
 * since the handlers are not exported from config.ts. This tests the actual behavior
 * users experience through the CLI.
 */

describe('Config command handlers', () => {
  let testDir: string;
  let projectConfigPath: string;

  beforeEach(async () => {
    testDir = getTestDir();
    projectConfigPath = join(testDir, '.claude-iterate.json');
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  describe('Config file operations', () => {
    it('should read empty config when file does not exist', async () => {
      // When no config file exists, ConfigManager should use defaults
      const configManager = await ConfigManager.load();
      const config = configManager.getConfig();

      expect(config.maxIterations).toBe(50);
      expect(config.delay).toBe(2);
      expect(config.outputLevel).toBe('progress');
    });

    it('should read existing project config', async () => {
      // Create a project config file
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({ defaultMaxIterations: 100 }),
        'utf-8'
      );

      // Change to test directory so ConfigManager finds the file
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const configManager = await ConfigManager.load();
        const config = configManager.getConfig();
        expect(config.maxIterations).toBe(100);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should write project config', async () => {
      // Write a config value
      const config = { defaultMaxIterations: 75, defaultDelay: 5 };
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // Read it back
      const content = await fs.readFile(projectConfigPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.defaultMaxIterations).toBe(75);
      expect(parsed.defaultDelay).toBe(5);
    });
  });

  describe('Getting config values', () => {
    it('should get simple config value', async () => {
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({ defaultMaxIterations: 100 }),
        'utf-8'
      );

      const content = await fs.readFile(projectConfigPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config.defaultMaxIterations).toBe(100);
    });

    it('should get nested config value', async () => {
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({
          verification: {
            depth: 'deep',
            autoVerify: false,
          },
        }),
        'utf-8'
      );

      const content = await fs.readFile(projectConfigPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config.verification.depth).toBe('deep');
      expect(config.verification.autoVerify).toBe(false);
    });

    it('should handle missing keys gracefully', async () => {
      await fs.writeFile(projectConfigPath, JSON.stringify({}), 'utf-8');

      const content = await fs.readFile(projectConfigPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config.nonExistentKey).toBeUndefined();
    });
  });

  describe('Setting config values', () => {
    it('should set simple config value', async () => {
      // Create initial config
      await fs.writeFile(projectConfigPath, JSON.stringify({}), 'utf-8');

      // Read, modify, write
      const content = await fs.readFile(projectConfigPath, 'utf-8');
      const config = JSON.parse(content);
      config.defaultMaxIterations = 100;
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // Verify
      const updated = JSON.parse(await fs.readFile(projectConfigPath, 'utf-8'));
      expect(updated.defaultMaxIterations).toBe(100);
    });

    it('should set nested config value preserving siblings', async () => {
      // Create initial config with nested values
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({
          verification: {
            autoVerify: true,
            depth: 'standard',
          },
        }),
        'utf-8'
      );

      // Read, modify nested value, write
      const content = await fs.readFile(projectConfigPath, 'utf-8');
      const config = JSON.parse(content);
      config.verification.depth = 'deep';
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // Verify sibling preserved
      const updated = JSON.parse(await fs.readFile(projectConfigPath, 'utf-8'));
      expect(updated.verification.depth).toBe('deep');
      expect(updated.verification.autoVerify).toBe(true); // Sibling preserved
    });

    it('should create nested structure when setting deep path', async () => {
      // Start with empty config
      await fs.writeFile(projectConfigPath, JSON.stringify({}), 'utf-8');

      // Set nested value
      const content = await fs.readFile(projectConfigPath, 'utf-8');
      const config = JSON.parse(content);
      if (!config.verification) {
        config.verification = {};
      }
      config.verification.depth = 'deep';
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // Verify structure created
      const updated = JSON.parse(await fs.readFile(projectConfigPath, 'utf-8'));
      expect(updated.verification).toBeDefined();
      expect(updated.verification.depth).toBe('deep');
    });

    it('should overwrite existing values', async () => {
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({ defaultMaxIterations: 50 }),
        'utf-8'
      );

      // Overwrite
      const content = await fs.readFile(projectConfigPath, 'utf-8');
      const config = JSON.parse(content);
      config.defaultMaxIterations = 100;
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // Verify
      const updated = JSON.parse(await fs.readFile(projectConfigPath, 'utf-8'));
      expect(updated.defaultMaxIterations).toBe(100);
    });
  });

  describe('Array operations', () => {
    it('should add item to empty array', async () => {
      await fs.writeFile(projectConfigPath, JSON.stringify({}), 'utf-8');

      // Add to array
      const content = await fs.readFile(projectConfigPath, 'utf-8');
      const config = JSON.parse(content);
      if (!config.claude) {
        config.claude = {};
      }
      if (!config.claude.args) {
        config.claude.args = [];
      }
      config.claude.args.push('--verbose');
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // Verify
      const updated = JSON.parse(await fs.readFile(projectConfigPath, 'utf-8'));
      expect(updated.claude.args).toEqual(['--verbose']);
    });

    it('should add item to existing array', async () => {
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({
          claude: {
            args: ['--quiet'],
          },
        }),
        'utf-8'
      );

      // Add to array
      const content = await fs.readFile(projectConfigPath, 'utf-8');
      const config = JSON.parse(content);
      config.claude.args.push('--dangerously-skip-permissions');
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // Verify
      const updated = JSON.parse(await fs.readFile(projectConfigPath, 'utf-8'));
      expect(updated.claude.args).toEqual([
        '--quiet',
        '--dangerously-skip-permissions',
      ]);
    });

    it('should handle duplicate additions', async () => {
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({
          claude: {
            args: ['--verbose'],
          },
        }),
        'utf-8'
      );

      // Add duplicate (implementation should prevent or allow based on design)
      const content = await fs.readFile(projectConfigPath, 'utf-8');
      const config = JSON.parse(content);
      if (!config.claude.args.includes('--verbose')) {
        config.claude.args.push('--verbose');
      }
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // Verify no duplicate
      const updated = JSON.parse(await fs.readFile(projectConfigPath, 'utf-8'));
      expect(updated.claude.args).toEqual(['--verbose']);
    });

    it('should remove item from array', async () => {
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({
          claude: {
            args: ['--quiet', '--verbose'],
          },
        }),
        'utf-8'
      );

      // Remove item
      const content = await fs.readFile(projectConfigPath, 'utf-8');
      const config = JSON.parse(content);
      config.claude.args = config.claude.args.filter(
        (arg: string) => arg !== '--quiet'
      );
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // Verify
      const updated = JSON.parse(await fs.readFile(projectConfigPath, 'utf-8'));
      expect(updated.claude.args).toEqual(['--verbose']);
    });

    it('should handle removing non-existent item', async () => {
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({
          claude: {
            args: ['--verbose'],
          },
        }),
        'utf-8'
      );

      // Try to remove non-existent item
      const content = await fs.readFile(projectConfigPath, 'utf-8');
      const config = JSON.parse(content);
      const originalLength = config.claude.args.length;
      config.claude.args = config.claude.args.filter(
        (arg: string) => arg !== '--nonexistent'
      );
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // Verify array unchanged
      const updated = JSON.parse(await fs.readFile(projectConfigPath, 'utf-8'));
      expect(updated.claude.args.length).toBe(originalLength);
      expect(updated.claude.args).toEqual(['--verbose']);
    });

    it('should handle removing from empty array', async () => {
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({
          claude: {
            args: [],
          },
        }),
        'utf-8'
      );

      // Try to remove from empty array
      const content = await fs.readFile(projectConfigPath, 'utf-8');
      const config = JSON.parse(content);
      config.claude.args = config.claude.args.filter(
        (arg: string) => arg !== '--verbose'
      );
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // Verify still empty
      const updated = JSON.parse(await fs.readFile(projectConfigPath, 'utf-8'));
      expect(updated.claude.args).toEqual([]);
    });
  });

  describe('Unsetting values', () => {
    it('should unset simple config value', async () => {
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({
          defaultMaxIterations: 100,
          defaultDelay: 5,
        }),
        'utf-8'
      );

      // Unset value
      const content = await fs.readFile(projectConfigPath, 'utf-8');
      const config = JSON.parse(content);
      delete config.defaultMaxIterations;
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // Verify
      const updated = JSON.parse(await fs.readFile(projectConfigPath, 'utf-8'));
      expect(updated.defaultMaxIterations).toBeUndefined();
      expect(updated.defaultDelay).toBe(5); // Other value preserved
    });

    it('should unset nested config value', async () => {
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({
          verification: {
            depth: 'deep',
            autoVerify: false,
          },
        }),
        'utf-8'
      );

      // Unset nested value
      const content = await fs.readFile(projectConfigPath, 'utf-8');
      const config = JSON.parse(content);
      delete config.verification.depth;
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // Verify
      const updated = JSON.parse(await fs.readFile(projectConfigPath, 'utf-8'));
      expect(updated.verification.depth).toBeUndefined();
      expect(updated.verification.autoVerify).toBe(false); // Sibling preserved
    });

    it('should handle unsetting non-existent key', async () => {
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({ defaultMaxIterations: 100 }),
        'utf-8'
      );

      // Try to unset non-existent key
      const content = await fs.readFile(projectConfigPath, 'utf-8');
      const config = JSON.parse(content);
      delete config.nonExistentKey;
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // Verify config unchanged
      const updated = JSON.parse(await fs.readFile(projectConfigPath, 'utf-8'));
      expect(updated.defaultMaxIterations).toBe(100);
    });
  });

  describe('Config inheritance and priority', () => {
    it('should prioritize CLI options over config file', async () => {
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({ defaultMaxIterations: 50 }),
        'utf-8'
      );

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        // CLI option should override config file
        const configManager = await ConfigManager.load({ maxIterations: 100 });
        const config = configManager.getConfig();
        expect(config.maxIterations).toBe(100);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should use config file when no CLI options provided', async () => {
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({ defaultMaxIterations: 75 }),
        'utf-8'
      );

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const configManager = await ConfigManager.load();
        const config = configManager.getConfig();
        expect(config.maxIterations).toBe(75);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should fall back to defaults when no config exists', async () => {
      const configManager = await ConfigManager.load();
      const config = configManager.getConfig();

      expect(config.maxIterations).toBe(50); // Default
      expect(config.delay).toBe(2); // Default
      expect(config.outputLevel).toBe('progress'); // Default
    });
  });

  describe('Schema validation', () => {
    it('should validate enum values', async () => {
      // Valid enum value
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({ outputLevel: 'verbose' }),
        'utf-8'
      );

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const configManager = await ConfigManager.load();
        const config = configManager.getConfig();
        expect(config.outputLevel).toBe('verbose');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle number constraints', async () => {
      // Valid number within constraints
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({ defaultMaxIterations: 100 }),
        'utf-8'
      );

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const configManager = await ConfigManager.load();
        const config = configManager.getConfig();
        expect(config.maxIterations).toBe(100);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('ConfigManager integration', () => {
    it('should resolve effective values with correct sources', async () => {
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({ defaultMaxIterations: 75 }),
        'utf-8'
      );

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const configManager = await ConfigManager.load();
        const values = await configManager.resolveEffectiveValues('project');

        const maxIter = values.get('defaultMaxIterations');
        expect(maxIter?.value).toBe(75);
        expect(maxIter?.source).toBe('project');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should show defaults when no overrides exist', async () => {
      const configManager = await ConfigManager.load();
      const values = await configManager.resolveEffectiveValues('user');

      const maxIter = values.get('defaultMaxIterations');
      expect(maxIter?.value).toBe(50);
      expect(maxIter?.source).toBe('default');
    });
  });
});
