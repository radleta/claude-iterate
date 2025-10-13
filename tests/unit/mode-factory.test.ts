import { describe, it, expect } from 'vitest';
import { ModeFactory } from '../../src/templates/modes/mode-factory.js';
import { ExecutionMode } from '../../src/types/mode.js';
import { LoopModeStrategy } from '../../src/templates/modes/loop-mode.js';
import { IterativeModeStrategy } from '../../src/templates/modes/iterative-mode.js';

describe('ModeFactory', () => {
  it('should return loop mode strategy', () => {
    const strategy = ModeFactory.getStrategy(ExecutionMode.LOOP);
    expect(strategy).toBeInstanceOf(LoopModeStrategy);
    expect(strategy.mode).toBe(ExecutionMode.LOOP);
  });

  it('should return iterative mode strategy', () => {
    const strategy = ModeFactory.getStrategy(ExecutionMode.ITERATIVE);
    expect(strategy).toBeInstanceOf(IterativeModeStrategy);
    expect(strategy.mode).toBe(ExecutionMode.ITERATIVE);
  });

  it('should throw error for unknown mode', () => {
    expect(() => ModeFactory.getStrategy('unknown' as ExecutionMode)).toThrow(
      'Unknown execution mode: unknown'
    );
  });
});
