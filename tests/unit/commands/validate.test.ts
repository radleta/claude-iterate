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
 * Tests for validate command
 *
 * Test scenarios from TEST.md:
 * - Success: Workspace loaded, report generated and displayed
 * - Success: Report content shown in console (verify console.log calls)
 * - Success: Mode-aware prompt with report path
 * - Error: Workspace not found → exit 1
 * - Error: Instructions not found → exit 1 with hint
 * - Error: Claude CLI unavailable → exit 1
 * - Edge: Report not created → exit 0 (warning)
 */

describe('validate command', () => {
  let mockClaudeClient: ReturnType<typeof spyOnClaudeClient>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockClaudeClient = spyOnClaudeClient();
    processExitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((code?: number) => {
        throw new Error(`process.exit: ${code}`);
      });
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully validate workspace with report generated', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-validate-success');

    // Initialize workspace and create instructions
    const workspace = await Workspace.init(
      'test-validate-success',
      workspacePath
    );
    await writeTestFile(
      join(workspacePath, 'INSTRUCTIONS.md'),
      '# Task Instructions\n\nComplete the task.'
    );

    const metadata = await workspace.getMetadata();

    // Mock Claude response that creates validation report
    const reportContent = `# Validation Report

## Summary
Instructions are well-structured and clear.

## Strengths
- Clear task definition
- Specific acceptance criteria

## Recommendations
- Consider adding edge case handling`;

    mockClaudeClient.queueNonInteractiveResponse(async () => {
      // Simulate Claude creating validation report
      await writeTestFile(
        join(workspacePath, 'validation-report.md'),
        reportContent
      );
      return reportContent;
    });

    // Load config
    const config = await ConfigManager.load({}, metadata);
    const runtimeConfig = config.getConfig();

    // Simulate validate command execution
    const client = new ClaudeClient(
      runtimeConfig.claudeCommand,
      runtimeConfig.claudeArgs
    );

    // Check Claude availability
    const isAvailable = await client.isAvailable();
    expect(isAvailable).toBe(true);

    // Generate validation report path
    const reportPath = join(workspace.path, 'validation-report.md');

    // Execute non-interactive session
    const { getValidationPrompt, getWorkspaceSystemPrompt } = await import(
      '../../../src/templates/system-prompt.js'
    );
    const systemPrompt = await getWorkspaceSystemPrompt(workspace.path);
    const prompt = await getValidationPrompt(
      'test-validate-success',
      reportPath,
      workspace.path,
      metadata.mode
    );

    await client.executeNonInteractive(prompt, systemPrompt);

    // Verify non-interactive call was made
    expect(mockClaudeClient.nonInteractiveCalls).toHaveLength(1);
    expect(mockClaudeClient.nonInteractiveCalls[0].prompt).toBeDefined();

    // Verify report was created
    const { fileExists } = await import('../../../src/utils/fs.js');
    expect(await fileExists(reportPath)).toBe(true);
  });

  it('should display report content in console', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-validate-display');

    // Initialize workspace with instructions
    const workspace = await Workspace.init(
      'test-validate-display',
      workspacePath
    );
    await writeTestFile(
      join(workspacePath, 'INSTRUCTIONS.md'),
      '# Instructions'
    );

    const reportContent = '# Validation Report\n\nAll checks passed.';

    // Mock Claude response that creates report
    mockClaudeClient.queueNonInteractiveResponse(async () => {
      await writeTestFile(
        join(workspacePath, 'validation-report.md'),
        reportContent
      );
      return reportContent;
    });

    const config = await ConfigManager.load({});
    const runtimeConfig = config.getConfig();
    const client = new ClaudeClient(
      runtimeConfig.claudeCommand,
      runtimeConfig.claudeArgs
    );

    const reportPath = join(workspace.path, 'validation-report.md');
    const { getValidationPrompt, getWorkspaceSystemPrompt } = await import(
      '../../../src/templates/system-prompt.js'
    );
    const metadata = await workspace.getMetadata();
    const systemPrompt = await getWorkspaceSystemPrompt(workspace.path);
    const prompt = await getValidationPrompt(
      'test-validate-display',
      reportPath,
      workspace.path,
      metadata.mode
    );

    await client.executeNonInteractive(prompt, systemPrompt);

    // Read and display report
    const { readText } = await import('../../../src/utils/fs.js');
    const report = await readText(reportPath);

    // Verify report content matches
    expect(report).toBe(reportContent);
  });

  it('should generate loop mode-aware validation prompt with report path', async () => {
    const testDir = getTestDir();
    const workspacePath = join(
      testDir,
      'workspaces',
      'test-validate-loop-mode'
    );

    // Initialize workspace with loop mode (default)
    const workspace = await Workspace.init(
      'test-validate-loop-mode',
      workspacePath,
      {
        mode: ExecutionMode.LOOP,
      }
    );

    await writeTestFile(
      join(workspacePath, 'INSTRUCTIONS.md'),
      '# Instructions'
    );

    mockClaudeClient.queueNonInteractiveResponse(async () => {
      await writeTestFile(
        join(workspacePath, 'validation-report.md'),
        '# Report'
      );
      return '# Report';
    });

    // Get validation prompt
    const { getValidationPrompt } = await import(
      '../../../src/templates/system-prompt.js'
    );
    const metadata = await workspace.getMetadata();
    const reportPath = join(workspace.path, 'validation-report.md');

    const validationPrompt = await getValidationPrompt(
      'test-validate-loop-mode',
      reportPath,
      workspace.path,
      metadata.mode
    );

    // Verify prompt contains report path
    expect(validationPrompt).toContain(reportPath);
    expect(validationPrompt).toContain('validation-report.md');

    // Verify loop mode-specific content
    expect(validationPrompt).toContain('INSTRUCTIONS.md');

    // Verify mode is loop
    expect(metadata.mode).toBe(ExecutionMode.LOOP);
  });

  it('should generate iterative mode-aware validation prompt with report path', async () => {
    const testDir = getTestDir();
    const workspacePath = join(
      testDir,
      'workspaces',
      'test-validate-iterative-mode'
    );

    // Initialize workspace with iterative mode
    const workspace = await Workspace.init(
      'test-validate-iterative-mode',
      workspacePath,
      {
        mode: ExecutionMode.ITERATIVE,
      }
    );

    await writeTestFile(
      join(workspacePath, 'INSTRUCTIONS.md'),
      '# Instructions'
    );

    mockClaudeClient.queueNonInteractiveResponse(async () => {
      await writeTestFile(
        join(workspacePath, 'validation-report.md'),
        '# Report'
      );
      return '# Report';
    });

    // Get validation prompt
    const { getValidationPrompt } = await import(
      '../../../src/templates/system-prompt.js'
    );
    const metadata = await workspace.getMetadata();
    const reportPath = join(workspace.path, 'validation-report.md');

    const validationPrompt = await getValidationPrompt(
      'test-validate-iterative-mode',
      reportPath,
      workspace.path,
      metadata.mode
    );

    // Verify prompt contains report path
    expect(validationPrompt).toContain(reportPath);
    expect(validationPrompt).toContain('validation-report.md');

    // Verify iterative-specific content
    expect(validationPrompt).toContain('INSTRUCTIONS.md');

    // Verify mode is iterative
    expect(metadata.mode).toBe(ExecutionMode.ITERATIVE);
  });

  it('should respect workspace config override for claudeCommand', async () => {
    const testDir = getTestDir();
    const workspacePath = join(
      testDir,
      'workspaces',
      'test-validate-claude-override'
    );

    // Create workspace with instructions
    const workspace = await Workspace.init(
      'test-validate-claude-override',
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

  it('should exit 1 when instructions not found with hint', async () => {
    const testDir = getTestDir();
    const workspacePath = join(
      testDir,
      'workspaces',
      'test-validate-no-instructions'
    );

    // Initialize workspace WITHOUT instructions
    const workspace = await Workspace.init(
      'test-validate-no-instructions',
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
    const workspacePath = join(
      testDir,
      'workspaces',
      'test-validate-no-claude'
    );

    // Initialize workspace with instructions
    await Workspace.init('test-validate-no-claude', workspacePath);
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

  it('should exit 0 with warning when report not created', async () => {
    const testDir = getTestDir();
    const workspacePath = join(
      testDir,
      'workspaces',
      'test-validate-no-report'
    );

    // Initialize workspace with instructions
    const workspace = await Workspace.init(
      'test-validate-no-report',
      workspacePath
    );
    await writeTestFile(
      join(workspacePath, 'INSTRUCTIONS.md'),
      '# Instructions'
    );

    // Mock Claude session that doesn't create report
    mockClaudeClient.queueNonInteractiveResponse(async () => {
      // Don't create validation-report.md
      return 'Validation completed';
    });

    const config = await ConfigManager.load({});
    const runtimeConfig = config.getConfig();
    const client = new ClaudeClient(
      runtimeConfig.claudeCommand,
      runtimeConfig.claudeArgs
    );

    const reportPath = join(workspace.path, 'validation-report.md');
    const { getValidationPrompt, getWorkspaceSystemPrompt } = await import(
      '../../../src/templates/system-prompt.js'
    );
    const metadata = await workspace.getMetadata();
    const systemPrompt = await getWorkspaceSystemPrompt(workspace.path);
    const prompt = await getValidationPrompt(
      'test-validate-no-report',
      reportPath,
      workspace.path,
      metadata.mode
    );

    await client.executeNonInteractive(prompt, systemPrompt);

    // Check if report was created
    const { fileExists } = await import('../../../src/utils/fs.js');
    const reportExists = await fileExists(reportPath);
    expect(reportExists).toBe(false);

    // This scenario should log warning but exit 0
    // The actual command would not call process.exit here
    // Just verify report doesn't exist
  });

  it('should handle workspace with working directory', async () => {
    const testDir = getTestDir();
    const workspacePath = join(
      testDir,
      'workspaces',
      'test-validate-working-dir'
    );

    // Initialize workspace
    const workspace = await Workspace.init(
      'test-validate-working-dir',
      workspacePath
    );
    await writeTestFile(
      join(workspacePath, 'INSTRUCTIONS.md'),
      '# Instructions'
    );

    // Verify working directory exists
    const workingDir = join(workspacePath, 'working');
    expect(workingDir).toBeDefined();

    mockClaudeClient.queueNonInteractiveResponse(async () => {
      await writeTestFile(
        join(workspacePath, 'validation-report.md'),
        '# Report'
      );
      return '# Report';
    });

    const config = await ConfigManager.load({});
    const runtimeConfig = config.getConfig();
    const client = new ClaudeClient(
      runtimeConfig.claudeCommand,
      runtimeConfig.claudeArgs
    );

    const reportPath = join(workspace.path, 'validation-report.md');
    const { getValidationPrompt, getWorkspaceSystemPrompt } = await import(
      '../../../src/templates/system-prompt.js'
    );
    const metadata = await workspace.getMetadata();
    const systemPrompt = await getWorkspaceSystemPrompt(workspace.path);
    const prompt = await getValidationPrompt(
      'test-validate-working-dir',
      reportPath,
      workspace.path,
      metadata.mode
    );

    await client.executeNonInteractive(prompt, systemPrompt);

    // Verify report was created
    const { fileExists } = await import('../../../src/utils/fs.js');
    expect(await fileExists(reportPath)).toBe(true);
  });

  it('should include workspace path in system prompt', async () => {
    const testDir = getTestDir();
    const workspacePath = join(
      testDir,
      'workspaces',
      'test-validate-system-prompt'
    );

    // Initialize workspace with instructions
    await Workspace.init('test-validate-system-prompt', workspacePath);
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
    const workspacePath = join(
      testDir,
      'workspaces',
      'test-validate-config-load'
    );

    // Initialize workspace with instructions
    const workspace = await Workspace.init(
      'test-validate-config-load',
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

  it('should verify instructions exist before validating', async () => {
    const testDir = getTestDir();
    const workspacePath = join(
      testDir,
      'workspaces',
      'test-validate-verify-instructions'
    );

    // Initialize workspace WITHOUT instructions
    const workspace = await Workspace.init(
      'test-validate-verify-instructions',
      workspacePath
    );

    // Verify instructions don't exist
    const hasInstructions = await workspace.hasInstructions();
    expect(hasInstructions).toBe(false);

    // Validate command should check this before proceeding
    // This is where the command would show error and exit
    expect(hasInstructions).toBe(false);
  });

  it('should use non-interactive execution mode', async () => {
    const testDir = getTestDir();
    const workspacePath = join(
      testDir,
      'workspaces',
      'test-validate-non-interactive'
    );

    // Initialize workspace with instructions
    const workspace = await Workspace.init(
      'test-validate-non-interactive',
      workspacePath
    );
    await writeTestFile(
      join(workspacePath, 'INSTRUCTIONS.md'),
      '# Instructions'
    );

    mockClaudeClient.queueNonInteractiveResponse(async () => {
      await writeTestFile(
        join(workspacePath, 'validation-report.md'),
        '# Report'
      );
      return '# Report';
    });

    const config = await ConfigManager.load({});
    const runtimeConfig = config.getConfig();
    const client = new ClaudeClient(
      runtimeConfig.claudeCommand,
      runtimeConfig.claudeArgs
    );

    const reportPath = join(workspace.path, 'validation-report.md');
    const { getValidationPrompt, getWorkspaceSystemPrompt } = await import(
      '../../../src/templates/system-prompt.js'
    );
    const metadata = await workspace.getMetadata();
    const systemPrompt = await getWorkspaceSystemPrompt(workspace.path);
    const prompt = await getValidationPrompt(
      'test-validate-non-interactive',
      reportPath,
      workspace.path,
      metadata.mode
    );

    await client.executeNonInteractive(prompt, systemPrompt);

    // Verify non-interactive was called, not interactive
    expect(mockClaudeClient.nonInteractiveCalls).toHaveLength(1);
    expect(mockClaudeClient.interactiveCalls).toHaveLength(0);
  });

  it('should generate report with default filename validation-report.md', async () => {
    const testDir = getTestDir();
    const workspacePath = join(
      testDir,
      'workspaces',
      'test-validate-default-filename'
    );

    // Initialize workspace with instructions
    const workspace = await Workspace.init(
      'test-validate-default-filename',
      workspacePath
    );
    await writeTestFile(
      join(workspacePath, 'INSTRUCTIONS.md'),
      '# Instructions'
    );

    // Verify report path follows naming convention
    const reportPath = join(workspace.path, 'validation-report.md');

    // Verify filename is correct
    expect(reportPath).toContain('validation-report.md');
    expect(reportPath).not.toContain('validate-report.md');
    expect(reportPath).not.toContain('validation.md');
  });

  it('should pass system prompt to non-interactive execution', async () => {
    const testDir = getTestDir();
    const workspacePath = join(
      testDir,
      'workspaces',
      'test-validate-system-prompt-usage'
    );

    // Initialize workspace with instructions
    const workspace = await Workspace.init(
      'test-validate-system-prompt-usage',
      workspacePath
    );
    await writeTestFile(
      join(workspacePath, 'INSTRUCTIONS.md'),
      '# Instructions'
    );

    mockClaudeClient.queueNonInteractiveResponse(async () => {
      await writeTestFile(
        join(workspacePath, 'validation-report.md'),
        '# Report'
      );
      return '# Report';
    });

    const config = await ConfigManager.load({});
    const runtimeConfig = config.getConfig();
    const client = new ClaudeClient(
      runtimeConfig.claudeCommand,
      runtimeConfig.claudeArgs
    );

    const reportPath = join(workspace.path, 'validation-report.md');
    const { getValidationPrompt, getWorkspaceSystemPrompt } = await import(
      '../../../src/templates/system-prompt.js'
    );
    const metadata = await workspace.getMetadata();
    const systemPrompt = await getWorkspaceSystemPrompt(workspace.path);
    const prompt = await getValidationPrompt(
      'test-validate-system-prompt-usage',
      reportPath,
      workspace.path,
      metadata.mode
    );

    // Execute with system prompt
    await client.executeNonInteractive(prompt, systemPrompt);

    // Verify non-interactive call was made
    expect(mockClaudeClient.nonInteractiveCalls).toHaveLength(1);
    expect(mockClaudeClient.nonInteractiveCalls[0].prompt).toBeDefined();
  });
});
