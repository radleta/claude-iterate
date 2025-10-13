import { ExecutionMode } from '../../types/mode.js';
import { ModePromptStrategy } from './base-mode.js';
import { loadTemplate } from '../../utils/template.js';

/**
 * Iterative mode prompt strategy (new behavior)
 */
export class IterativeModeStrategy implements ModePromptStrategy {
  mode = ExecutionMode.ITERATIVE;

  async getSetupPrompt(workspaceName: string, workspacePath: string): Promise<string> {
    const validationCriteria = await this.getValidationCriteria();
    return loadTemplate('iterative/setup.md', {
      workspaceName,
      workspacePath,
      validationCriteria,
    });
  }

  async getEditPrompt(workspaceName: string, workspacePath: string): Promise<string> {
    const validationCriteria = await this.getValidationCriteria();
    return loadTemplate('iterative/edit.md', {
      workspaceName,
      workspacePath,
      validationCriteria,
    });
  }

  async getValidationPrompt(
    workspaceName: string,
    reportPath: string,
    workspacePath: string
  ): Promise<string> {
    const validationCriteria = await this.getValidationCriteria();
    return loadTemplate('iterative/validate.md', {
      workspaceName,
      reportPath,
      workspacePath,
      validationCriteria,
    });
  }

  async getIterationSystemPrompt(workspacePath: string): Promise<string> {
    return loadTemplate('iterative/iteration-system.md', {
      workspacePath,
    });
  }

  async getIterationPrompt(
    instructionsContent: string,
    iterationNumber: number
  ): Promise<string> {
    return loadTemplate('iterative/iteration.md', {
      instructionsContent,
      iterationNumber: iterationNumber.toString(),
    });
  }

  async getValidationCriteria(): Promise<string> {
    return loadTemplate('iterative/validation-criteria.md', {});
  }
}
