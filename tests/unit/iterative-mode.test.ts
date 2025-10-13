import { describe, it, expect } from 'vitest';
import { IterativeModeStrategy } from '../../src/templates/modes/iterative-mode.js';
import { ExecutionMode } from '../../src/types/mode.js';

describe('IterativeModeStrategy', () => {
  const strategy = new IterativeModeStrategy();

  it('should have correct mode', () => {
    expect(strategy.mode).toBe(ExecutionMode.ITERATIVE);
  });

  it('should generate setup prompt without loop mentions in context', async () => {
    const prompt = await strategy.getSetupPrompt('test', '/path/to/workspace');
    // Should not describe it as an "automated iteration loop" in the main context
    expect(prompt).not.toContain('automated iteration loop');
    expect(prompt).not.toContain('Remaining: 0');
    expect(prompt).toContain('checkbox');
    expect(prompt).toContain('as many TODO items as possible');
    expect(prompt).toContain('autonomous work sessions');
  });

  it('should generate edit prompt for iterative mode', async () => {
    const prompt = await strategy.getEditPrompt('test', '/path/to/workspace');
    expect(prompt).not.toContain('automated iteration loop');
    expect(prompt).toContain('autonomous work sessions');
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

  it('should generate iteration system prompt focused on completing work', async () => {
    const prompt = await strategy.getIterationSystemPrompt('/path/to/workspace');
    expect(prompt).toContain('Complete as much work as possible');
    expect(prompt).toContain('Don\'t stop early');
    expect(prompt).not.toContain('NO memory of previous iterations');
    expect(prompt).toContain('checkbox');
  });

  it('should generate iteration prompt for work session', async () => {
    const prompt = await strategy.getIterationPrompt('Do the task', 5);
    expect(prompt).toContain('Work Session 5');
    expect(prompt).toContain('Do the task');
    expect(prompt).toContain('complete as many outstanding items as possible');
  });

  it('should use checkbox format in validation criteria', async () => {
    const criteria = await strategy.getValidationCriteria();
    expect(criteria).toContain('checkbox');
    expect(criteria).toContain('- [ ]');
    expect(criteria).toContain('- [x]');
    expect(criteria).not.toContain('Remaining: 0');
    expect(criteria).toContain('No Loop Mentions');
  });
});
