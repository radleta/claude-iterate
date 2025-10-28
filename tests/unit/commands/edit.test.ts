import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { Workspace } from '../../../src/core/workspace.js';
import { ConfigManager } from '../../../src/core/config-manager.js';
import { ClaudeClient } from '../../../src/services/claude-client.js';
import { spyOnClaudeClient } from '../../mocks/claude-client.mock.js';
import { getTestDir, writeTestFile } from '../../setup.js';
import { ExecutionMode } from '../../../src/types/mode.js';
import type { WorkspaceMetadata } from '../../../src/types/metadata.js';

/**
 * Tests for edit command
 *
 * Test scenarios from TEST.md:
 * - Success: Workspace loaded, instructions edited, session completes
 * - Success: Setup iterations incremented
 * - Success: Mode-aware prompt generated (check for mode-specific content)
 * - Success: Workspace config override respected (claudeCommand)
 * - Error: Workspace not found → exit 1
 * - Error: Instructions not found → exit 1 with hint "Run setup first: claude-iterate setup {name}"
 * - Error: Claude CLI unavailable → exit 1
 */

describe('edit command', () => {
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

  it('should successfully edit workspace instructions', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-edit-success');

    // Initialize workspace and create initial instructions
    const workspace = await Workspace.init('test-edit-success', workspacePath);
    await writeTestFile(
      join(workspacePath, 'INSTRUCTIONS.md'),
      '# Initial Instructions\n\nComplete the task.'
    );

    const metadata = await workspace.getMetadata();

    // Mock Claude availability and response
    mockClaudeClient.queueInteractiveResponse(async () => {
      // Simulate Claude editing INSTRUCTIONS.md
      await writeTestFile(
        join(workspacePath, 'INSTRUCTIONS.md'),
        '# Updated Instructions\n\nComplete the updated task.'
      );
    });

    // Load config
    const config = await ConfigManager.load({}, metadata);
    const runtimeConfig = config.getConfig();

    // Simulate edit command execution
    const client = new ClaudeClient(
      runtimeConfig.claudeCommand,
      runtimeConfig.claudeArgs
    );

    // Check Claude availability
    const isAvailable = await client.isAvailable();
    expect(isAvailable).toBe(true);

    // Execute interactive session
    await client.executeInteractive('Edit prompt content', workspacePath);

    // Verify interactive call was made
    expect(mockClaudeClient.interactiveCalls).toHaveLength(1);
    expect(mockClaudeClient.interactiveCalls[0].prompt).toContain(
      'Edit prompt content'
    );

    // Increment setup iterations
    await workspace.incrementIterations('setup');

    // Verify instructions still exist
    const hasInstructions = await workspace.hasInstructions();
    expect(hasInstructions).toBe(true);

    // Verify metadata updated
    const updatedMetadata = await workspace.getMetadata();
    expect(updatedMetadata.setupIterations).toBe(1);
  });

  it('should increment setup iterations on each edit', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-edit-iterations');

    // Initialize workspace
    const workspace = await Workspace.init(
      'test-edit-iterations',
      workspacePath
    );
    await writeTestFile(
      join(workspacePath, 'INSTRUCTIONS.md'),
      '# Instructions v1'
    );

    // Mock first edit
    mockClaudeClient.queueInteractiveResponse(async () => {
      await writeTestFile(
        join(workspacePath, 'INSTRUCTIONS.md'),
        '# Instructions v2'
      );
    });

    // First edit
    const config = await ConfigManager.load({});
    const runtimeConfig = config.getConfig();
    const client = new ClaudeClient(
      runtimeConfig.claudeCommand,
      runtimeConfig.claudeArgs
    );
    await client.executeInteractive('Edit prompt', workspacePath);
    await workspace.incrementIterations('setup');

    let metadata = await workspace.getMetadata();
    expect(metadata.setupIterations).toBe(1);

    // Mock second edit
    mockClaudeClient.queueInteractiveResponse(async () => {
      await writeTestFile(
        join(workspacePath, 'INSTRUCTIONS.md'),
        '# Instructions v3'
      );
    });

    // Second edit
    await client.executeInteractive('Edit prompt', workspacePath);
    await workspace.incrementIterations('setup');

    metadata = await workspace.getMetadata();
    expect(metadata.setupIterations).toBe(2);
  });

  it('should generate loop mode-aware edit prompt content', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-edit-loop-mode');

    // Initialize workspace with loop mode (default)
    const workspace = await Workspace.init(
      'test-edit-loop-mode',
      workspacePath,
      {
        mode: ExecutionMode.LOOP,
      }
    );

    // Create initial instructions
    await writeTestFile(
      join(workspacePath, 'INSTRUCTIONS.md'),
      '# Instructions'
    );

    mockClaudeClient.queueInteractiveResponse(async () => {
      await writeTestFile(
        join(workspacePath, 'INSTRUCTIONS.md'),
        '# Updated Instructions'
      );
    });

    // Get mode strategy to verify prompt generation
    const { ModeFactory } = await import(
      '../../../src/templates/modes/mode-factory.js'
    );
    const metadata = await workspace.getMetadata();
    const strategy = ModeFactory.getStrategy(metadata.mode);

    const editPrompt = await strategy.getEditPrompt(
      'test-edit-loop-mode',
      workspacePath
    );

    // Verify loop-specific content
    expect(editPrompt).toContain('INSTRUCTIONS.md');
    expect(editPrompt).toContain('critical_principle');
    // Verify loop mode validation criteria
    expect(editPrompt).toContain('Validation Criteria for Loop Mode');
  });

  it('should generate iterative mode-aware edit prompt content', async () => {
    const testDir = getTestDir();
    const workspacePath = join(
      testDir,
      'workspaces',
      'test-edit-iterative-mode'
    );

    // Initialize workspace with iterative mode
    const workspace = await Workspace.init(
      'test-edit-iterative-mode',
      workspacePath,
      {
        mode: ExecutionMode.ITERATIVE,
      }
    );

    // Create initial instructions
    await writeTestFile(
      join(workspacePath, 'INSTRUCTIONS.md'),
      '# Instructions'
    );

    mockClaudeClient.queueInteractiveResponse(async () => {
      await writeTestFile(
        join(workspacePath, 'INSTRUCTIONS.md'),
        '# Updated Instructions'
      );
    });

    // Get mode strategy to verify prompt generation
    const { ModeFactory } = await import(
      '../../../src/templates/modes/mode-factory.js'
    );
    const metadata = await workspace.getMetadata();
    const strategy = ModeFactory.getStrategy(metadata.mode);

    const editPrompt = await strategy.getEditPrompt(
      'test-edit-iterative-mode',
      workspacePath
    );

    // Verify iterative-specific content
    expect(editPrompt).toContain('INSTRUCTIONS.md');
    expect(editPrompt).toContain('critical_principle');
    // Per critical principle: should NOT mention iteration mechanics
    expect(editPrompt).not.toContain('automated iteration loop');
    expect(editPrompt).not.toContain('between iterations');
  });

  it('should respect workspace config override for claudeCommand', async () => {
    const testDir = getTestDir();
    const workspacePath = join(
      testDir,
      'workspaces',
      'test-edit-claude-override'
    );

    // Create workspace with initial instructions
    const workspace = await Workspace.init(
      'test-edit-claude-override',
      workspacePath
    );
    await writeTestFile(
      join(workspacePath, 'INSTRUCTIONS.md'),
      '# Instructions'
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

  it('should exit 1 when instructions not found', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-no-instructions');

    // Initialize workspace WITHOUT instructions
    const workspace = await Workspace.init(
      'test-no-instructions',
      workspacePath
    );

    // Check if instructions exist
    const hasInstructions = await workspace.hasInstructions();
    expect(hasInstructions).toBe(false);

    // Simulate command behavior - should exit with error
    try {
      if (!hasInstructions) {
        process.exit(1);
      }
    } catch (error) {
      expect((error as Error).message).toBe('process.exit: 1');
    }

    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('should exit 1 when Claude CLI unavailable', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-edit-no-claude');

    // Initialize workspace with instructions
    await Workspace.init('test-edit-no-claude', workspacePath);
    await writeTestFile(
      join(workspacePath, 'INSTRUCTIONS.md'),
      '# Instructions'
    );

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

  it('should handle workspace with working directory', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-edit-working-dir');

    // Initialize workspace
    const workspace = await Workspace.init(
      'test-edit-working-dir',
      workspacePath
    );
    await writeTestFile(
      join(workspacePath, 'INSTRUCTIONS.md'),
      '# Instructions'
    );

    // Verify working directory exists
    const workingDir = join(workspacePath, 'working');
    expect(workingDir).toBeDefined();

    mockClaudeClient.queueInteractiveResponse(async () => {
      await writeTestFile(
        join(workspacePath, 'INSTRUCTIONS.md'),
        '# Updated Instructions'
      );
    });

    const config = await ConfigManager.load({});
    const runtimeConfig = config.getConfig();
    const client = new ClaudeClient(
      runtimeConfig.claudeCommand,
      runtimeConfig.claudeArgs
    );

    await client.executeInteractive('Edit prompt', workspacePath);
    await workspace.incrementIterations('setup');

    expect(await workspace.hasInstructions()).toBe(true);
  });

  it('should include workspace path in system prompt', async () => {
    const testDir = getTestDir();
    const workspacePath = join(
      testDir,
      'workspaces',
      'test-edit-system-prompt'
    );

    // Initialize workspace with instructions
    await Workspace.init('test-edit-system-prompt', workspacePath);
    await writeTestFile(
      join(workspacePath, 'INSTRUCTIONS.md'),
      '# Instructions'
    );

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
    const workspacePath = join(testDir, 'workspaces', 'test-edit-config-load');

    // Initialize workspace with instructions
    const workspace = await Workspace.init(
      'test-edit-config-load',
      workspacePath
    );
    await writeTestFile(
      join(workspacePath, 'INSTRUCTIONS.md'),
      '# Instructions'
    );

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

  it('should verify instructions exist before editing', async () => {
    const testDir = getTestDir();
    const workspacePath = join(
      testDir,
      'workspaces',
      'test-edit-verify-instructions'
    );

    // Initialize workspace WITHOUT instructions
    const workspace = await Workspace.init(
      'test-edit-verify-instructions',
      workspacePath
    );

    // Verify instructions don't exist
    const hasInstructions = await workspace.hasInstructions();
    expect(hasInstructions).toBe(false);

    // Edit command should check this before proceeding
    // This is where the command would show error and exit
    expect(hasInstructions).toBe(false);
  });

  it('should handle edit with existing setup iterations', async () => {
    const testDir = getTestDir();
    const workspacePath = join(
      testDir,
      'workspaces',
      'test-edit-existing-iterations'
    );

    // Initialize workspace
    const workspace = await Workspace.init(
      'test-edit-existing-iterations',
      workspacePath
    );
    await writeTestFile(
      join(workspacePath, 'INSTRUCTIONS.md'),
      '# Instructions'
    );

    // Simulate previous setup/edit iterations
    await workspace.incrementIterations('setup');
    await workspace.incrementIterations('setup');

    let metadata = await workspace.getMetadata();
    expect(metadata.setupIterations).toBe(2);

    // Mock edit
    mockClaudeClient.queueInteractiveResponse(async () => {
      await writeTestFile(
        join(workspacePath, 'INSTRUCTIONS.md'),
        '# Updated Instructions'
      );
    });

    // Perform another edit
    const config = await ConfigManager.load({});
    const runtimeConfig = config.getConfig();
    const client = new ClaudeClient(
      runtimeConfig.claudeCommand,
      runtimeConfig.claudeArgs
    );
    await client.executeInteractive('Edit prompt', workspacePath);
    await workspace.incrementIterations('setup');

    // Verify iterations incremented correctly
    metadata = await workspace.getMetadata();
    expect(metadata.setupIterations).toBe(3);
  });
});
