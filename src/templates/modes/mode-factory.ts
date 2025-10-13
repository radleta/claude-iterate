import { ExecutionMode } from '../../types/mode.js';
import { ModePromptStrategy } from './base-mode.js';
import { LoopModeStrategy } from './loop-mode.js';
import { IterativeModeStrategy } from './iterative-mode.js';

/**
 * Factory for creating mode-specific prompt strategies
 */
export class ModeFactory {
  private static strategies = new Map<ExecutionMode, ModePromptStrategy>([
    [ExecutionMode.LOOP, new LoopModeStrategy()],
    [ExecutionMode.ITERATIVE, new IterativeModeStrategy()],
  ]);

  /**
   * Get prompt strategy for a mode
   */
  static getStrategy(mode: ExecutionMode): ModePromptStrategy {
    const strategy = this.strategies.get(mode);
    if (!strategy) {
      throw new Error(`Unknown execution mode: ${mode}`);
    }
    return strategy;
  }

  /**
   * Register a new mode strategy (for extensibility)
   */
  static registerStrategy(strategy: ModePromptStrategy): void {
    this.strategies.set(strategy.mode, strategy);
  }
}
