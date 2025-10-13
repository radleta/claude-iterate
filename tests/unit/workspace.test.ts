import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { Workspace } from '../../src/core/workspace.js';
import { ExecutionMode } from '../../src/types/mode.js';
import { getTestDir, writeTestFile } from '../setup.js';

describe('Workspace', () => {
  it('should initialize a new workspace', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-init');

    const workspace = await Workspace.init('test-init', workspacePath);

    expect(workspace.name).toBe('test-init');
    expect(workspace.path).toBe(workspacePath);

    const metadata = await workspace.getMetadata();
    expect(metadata.name).toBe('test-init');
    expect(metadata.status).toBe('in_progress');
  });

  it('should create workspace with custom options', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-options');

    const workspace = await Workspace.init('test-options', workspacePath, {
      maxIterations: 100,
      delay: 5,
      notifyUrl: 'https://ntfy.sh/test',
    });

    const metadata = await workspace.getMetadata();
    expect(metadata.maxIterations).toBe(100);
    expect(metadata.delay).toBe(5);
    expect(metadata.notifyUrl).toBe('https://ntfy.sh/test');
  });

  it('should throw error if workspace already exists', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-exists');

    await Workspace.init('test-exists', workspacePath);

    await expect(Workspace.init('test-exists', workspacePath)).rejects.toThrow(
      'already exists'
    );
  });

  it('should load existing workspace', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-load');

    await Workspace.init('test-load', workspacePath);

    const workspace = await Workspace.load('test-load', workspacePath);

    expect(workspace.name).toBe('test-load');
    expect(workspace.path).toBe(workspacePath);
  });

  it('should throw error if workspace not found', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'nonexistent');

    await expect(Workspace.load('nonexistent', workspacePath)).rejects.toThrow(
      'not found'
    );
  });

  it('should check if workspace is complete', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-complete');

    const workspace = await Workspace.init('test-complete', workspacePath);

    expect(await workspace.isComplete()).toBe(false);

    // Create TODO with completion marker
    const todoPath = join(workspacePath, 'TODO.md');
    await writeTestFile(todoPath, '- Remaining: 0');

    expect(await workspace.isComplete()).toBe(true);
  });

  it('should get completion status', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-status');

    const workspace = await Workspace.init('test-status', workspacePath);

    await writeTestFile(join(workspacePath, 'TODO.md'), '- Remaining: 5');
    await writeTestFile(join(workspacePath, 'INSTRUCTIONS.md'), 'Instructions');

    const status = await workspace.getCompletionStatus();

    expect(status.isComplete).toBe(false);
    expect(status.hasTodo).toBe(true);
    expect(status.hasInstructions).toBe(true);
    expect(status.remainingCount).toBe(5);
  });

  it('should get remaining count', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-count');

    const workspace = await Workspace.init('test-count', workspacePath);

    await writeTestFile(join(workspacePath, 'TODO.md'), '- Remaining: 23');

    const count = await workspace.getRemainingCount();
    expect(count).toBe(23);
  });

  it('should check if instructions exist', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-instructions');

    const workspace = await Workspace.init('test-instructions', workspacePath);

    expect(await workspace.hasInstructions()).toBe(false);

    await writeTestFile(join(workspacePath, 'INSTRUCTIONS.md'), 'Instructions');

    expect(await workspace.hasInstructions()).toBe(true);
  });

  it('should read and write instructions', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-rw-instructions');

    const workspace = await Workspace.init('test-rw-instructions', workspacePath);

    await workspace.writeInstructions('# My Instructions\n\nDo this task.');

    const instructions = await workspace.getInstructions();
    expect(instructions).toContain('My Instructions');
    expect(instructions).toContain('Do this task');
  });

  it('should increment iterations', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-iterations');

    const workspace = await Workspace.init('test-iterations', workspacePath);

    await workspace.incrementIterations('setup');
    let metadata = await workspace.getMetadata();
    expect(metadata.totalIterations).toBe(1);
    expect(metadata.setupIterations).toBe(1);

    await workspace.incrementIterations('execution');
    metadata = await workspace.getMetadata();
    expect(metadata.totalIterations).toBe(2);
    expect(metadata.executionIterations).toBe(1);
  });

  it('should mark as completed', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-mark-complete');

    const workspace = await Workspace.init('test-mark-complete', workspacePath);

    await workspace.markCompleted();

    const metadata = await workspace.getMetadata();
    expect(metadata.status).toBe('completed');
  });

  it('should mark as error', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-mark-error');

    const workspace = await Workspace.init('test-mark-error', workspacePath);

    await workspace.markError();

    const metadata = await workspace.getMetadata();
    expect(metadata.status).toBe('error');
  });

  it('should mark setup as complete', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-setup-complete');

    const workspace = await Workspace.init('test-setup-complete', workspacePath);

    await workspace.markSetupComplete();

    const metadata = await workspace.getMetadata();
    expect(metadata.setupComplete).toBe(true);
  });

  it('should reset iterations', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-reset');

    const workspace = await Workspace.init('test-reset', workspacePath);

    await workspace.incrementIterations('setup');
    await workspace.incrementIterations('execution');
    await workspace.incrementIterations('execution');

    await workspace.resetIterations();

    const metadata = await workspace.getMetadata();
    expect(metadata.totalIterations).toBe(0);
    expect(metadata.setupIterations).toBe(0);
    expect(metadata.executionIterations).toBe(0);
  });

  it('should get workspace info', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-info');

    const workspace = await Workspace.init('test-info', workspacePath);
    await writeTestFile(join(workspacePath, 'INSTRUCTIONS.md'), 'Instructions');

    const info = await workspace.getInfo();

    expect(info.name).toBe('test-info');
    expect(info.path).toBe(workspacePath);
    expect(info.status).toBe('in_progress');
    expect(info.hasInstructions).toBe(true);
    expect(info.created).toBeDefined();
  });

  it('should get correct paths', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-paths');

    const workspace = await Workspace.init('test-paths', workspacePath);

    expect(workspace.getTodoPath()).toBe(join(workspacePath, 'TODO.md'));
    expect(workspace.getWorkingDir()).toBe(join(workspacePath, 'working'));

    const instructionsPath = await workspace.getInstructionsPath();
    expect(instructionsPath).toBe(join(workspacePath, 'INSTRUCTIONS.md'));
  });

  // Mode-specific tests
  it('should initialize with loop mode by default', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-default-mode');

    const workspace = await Workspace.init('test-default-mode', workspacePath);
    const metadata = await workspace.getMetadata();

    expect(metadata.mode).toBe(ExecutionMode.LOOP);
  });

  it('should initialize with iterative mode when specified', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-iterative-mode');

    const workspace = await Workspace.init('test-iterative-mode', workspacePath, {
      mode: ExecutionMode.ITERATIVE,
    });
    const metadata = await workspace.getMetadata();

    expect(metadata.mode).toBe(ExecutionMode.ITERATIVE);
  });

  it('should use mode-specific completion detection for loop mode', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-loop-completion');

    const workspace = await Workspace.init('test-loop-completion', workspacePath, {
      mode: ExecutionMode.LOOP,
    });

    await writeTestFile(join(workspacePath, 'TODO.md'), 'Remaining: 0');

    const isComplete = await workspace.isComplete();
    expect(isComplete).toBe(true);
  });

  it('should use mode-specific completion detection for iterative mode', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-iterative-completion');

    const workspace = await Workspace.init('test-iterative-completion', workspacePath, {
      mode: ExecutionMode.ITERATIVE,
    });

    await writeTestFile(
      join(workspacePath, 'TODO.md'),
      '- [x] Done\n- [x] Also done'
    );

    const isComplete = await workspace.isComplete();
    expect(isComplete).toBe(true);
  });

  it('should get correct remaining count for loop mode', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-loop-remaining');

    const workspace = await Workspace.init('test-loop-remaining', workspacePath, {
      mode: ExecutionMode.LOOP,
    });

    await writeTestFile(join(workspacePath, 'TODO.md'), 'Remaining: 5');

    const count = await workspace.getRemainingCount();
    expect(count).toBe(5);
  });

  it('should get correct remaining count for iterative mode', async () => {
    const testDir = getTestDir();
    const workspacePath = join(testDir, 'workspaces', 'test-iterative-remaining');

    const workspace = await Workspace.init('test-iterative-remaining', workspacePath, {
      mode: ExecutionMode.ITERATIVE,
    });

    await writeTestFile(
      join(workspacePath, 'TODO.md'),
      '- [x] Item 1\n- [ ] Item 2\n- [ ] Item 3'
    );

    const count = await workspace.getRemainingCount();
    expect(count).toBe(2);
  });
});
