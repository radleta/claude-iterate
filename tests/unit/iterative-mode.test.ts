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
    // Should include critical principle teaching what NOT to mention
    expect(prompt).toContain('critical_principle');
    expect(prompt).toContain('NOT HOW the system works');
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
    const prompt = await strategy.getIterationSystemPrompt(
      '/path/to/workspace',
      '/path/to/project'
    );
    expect(prompt).toContain('Complete as much');
    expect(prompt).toContain('Stop when:');
    expect(prompt).toContain('Completion Criteria');
    expect(prompt).not.toContain('NO memory of previous iterations');
    expect(prompt).toContain('INSTRUCTIONS.md');
    expect(prompt).toContain('.status.json');
    expect(prompt).toContain('/path/to/project');
  });

  it('should generate iteration prompt for work session', async () => {
    const prompt = await strategy.getIterationPrompt('Do the task', 5);
    // Iterative mode iteration template just contains instructions content
    expect(prompt).toContain('Do the task');
  });

  it('should use validation criteria for iterative mode', async () => {
    const criteria = await strategy.getValidationCriteria();
    // Check for key sections in updated validation criteria
    expect(criteria).toContain('Validation Criteria for Iterative Mode');
    expect(criteria).toContain('Task Breakdown');
    expect(criteria).toContain('Autonomous Execution');
    expect(criteria).not.toContain('Remaining: 0');
  });
});
