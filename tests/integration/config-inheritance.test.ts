import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'path';
import { promises as fs } from 'fs';
import { getTestDir } from '../setup.js';
import { ConfigManager } from '../../src/core/config-manager.js';
import { Workspace } from '../../src/core/workspace.js';

/**
 * Integration tests for full 5-layer config inheritance chain
 *
 * Priority: CLI → Workspace → Project → User → Defaults
 *
 * These tests verify that the complete config system works correctly
 * when multiple layers have values, ensuring proper priority ordering.
 */

describe('Config Inheritance Integration', () => {
  let testDir: string;
  let userConfigPath: string;
  let projectConfigPath: string;
  let originalCwd: string;

  beforeEach(async () => {
    testDir = getTestDir();
    userConfigPath = join(testDir, 'user-config.json');
    projectConfigPath = join(testDir, '.claude-iterate.json');
    originalCwd = process.cwd();

    // Create test directories
    await fs.mkdir(join(testDir, 'workspaces'), { recursive: true });
  });

  describe('Two-layer priority: CLI > Defaults', () => {
    it('should use CLI value over default', async () => {
      const configManager = await ConfigManager.load({
        maxIterations: 100,
      });

      const config = configManager.getConfig();
      expect(config.maxIterations).toBe(100);
      expect(config.delay).toBe(2); // Still default
    });

    it('should use CLI output over default', async () => {
      const configManager = await ConfigManager.load({
        output: 'verbose',
      });

      const config = configManager.getConfig();
      expect(config.outputLevel).toBe('verbose');
    });

    it('should use CLI quiet flag over default', async () => {
      const configManager = await ConfigManager.load({
        quiet: true,
      });

      const config = configManager.getConfig();
      expect(config.outputLevel).toBe('quiet');
    });
  });

  describe('Three-layer priority: CLI > Project > Defaults', () => {
    it('should prioritize CLI over project config', async () => {
      // Create project config
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({ defaultMaxIterations: 75 }),
        'utf-8'
      );

      process.chdir(testDir);

      try {
        const configManager = await ConfigManager.load({
          maxIterations: 100, // CLI wins
        });

        const config = configManager.getConfig();
        expect(config.maxIterations).toBe(100);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should use project config when no CLI option', async () => {
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({ defaultMaxIterations: 75 }),
        'utf-8'
      );

      process.chdir(testDir);

      try {
        const configManager = await ConfigManager.load();
        const config = configManager.getConfig();
        expect(config.maxIterations).toBe(75);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should merge CLI and project configs correctly', async () => {
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({
          defaultMaxIterations: 75,
          defaultDelay: 5,
          outputLevel: 'progress',
        }),
        'utf-8'
      );

      process.chdir(testDir);

      try {
        const configManager = await ConfigManager.load({
          maxIterations: 100, // Override maxIterations
          // Keep delay and outputLevel from project
        });

        const config = configManager.getConfig();
        expect(config.maxIterations).toBe(100); // CLI
        expect(config.delay).toBe(5); // Project
        expect(config.outputLevel).toBe('progress'); // Project
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Four-layer priority: CLI > Workspace > Project > Defaults', () => {
    it('should prioritize CLI over workspace and project', async () => {
      // Create project config
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({ defaultMaxIterations: 50 }),
        'utf-8'
      );

      process.chdir(testDir);

      try {
        // Create workspace with config
        const workspacePath = join(testDir, 'workspaces', 'test-ws');
        const workspace = await Workspace.init('test-ws', workspacePath, {
          maxIterations: 50,
          delay: 2,
          stagnationThreshold: 2,
        });

        await workspace.updateMetadata({
          config: {
            defaultMaxIterations: 75,
          },
        });

        const metadata = await workspace.getMetadata();

        // Load with CLI option (highest priority)
        const configManager = await ConfigManager.load(
          { maxIterations: 100 },
          metadata
        );

        const config = configManager.getConfig();
        expect(config.maxIterations).toBe(100); // CLI wins
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should prioritize workspace over project when no CLI', async () => {
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({
          verification: {
            depth: 'quick',
          },
        }),
        'utf-8'
      );

      process.chdir(testDir);

      try {
        const workspacePath = join(testDir, 'workspaces', 'test-ws');
        const workspace = await Workspace.init('test-ws', workspacePath, {
          maxIterations: 50,
          delay: 2,
          stagnationThreshold: 2,
        });

        await workspace.updateMetadata({
          config: {
            verification: {
              depth: 'deep',
            },
          },
        });

        const metadata = await workspace.getMetadata();
        const configManager = await ConfigManager.load({}, metadata);

        const config = configManager.getConfig();
        expect(config.verification.depth).toBe('deep'); // Workspace wins over project
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should merge workspace nested config correctly', async () => {
      process.chdir(testDir);

      try {
        const workspacePath = join(testDir, 'workspaces', 'test-ws');
        const workspace = await Workspace.init('test-ws', workspacePath, {
          maxIterations: 50,
          delay: 2,
          stagnationThreshold: 2,
        });

        await workspace.updateMetadata({
          config: {
            verification: {
              depth: 'deep',
              autoVerify: false,
            },
          },
        });

        const metadata = await workspace.getMetadata();
        const configManager = await ConfigManager.load({}, metadata);

        const config = configManager.getConfig();
        expect(config.verification.depth).toBe('deep'); // Workspace
        expect(config.verification.autoVerify).toBe(false); // Workspace
        expect(config.verification.maxAttempts).toBe(2); // Default (not overridden)
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Full five-layer priority: CLI > Workspace > Project > User > Defaults', () => {
    it('should correctly apply all five layers', async () => {
      // Layer 5: Defaults (hardcoded)
      // defaultMaxIterations: 50, defaultDelay: 2, outputLevel: 'progress'

      // Layer 4: User config
      await fs.writeFile(
        userConfigPath,
        JSON.stringify({
          defaultMaxIterations: 30,
          defaultDelay: 1,
        }),
        'utf-8'
      );

      // Layer 3: Project config
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({
          defaultMaxIterations: 50,
          outputLevel: 'verbose',
        }),
        'utf-8'
      );

      process.chdir(testDir);

      try {
        // Layer 2: Workspace config
        const workspacePath = join(testDir, 'workspaces', 'test-ws');
        const workspace = await Workspace.init('test-ws', workspacePath, {
          maxIterations: 50,
          delay: 2,
          stagnationThreshold: 2,
        });

        await workspace.updateMetadata({
          config: {
            defaultMaxIterations: 75,
            verification: {
              depth: 'deep',
            },
          },
        });

        const metadata = await workspace.getMetadata();

        // Mock user config loading by setting env variable
        process.env['HOME'] = testDir;
        process.env['XDG_CONFIG_HOME'] = testDir;

        // Layer 1: CLI options (highest priority)
        const configManager = await ConfigManager.load(
          {
            maxIterations: 100,
            delay: 10,
          },
          metadata
        );

        const config = configManager.getConfig();

        // Verify priority chain
        expect(config.maxIterations).toBe(100); // CLI (Layer 1)
        expect(config.delay).toBe(10); // CLI (Layer 1)
        expect(config.outputLevel).toBe('verbose'); // Project (Layer 3)
        expect(config.verification.depth).toBe('deep'); // Workspace (Layer 2)
        expect(config.verification.autoVerify).toBe(true); // Default (Layer 5)
      } finally {
        process.chdir(originalCwd);
        delete process.env['HOME'];
        delete process.env['XDG_CONFIG_HOME'];
      }
    });

    it('should handle complex nested config across all layers', async () => {
      // Project: verification.depth = 'quick'
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({
          verification: {
            depth: 'quick',
            resumeOnFail: false,
          },
        }),
        'utf-8'
      );

      process.chdir(testDir);

      try {
        // Workspace: verification.depth = 'deep' (overrides project)
        const workspacePath = join(testDir, 'workspaces', 'test-ws');
        const workspace = await Workspace.init('test-ws', workspacePath, {
          maxIterations: 50,
          delay: 2,
          stagnationThreshold: 2,
        });

        await workspace.updateMetadata({
          config: {
            verification: {
              depth: 'deep',
            },
          },
        });

        const metadata = await workspace.getMetadata();
        const configManager = await ConfigManager.load({}, metadata);

        const config = configManager.getConfig();
        expect(config.verification.depth).toBe('deep'); // Workspace overrides project
        expect(config.verification.resumeOnFail).toBe(false); // Project
        expect(config.verification.autoVerify).toBe(true); // Default (untouched)
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Source tracking with resolveEffectiveValues', () => {
    it('should correctly identify source for each layer', async () => {
      // Project config
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({
          defaultMaxIterations: 75,
          outputLevel: 'verbose',
        }),
        'utf-8'
      );

      process.chdir(testDir);

      try {
        // Workspace config
        const workspacePath = join(testDir, 'workspaces', 'test-ws');
        const workspace = await Workspace.init('test-ws', workspacePath, {
          maxIterations: 50,
          delay: 2,
          stagnationThreshold: 2,
        });

        await workspace.updateMetadata({
          config: {
            verification: {
              depth: 'deep',
            },
          },
        });

        const metadata = await workspace.getMetadata();
        const configManager = await ConfigManager.load({}, metadata);
        const values = await configManager.resolveEffectiveValues(
          'workspace',
          metadata
        );

        // Check sources
        const maxIter = values.get('defaultMaxIterations');
        expect(maxIter?.value).toBe(75);
        expect(maxIter?.source).toBe('project');

        const depth = values.get('verification.depth');
        expect(depth?.value).toBe('deep');
        expect(depth?.source).toBe('workspace');

        const autoVerify = values.get('verification.autoVerify');
        expect(autoVerify?.value).toBe(true);
        // With .default({}) on verification schema, project config includes verification
        // so autoVerify gets its default value from project layer, not default layer
        expect(autoVerify?.source).toBe('project');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should track sources for deeply nested configs', async () => {
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({
          claude: {
            command: 'custom-claude',
            args: ['--verbose'],
          },
        }),
        'utf-8'
      );

      process.chdir(testDir);

      try {
        const workspacePath = join(testDir, 'workspaces', 'test-ws');
        const workspace = await Workspace.init('test-ws', workspacePath, {
          maxIterations: 50,
          delay: 2,
          stagnationThreshold: 2,
        });

        await workspace.updateMetadata({
          config: {
            claude: {
              args: ['--quiet'],
            },
          },
        });

        const metadata = await workspace.getMetadata();
        const configManager = await ConfigManager.load({}, metadata);
        const values = await configManager.resolveEffectiveValues(
          'workspace',
          metadata
        );

        const claudeCommand = values.get('claude.command');
        expect(claudeCommand?.value).toBe('custom-claude');
        expect(claudeCommand?.source).toBe('project');

        const claudeArgs = values.get('claude.args');
        expect(claudeArgs?.value).toEqual(['--quiet']);
        expect(claudeArgs?.source).toBe('workspace');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle empty configs at all layers', async () => {
      await fs.writeFile(projectConfigPath, JSON.stringify({}), 'utf-8');

      process.chdir(testDir);

      try {
        const configManager = await ConfigManager.load();
        const config = configManager.getConfig();

        // Should all be defaults
        expect(config.maxIterations).toBe(50);
        expect(config.delay).toBe(2);
        expect(config.outputLevel).toBe('progress');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle partial configs across layers', async () => {
      // Project: verification and outputLevel
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({
          verification: {
            resumeOnFail: false,
          },
          outputLevel: 'quiet',
        }),
        'utf-8'
      );

      process.chdir(testDir);

      try {
        // Workspace: only verification.depth, maxIterations from init
        const workspacePath = join(testDir, 'workspaces', 'test-ws');
        const workspace = await Workspace.init('test-ws', workspacePath, {
          maxIterations: 75, // Top-level metadata
          delay: 2,
          stagnationThreshold: 2,
        });

        await workspace.updateMetadata({
          config: {
            verification: {
              depth: 'deep',
            },
          },
        });

        const metadata = await workspace.getMetadata();

        // CLI: only delay
        const configManager = await ConfigManager.load({ delay: 5 }, metadata);

        const config = configManager.getConfig();
        expect(config.maxIterations).toBe(75); // Workspace (from init)
        expect(config.delay).toBe(5); // CLI
        expect(config.verification.depth).toBe('deep'); // Workspace config
        expect(config.verification.resumeOnFail).toBe(false); // Project
        expect(config.outputLevel).toBe('quiet'); // Project
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle array merging across layers', async () => {
      // Project: claude.args
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({
          claude: {
            args: ['--dangerously-skip-permissions'],
          },
        }),
        'utf-8'
      );

      process.chdir(testDir);

      try {
        const configManager = await ConfigManager.load();
        const config = configManager.getConfig();

        expect(config.claudeArgs).toEqual(['--dangerously-skip-permissions']);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle boolean flag overrides correctly', async () => {
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({ colors: false }),
        'utf-8'
      );

      process.chdir(testDir);

      try {
        // CLI overrides to true
        const configManager = await ConfigManager.load({ colors: true });
        const config = configManager.getConfig();

        expect(config.colors).toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle enum value overrides', async () => {
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({
          outputLevel: 'quiet',
          verification: {
            depth: 'quick',
          },
        }),
        'utf-8'
      );

      process.chdir(testDir);

      try {
        const workspacePath = join(testDir, 'workspaces', 'test-ws');
        const workspace = await Workspace.init('test-ws', workspacePath, {
          maxIterations: 50,
          delay: 2,
          stagnationThreshold: 2,
        });

        await workspace.updateMetadata({
          config: {
            verification: {
              depth: 'deep',
            },
          },
        });

        const metadata = await workspace.getMetadata();
        const configManager = await ConfigManager.load(
          { output: 'verbose' },
          metadata
        );

        const config = configManager.getConfig();
        expect(config.outputLevel).toBe('verbose'); // CLI
        expect(config.verification.depth).toBe('deep'); // Workspace
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle CI/CD scenario (CLI-heavy overrides)', async () => {
      // Project has sane defaults
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({
          defaultMaxIterations: 50,
          outputLevel: 'progress',
        }),
        'utf-8'
      );

      process.chdir(testDir);

      try {
        // CI/CD overrides for automation
        const configManager = await ConfigManager.load({
          maxIterations: 10, // Quick run
          output: 'quiet', // Silent
          delay: 0, // No delay
        });

        const config = configManager.getConfig();
        expect(config.maxIterations).toBe(10);
        expect(config.outputLevel).toBe('quiet');
        expect(config.delay).toBe(0);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle workspace-specific overrides for critical tasks', async () => {
      // Project defaults
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify({
          verification: {
            depth: 'quick',
            maxAttempts: 1,
          },
        }),
        'utf-8'
      );

      process.chdir(testDir);

      try {
        // Critical workspace needs thorough verification
        const workspacePath = join(testDir, 'workspaces', 'critical-task');
        const workspace = await Workspace.init('critical-task', workspacePath, {
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
        expect(config.verification.depth).toBe('deep'); // Workspace override
        expect(config.verification.maxAttempts).toBe(5); // Workspace override
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});
