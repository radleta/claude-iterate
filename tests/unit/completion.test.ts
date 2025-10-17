import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { CompletionDetector } from '../../src/core/completion.js';
import { ExecutionMode } from '../../src/types/mode.js';
import { WorkspaceStatus } from '../../src/types/status.js';
import { createTestWorkspace, writeTestFile } from '../setup.js';

describe('CompletionDetector', () => {
  it('should detect completion from .status.json', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const statusPath = join(workspacePath, '.status.json');

    const status: WorkspaceStatus = {
      complete: true,
      progress: { completed: 60, total: 60 },
    };

    await writeTestFile(statusPath, JSON.stringify(status));

    const isComplete = await CompletionDetector.isComplete(
      workspacePath,
      ExecutionMode.LOOP
    );

    expect(isComplete).toBe(true);
  });

  it('should return false when .status.json has complete: false', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const statusPath = join(workspacePath, '.status.json');

    const status: WorkspaceStatus = {
      complete: false,
      progress: { completed: 35, total: 60 },
    };

    await writeTestFile(statusPath, JSON.stringify(status));

    const isComplete = await CompletionDetector.isComplete(
      workspacePath,
      ExecutionMode.LOOP
    );

    expect(isComplete).toBe(false);
  });

  it('should return false when .status.json missing', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');

    const isComplete = await CompletionDetector.isComplete(
      workspacePath,
      ExecutionMode.LOOP
    );

    expect(isComplete).toBe(false);
  });

  it('should get remaining count from .status.json', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const statusPath = join(workspacePath, '.status.json');

    const status: WorkspaceStatus = {
      complete: false,
      progress: { completed: 35, total: 60 },
    };

    await writeTestFile(statusPath, JSON.stringify(status));

    const remaining = await CompletionDetector.getRemainingCount(
      workspacePath,
      ExecutionMode.LOOP
    );

    expect(remaining).toBe(25);
  });

  it('should return null for remaining count when .status.json missing', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');

    const remaining = await CompletionDetector.getRemainingCount(
      workspacePath,
      ExecutionMode.LOOP
    );

    expect(remaining).toBe(null);
  });

  it('should return null for remaining count when .status.json has no total', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const statusPath = join(workspacePath, '.status.json');

    const status: WorkspaceStatus = {
      complete: false,
      progress: { completed: 0, total: 0 },
    };

    await writeTestFile(statusPath, JSON.stringify(status));

    const remaining = await CompletionDetector.getRemainingCount(
      workspacePath,
      ExecutionMode.LOOP
    );

    expect(remaining).toBe(null);
  });

  it('should get completion status', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const statusPath = join(workspacePath, '.status.json');

    const status: WorkspaceStatus = {
      complete: true,
      progress: { completed: 60, total: 60 },
    };

    await writeTestFile(statusPath, JSON.stringify(status));

    const completionStatus = await CompletionDetector.getStatus(
      workspacePath,
      ExecutionMode.LOOP
    );

    expect(completionStatus.isComplete).toBe(true);
    expect(completionStatus.hasTodo).toBe(true);
    expect(completionStatus.hasInstructions).toBe(true);
    expect(completionStatus.remainingCount).toBe(0);
  });

  it('should work with iterative mode', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const statusPath = join(workspacePath, '.status.json');

    const status: WorkspaceStatus = {
      complete: true,
      progress: { completed: 12, total: 12 },
    };

    await writeTestFile(statusPath, JSON.stringify(status));

    const isComplete = await CompletionDetector.isComplete(
      workspacePath,
      ExecutionMode.ITERATIVE
    );

    expect(isComplete).toBe(true);
  });
});
