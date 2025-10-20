import { ExecutionMode } from '../../types/mode.js';

/**
 * Base interface for mode-specific prompt generation
 */
export interface ModePromptStrategy {
  mode: ExecutionMode;

  /**
   * Generate setup prompt for creating instructions
   */
  getSetupPrompt(workspaceName: string, workspacePath: string): Promise<string>;

  /**
   * Generate edit prompt for modifying instructions
   */
  getEditPrompt(workspaceName: string, workspacePath: string): Promise<string>;

  /**
   * Generate validation prompt
   */
  getValidationPrompt(
    workspaceName: string,
    reportPath: string,
    workspacePath: string
  ): Promise<string>;

  /**
   * Generate iteration system prompt
   * @param workspacePath - Absolute path to workspace directory
   * @param projectRoot - Absolute path to project root (cwd)
   */
  getIterationSystemPrompt(
    workspacePath: string,
    projectRoot: string
  ): Promise<string>;

  /**
   * Generate iteration prompt
   */
  getIterationPrompt(
    instructionsContent: string,
    iterationNumber: number
  ): Promise<string>;

  /**
   * Get validation criteria specific to this mode
   */
  getValidationCriteria(): Promise<string>;

  /**
   * Get status tracking instructions (appended to iteration prompts)
   * Mode-specific instructions for maintaining .status.json
   * @param workspacePath - Absolute path to workspace directory
   * @param projectRoot - Absolute path to project root (cwd)
   */
  getStatusInstructions(
    workspacePath: string,
    projectRoot: string
  ): Promise<string>;
}
