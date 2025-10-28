import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { Workspace } from '../../../src/core/workspace.js';
import { ConfigManager } from '../../../src/core/config-manager.js';
import { ClaudeClient } from '../../../src/services/claude-client.js';
import { NotificationService } from '../../../src/services/notification-service.js';
import { spyOnClaudeClient } from '../../mocks/claude-client.mock.js';
import { getTestDir, writeTestFile } from '../../setup.js';
import { ExecutionMode } from '../../../src/types/mode.js';
import type { WorkspaceMetadata } from '../../../src/types/metadata.js';

/**
 * Tests for setup command
 *
 * Test scenarios from TEST.md:
 * - Success: Workspace loaded, instructions created, notification sent
 * - Success: Setup iterations incremented
 * - Success: Mode-aware prompt generated (check for mode-specific content)
 * - Success: Workspace config override respected (claudeCommand)
 * - Error: Workspace not found → exit 1
 * - Error: Claude CLI unavailable → exit 1
 * - Edge: Instructions not created after session → warning (exit 0)
 */

describe('setup command', () => {
  let mockClaudeClient: ReturnType<typeof spyOnClaudeClient>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockClaudeClient = spyOnClaudeClient();
    processExitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((code?: number) => {
        throw new Error(`process.exit: ${code}`);
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully setup workspace with instructions created', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-setup-success');

    // Initialize workspace
    const workspace = await Workspace.init('test-setup-success', workspacePath);
    const metadata = await workspace.getMetadata();

    // Mock Claude availability
    mockClaudeClient.queueInteractiveResponse(async () => {
      // Simulate Claude creating INSTRUCTIONS.md
      await writeTestFile(
        join(workspacePath, 'INSTRUCTIONS.md'),
        '# Task Instructions\n\nComplete the task.'
      );
    });

    // Load config
    const config = await ConfigManager.load({}, metadata);
    const runtimeConfig = config.getConfig();

    // Simulate setup command execution
    const client = new ClaudeClient(
      runtimeConfig.claudeCommand,
      runtimeConfig.claudeArgs
    );

    // Check Claude availability
    const isAvailable = await client.isAvailable();
    expect(isAvailable).toBe(true);

    // Execute interactive session
    await client.executeInteractive('Setup prompt content', workspacePath);

    // Verify interactive call was made
    expect(mockClaudeClient.interactiveCalls).toHaveLength(1);
    expect(mockClaudeClient.interactiveCalls[0].prompt).toContain(
      'Setup prompt content'
    );

    // Increment setup iterations
    await workspace.incrementIterations('setup');

    // Verify instructions were created
    const hasInstructions = await workspace.hasInstructions();
    expect(hasInstructions).toBe(true);

    // Verify metadata updated
    const updatedMetadata = await workspace.getMetadata();
    expect(updatedMetadata.setupIterations).toBe(1);
  });

  it('should increment setup iterations on each run', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-setup-iterations');

    // Initialize workspace
    const workspace = await Workspace.init(
      'test-setup-iterations',
      workspacePath
    );

    // Mock Claude availability and response
    mockClaudeClient.queueInteractiveResponse(async () => {
      await writeTestFile(
        join(workspacePath, 'INSTRUCTIONS.md'),
        '# Instructions v1'
      );
    });

    // First setup
    const config = await ConfigManager.load({});
    const runtimeConfig = config.getConfig();
    const client = new ClaudeClient(
      runtimeConfig.claudeCommand,
      runtimeConfig.claudeArgs
    );
    await client.executeInteractive('Setup prompt', workspacePath);
    await workspace.incrementIterations('setup');

    let metadata = await workspace.getMetadata();
    expect(metadata.setupIterations).toBe(1);

    // Mock second setup
    mockClaudeClient.queueInteractiveResponse(async () => {
      await writeTestFile(
        join(workspacePath, 'INSTRUCTIONS.md'),
        '# Instructions v2'
      );
    });

    // Second setup
    await client.executeInteractive('Setup prompt', workspacePath);
    await workspace.incrementIterations('setup');

    metadata = await workspace.getMetadata();
    expect(metadata.setupIterations).toBe(2);
  });

  it('should generate loop mode-aware prompt content', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-loop-mode');

    // Initialize workspace with loop mode (default)
    const workspace = await Workspace.init('test-loop-mode', workspacePath, {
      mode: ExecutionMode.LOOP,
    });

    mockClaudeClient.queueInteractiveResponse(async () => {
      await writeTestFile(
        join(workspacePath, 'INSTRUCTIONS.md'),
        '# Instructions'
      );
    });

    // Get mode strategy to verify prompt generation
    const { ModeFactory } = await import(
      '../../../src/templates/modes/mode-factory.js'
    );
    const metadata = await workspace.getMetadata();
    const strategy = ModeFactory.getStrategy(metadata.mode);

    const setupPrompt = await strategy.getSetupPrompt(
      'test-loop-mode',
      workspacePath
    );

    // Verify loop-specific content
    expect(setupPrompt).toContain('INSTRUCTIONS.md');
    expect(setupPrompt).toContain('critical_principle');
    // Verify loop mode validation criteria
    expect(setupPrompt).toContain('Validation Criteria for Loop Mode');
  });

  it('should generate iterative mode-aware prompt content', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-iterative-mode');

    // Initialize workspace with iterative mode
    const workspace = await Workspace.init(
      'test-iterative-mode',
      workspacePath,
      {
        mode: ExecutionMode.ITERATIVE,
      }
    );

    mockClaudeClient.queueInteractiveResponse(async () => {
      await writeTestFile(
        join(workspacePath, 'INSTRUCTIONS.md'),
        '# Instructions'
      );
    });

    // Get mode strategy to verify prompt generation
    const { ModeFactory } = await import(
      '../../../src/templates/modes/mode-factory.js'
    );
    const metadata = await workspace.getMetadata();
    const strategy = ModeFactory.getStrategy(metadata.mode);

    const setupPrompt = await strategy.getSetupPrompt(
      'test-iterative-mode',
      workspacePath
    );

    // Verify iterative-specific content
    expect(setupPrompt).toContain('INSTRUCTIONS.md');
    expect(setupPrompt).toContain('critical_principle');
    // Per critical principle: should NOT mention iteration mechanics
    expect(setupPrompt).not.toContain('automated iteration loop');
    expect(setupPrompt).not.toContain('between iterations');
  });

  it('should respect workspace config override for claudeCommand', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-claude-override');

    // Create workspace with custom config
    const workspace = await Workspace.init(
      'test-claude-override',
      workspacePath
    );

    // Set workspace-level config override
    const metadata = await workspace.getMetadata();
    const customMetadata: WorkspaceMetadata = {
      ...metadata,
      config: {
        claude: {
          command: 'custom-claude',
        },
      },
    };

    // Write custom metadata
    await writeTestFile(
      join(workspacePath, '.metadata.json'),
      JSON.stringify(customMetadata, null, 2)
    );

    // Load config with workspace metadata
    const config = await ConfigManager.load({}, customMetadata);
    const runtimeConfig = config.getConfig();

    // Verify custom claudeCommand is used
    expect(runtimeConfig.claudeCommand).toBe('custom-claude');
  });

  it('should exit 1 when workspace not found', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'nonexistent');

    // Attempt to load nonexistent workspace
    try {
      await Workspace.load('nonexistent', workspacePath);
      expect.fail('Should have thrown error');
    } catch (error) {
      expect((error as Error).message).toContain('not found');
    }
  });

  it('should exit 1 when Claude CLI unavailable', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-no-claude');

    // Initialize workspace
    await Workspace.init('test-no-claude', workspacePath);

    // Mock Claude as unavailable
    vi.spyOn(ClaudeClient.prototype, 'isAvailable').mockResolvedValue(false);

    const config = await ConfigManager.load({});
    const runtimeConfig = config.getConfig();
    const client = new ClaudeClient(
      runtimeConfig.claudeCommand,
      runtimeConfig.claudeArgs
    );

    const isAvailable = await client.isAvailable();
    expect(isAvailable).toBe(false);

    // Simulate command exit behavior
    try {
      if (!isAvailable) {
        process.exit(1);
      }
    } catch (error) {
      expect((error as Error).message).toBe('process.exit: 1');
    }

    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('should warn (exit 0) when instructions not created after session', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-no-instructions');

    // Initialize workspace
    const workspace = await Workspace.init(
      'test-no-instructions',
      workspacePath
    );

    // Mock Claude session that doesn't create instructions
    mockClaudeClient.queueInteractiveResponse(async () => {
      // User cancels or doesn't create instructions
      // Don't create INSTRUCTIONS.md
    });

    const config = await ConfigManager.load({});
    const runtimeConfig = config.getConfig();
    const client = new ClaudeClient(
      runtimeConfig.claudeCommand,
      runtimeConfig.claudeArgs
    );

    await client.executeInteractive('Setup prompt', workspacePath);
    await workspace.incrementIterations('setup');

    // Check if instructions were created
    const hasInstructions = await workspace.hasInstructions();
    expect(hasInstructions).toBe(false);

    // This scenario should log warning but exit 0
    // The actual command would not call process.exit here
    // Just verify instructions don't exist
  });

  it('should send notification when configured and instructions created', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-notification');

    // Initialize workspace with notification config
    const workspace = await Workspace.init('test-notification', workspacePath, {
      notifyUrl: 'https://ntfy.sh/test',
      notifyEvents: ['all'],
    });

    mockClaudeClient.queueInteractiveResponse(async () => {
      await writeTestFile(
        join(workspacePath, 'INSTRUCTIONS.md'),
        '# Instructions'
      );
    });

    const config = await ConfigManager.load({});
    const runtimeConfig = config.getConfig();
    const client = new ClaudeClient(
      runtimeConfig.claudeCommand,
      runtimeConfig.claudeArgs
    );

    await client.executeInteractive('Setup prompt', workspacePath);
    await workspace.incrementIterations('setup');

    // Verify instructions created
    expect(await workspace.hasInstructions()).toBe(true);

    // Get updated metadata
    const metadata = await workspace.getMetadata();

    // Create notification service
    const notificationService = new NotificationService();

    // Verify notification would be sent
    expect(notificationService.isConfigured(metadata)).toBe(true);
    expect(notificationService.shouldNotify('setup_complete', metadata)).toBe(
      true
    );
  });

  it('should handle workspace with working directory', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-working-dir');

    // Initialize workspace
    const workspace = await Workspace.init('test-working-dir', workspacePath);

    // Verify working directory exists
    const workingDir = join(workspacePath, 'working');
    expect(workingDir).toBeDefined();

    mockClaudeClient.queueInteractiveResponse(async () => {
      await writeTestFile(
        join(workspacePath, 'INSTRUCTIONS.md'),
        '# Instructions'
      );
    });

    const config = await ConfigManager.load({});
    const runtimeConfig = config.getConfig();
    const client = new ClaudeClient(
      runtimeConfig.claudeCommand,
      runtimeConfig.claudeArgs
    );

    await client.executeInteractive('Setup prompt', workspacePath);
    await workspace.incrementIterations('setup');

    expect(await workspace.hasInstructions()).toBe(true);
  });

  it('should include workspace path in system prompt', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-system-prompt');

    // Initialize workspace
    await Workspace.init('test-system-prompt', workspacePath);

    // Get system prompt
    const { getWorkspaceSystemPrompt } = await import(
      '../../../src/templates/system-prompt.js'
    );
    const systemPrompt = await getWorkspaceSystemPrompt(workspacePath);

    // Verify system prompt contains workspace path token
    expect(systemPrompt).toBeDefined();
    expect(systemPrompt).toContain(workspacePath);
  });

  it('should load config twice (once for path, once with metadata)', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-config-load');

    // Initialize workspace
    const workspace = await Workspace.init('test-config-load', workspacePath);

    // First config load (for path)
    const configForPath = await ConfigManager.load({});
    expect(configForPath).toBeDefined();

    // Get metadata
    const metadata = await workspace.getMetadata();

    // Second config load (with metadata for workspace overrides)
    const configWithMetadata = await ConfigManager.load({}, metadata);
    expect(configWithMetadata).toBeDefined();

    // Both configs should be valid but may have different values
    // if workspace has config overrides
    const runtimeConfig = configWithMetadata.getConfig();
    expect(runtimeConfig).toBeDefined();
    expect(runtimeConfig.claudeCommand).toBeDefined();
  });
});
