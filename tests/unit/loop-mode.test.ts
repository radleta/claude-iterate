import { describe, it, expect } from 'vitest';
import { LoopModeStrategy } from '../../src/templates/modes/loop-mode.js';
import { ExecutionMode } from '../../src/types/mode.js';

describe('LoopModeStrategy', () => {
  const strategy = new LoopModeStrategy();

  it('should have correct mode', () => {
    expect(strategy.mode).toBe(ExecutionMode.LOOP);
  });

  it('should generate setup prompt with loop context', async () => {
    const prompt = await strategy.getSetupPrompt('test', '/path/to/workspace');
    expect(prompt).toContain('automated iteration loop');
    expect(prompt).toContain('Remaining: 0');
    expect(prompt).toContain('INSTRUCTIONS.md');
    expect(prompt).toContain('test');
    expect(prompt).toContain('/path/to/workspace');
  });

  it('should generate edit prompt with loop context', async () => {
    const prompt = await strategy.getEditPrompt('test', '/path/to/workspace');
    expect(prompt).toContain('automated iteration loop');
    expect(prompt).toContain('Remaining: 0');
    expect(prompt).toContain('/path/to/workspace/INSTRUCTIONS.md');
  });

  it('should generate validation prompt', async () => {
    const prompt = await strategy.getValidationPrompt(
      'test',
      '/path/to/report.md',
      '/path/to/workspace'
    );
    expect(prompt).toContain('Validate the instructions');
    expect(prompt).toContain('/path/to/workspace/INSTRUCTIONS.md');
    expect(prompt).toContain('/path/to/report.md');
  });

  it('should generate iteration system prompt with state management', async () => {
    const prompt = await strategy.getIterationSystemPrompt('/path/to/workspace');
    expect(prompt).toContain('NO memory of previous iterations');
    expect(prompt).toContain('TODO.md file is your ONLY source of state');
    expect(prompt).toContain('Iteration Protocol');
    expect(prompt).toContain('/path/to/workspace');
  });

  it('should generate iteration prompt', async () => {
    const prompt = await strategy.getIterationPrompt('Do the task', 5);
    expect(prompt).toContain('Task Iteration 5');
    expect(prompt).toContain('Do the task');
    expect(prompt).toContain('Follow the instructions above');
  });

  it('should include Remaining count in validation criteria', async () => {
    const criteria = await strategy.getValidationCriteria();
    expect(criteria).toContain('Remaining: 0');
    expect(criteria).toContain('Dynamic Counting');
    expect(criteria).toContain('Re-runnable');
  });
});
