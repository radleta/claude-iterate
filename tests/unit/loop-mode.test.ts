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
    // Per critical principle: should NOT mention iteration mechanics in setup
    expect(prompt).not.toContain('automated iteration loop');
    expect(prompt).toContain('critical_principle');
    expect(prompt).toContain('NOT HOW the system works');
    expect(prompt).toContain('INSTRUCTIONS.md');
    expect(prompt).toContain('test');
    expect(prompt).toContain('/path/to/workspace');
  });

  it('should generate edit prompt with loop context', async () => {
    const prompt = await strategy.getEditPrompt('test', '/path/to/workspace');
    // Per critical principle: should NOT mention iteration mechanics in edit prompt
    expect(prompt).not.toContain('automated iteration loop');
    expect(prompt).toContain('critical_principle');
    expect(prompt).toContain('NOT HOW the system works');
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
    const prompt = await strategy.getIterationSystemPrompt(
      '/path/to/workspace',
      '/path/to/project'
    );
    expect(prompt).toContain('NO memory of previous iterations');
    expect(prompt).toContain('INSTRUCTIONS.md');
    expect(prompt).toContain('.status.json');
    expect(prompt).toContain('Session Pacing');
    expect(prompt).toContain('Budget Purpose');
    expect(prompt).toContain('/path/to/workspace');
    expect(prompt).toContain('/path/to/project');
  });

  it('should generate iteration prompt', async () => {
    const prompt = await strategy.getIterationPrompt('Do the task', 5);
    // Loop mode iteration template just contains instructions content
    expect(prompt).toContain('Do the task');
  });

  it('should include validation criteria for loop mode', async () => {
    const criteria = await strategy.getValidationCriteria();
    // Check for key sections in updated validation criteria
    expect(criteria).toContain('Validation Criteria for Loop Mode');
    expect(criteria).toContain('Work Breakdown');
    expect(criteria).toContain('No System Mechanics');
  });
});
