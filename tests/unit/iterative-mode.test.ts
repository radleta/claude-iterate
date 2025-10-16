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
    // Should include critical principle teaching what NOT to mention
    expect(prompt).toContain('critical_principle');
    expect(prompt).toContain('NEVER include in user instructions');
    // Should focus on task goals instead
    expect(prompt).toContain('autonomous');
    expect(prompt).toContain('WHAT to accomplish');
  });

  it('should generate edit prompt for iterative mode', async () => {
    const prompt = await strategy.getEditPrompt('test', '/path/to/workspace');
    expect(prompt).not.toContain('automated iteration loop');
    // Per critical principle: should NOT mention iteration mechanics
    expect(prompt).not.toContain('work in sessions');
    expect(prompt).toContain('/path/to/workspace/INSTRUCTIONS.md');
    expect(prompt).toContain('autonomous');
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
    expect(prompt).toContain('Complete as much');
    expect(prompt).toContain('stop early');
    expect(prompt).not.toContain('NO memory of previous iterations');
    expect(prompt).toContain('checkbox');
  });

  it('should generate iteration prompt for work session', async () => {
    const prompt = await strategy.getIterationPrompt('Do the task', 5);
    expect(prompt).toContain('Work Session 5');
    expect(prompt).toContain('Do the task');
    expect(prompt).toContain('as many outstanding items');
  });

  it('should use checkbox format in validation criteria', async () => {
    const criteria = await strategy.getValidationCriteria();
    expect(criteria).toContain('checkbox');
    expect(criteria).toContain('- [ ]');
    expect(criteria).toContain('- [x]');
    expect(criteria).not.toContain('Remaining: 0');
    expect(criteria).toContain('No System Mentions');
  });
});
