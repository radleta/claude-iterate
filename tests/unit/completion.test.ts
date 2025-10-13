import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { CompletionDetector } from '../../src/core/completion.js';
import { ExecutionMode } from '../../src/types/mode.js';
import { createTestWorkspace, writeTestFile } from '../setup.js';

describe('CompletionDetector', () => {
  it('should detect completion with "Remaining: 0"', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const todoPath = join(workspacePath, 'TODO.md');

    await writeTestFile(todoPath, `
# TODO

## Progress
- Remaining: 0
    `);

    const markers = ['Remaining: 0'];
    const isComplete = await CompletionDetector.isComplete(workspacePath, ExecutionMode.LOOP, markers);

    expect(isComplete).toBe(true);
  });

  it('should detect completion with "**Remaining**: 0"', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const todoPath = join(workspacePath, 'TODO.md');

    await writeTestFile(todoPath, `
# TODO

- **Remaining**: 0
    `);

    const markers = ['**Remaining**: 0'];
    const isComplete = await CompletionDetector.isComplete(workspacePath, ExecutionMode.LOOP, markers);

    expect(isComplete).toBe(true);
  });

  it('should detect completion with "TASK COMPLETE"', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const todoPath = join(workspacePath, 'TODO.md');

    await writeTestFile(todoPath, `
# TODO

✅ TASK COMPLETE

All items processed successfully.
    `);

    const markers = ['TASK COMPLETE'];
    const isComplete = await CompletionDetector.isComplete(workspacePath, ExecutionMode.LOOP, markers);

    expect(isComplete).toBe(true);
  });

  it('should not detect completion when not complete', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const todoPath = join(workspacePath, 'TODO.md');

    await writeTestFile(todoPath, `
# TODO

- Remaining: 5

Still working on it...
    `);

    const markers = ['Remaining: 0', 'TASK COMPLETE'];
    const isComplete = await CompletionDetector.isComplete(workspacePath, ExecutionMode.LOOP, markers);

    expect(isComplete).toBe(false);
  });

  it('should return false if TODO.md does not exist', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');

    const markers = ['Remaining: 0'];
    const isComplete = await CompletionDetector.isComplete(workspacePath, ExecutionMode.LOOP, markers);

    expect(isComplete).toBe(false);
  });

  it('should extract remaining count', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const todoPath = join(workspacePath, 'TODO.md');

    await writeTestFile(todoPath, `
# TODO

- Remaining: 42
    `);

    const count = await CompletionDetector.getRemainingCount(workspacePath, ExecutionMode.LOOP);

    expect(count).toBe(42);
  });

  it('should extract remaining count from bold markdown', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const todoPath = join(workspacePath, 'TODO.md');

    await writeTestFile(todoPath, `
# TODO

- **Remaining**: 15
    `);

    const count = await CompletionDetector.getRemainingCount(workspacePath, ExecutionMode.LOOP);

    expect(count).toBe(15);
  });

  it('should handle case-insensitive remaining count', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const todoPath = join(workspacePath, 'TODO.md');

    await writeTestFile(todoPath, `
# TODO

- remaining: 7
    `);

    const count = await CompletionDetector.getRemainingCount(workspacePath, ExecutionMode.LOOP);

    expect(count).toBe(7);
  });

  it('should return null if no remaining count found', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const todoPath = join(workspacePath, 'TODO.md');

    await writeTestFile(todoPath, `
# TODO

Working on tasks...
    `);

    const count = await CompletionDetector.getRemainingCount(workspacePath, ExecutionMode.LOOP);

    expect(count).toBe(null);
  });

  it('should check if TODO.md exists', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');

    expect(await CompletionDetector.hasTodo(workspacePath)).toBe(false);

    await writeTestFile(join(workspacePath, 'TODO.md'), 'Content');

    expect(await CompletionDetector.hasTodo(workspacePath)).toBe(true);
  });

  it('should check if INSTRUCTIONS.md exists', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');

    expect(await CompletionDetector.hasInstructions(workspacePath)).toBe(false);

    await writeTestFile(join(workspacePath, 'INSTRUCTIONS.md'), 'Content');

    expect(await CompletionDetector.hasInstructions(workspacePath)).toBe(true);
  });

  it('should get full status', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');

    await writeTestFile(join(workspacePath, 'TODO.md'), '- Remaining: 0');
    await writeTestFile(join(workspacePath, 'INSTRUCTIONS.md'), 'Instructions');

    const status = await CompletionDetector.getStatus(workspacePath, ExecutionMode.LOOP, ['Remaining: 0']);

    expect(status.isComplete).toBe(true);
    expect(status.hasTodo).toBe(true);
    expect(status.hasInstructions).toBe(true);
    expect(status.remainingCount).toBe(0);
  });

  // Iterative mode tests
  it('should detect iterative mode completion with all checkboxes checked', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const todoPath = join(workspacePath, 'TODO.md');

    await writeTestFile(todoPath, `
# TODO

- [x] Task 1
- [x] Task 2
- [x] Task 3
    `);

    const isComplete = await CompletionDetector.isComplete(
      workspacePath,
      ExecutionMode.ITERATIVE
    );

    expect(isComplete).toBe(true);
  });

  it('should not detect iterative mode completion with unchecked items', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const todoPath = join(workspacePath, 'TODO.md');

    await writeTestFile(todoPath, `
# TODO

- [x] Task 1
- [ ] Task 2
- [ ] Task 3
    `);

    const isComplete = await CompletionDetector.isComplete(
      workspacePath,
      ExecutionMode.ITERATIVE
    );

    expect(isComplete).toBe(false);
  });

  it('should get remaining count for iterative mode', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const todoPath = join(workspacePath, 'TODO.md');

    await writeTestFile(todoPath, `
# TODO

- [x] Task 1
- [ ] Task 2
- [ ] Task 3
    `);

    const count = await CompletionDetector.getRemainingCount(
      workspacePath,
      ExecutionMode.ITERATIVE
    );

    expect(count).toBe(2);
  });

  it('should return 0 remaining for iterative mode when all checked', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const todoPath = join(workspacePath, 'TODO.md');

    await writeTestFile(todoPath, `
# TODO

- [x] Task 1
- [x] Task 2
    `);

    const count = await CompletionDetector.getRemainingCount(
      workspacePath,
      ExecutionMode.ITERATIVE
    );

    expect(count).toBe(0);
  });

  it('should handle uppercase X in checkboxes', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const todoPath = join(workspacePath, 'TODO.md');

    await writeTestFile(todoPath, `
# TODO

- [X] Task 1 (uppercase)
- [x] Task 2 (lowercase)
    `);

    const isComplete = await CompletionDetector.isComplete(
      workspacePath,
      ExecutionMode.ITERATIVE
    );

    expect(isComplete).toBe(true);
  });
});
