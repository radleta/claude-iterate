import { ExecutionMode } from '../../types/mode.js';
import { ModePromptStrategy } from './base-mode.js';
import { loadTemplate } from '../../utils/template.js';

/**
 * Iterative mode prompt strategy (new behavior)
 */
export class IterativeModeStrategy implements ModePromptStrategy {
  mode = ExecutionMode.ITERATIVE;

  async getSetupPrompt(
    workspaceName: string,
    workspacePath: string
  ): Promise<string> {
    const validationCriteria = await this.getValidationCriteria();
    return loadTemplate('iterative/setup.md', {
      workspaceName,
      workspacePath,
      validationCriteria,
    });
  }

  async getEditPrompt(
    workspaceName: string,
    workspacePath: string
  ): Promise<string> {
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

  async getIterationSystemPrompt(
    workspacePath: string,
    projectRoot: string
  ): Promise<string> {
    return loadTemplate('iterative/iteration-system.md', {
      workspacePath,
      projectRoot,
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

  async getStatusInstructions(
    workspacePath: string,
    projectRoot: string
  ): Promise<string> {
    return loadTemplate('iterative/status-instructions.md', {
      workspacePath,
      projectRoot,
    });
  }

  async getVerificationPrompt(
    workspaceName: string,
    reportPath: string,
    workspacePath: string,
    depth: 'quick' | 'standard' | 'deep' = 'standard'
  ): Promise<string> {
    const basePrompt = await loadTemplate('iterative/verify-completion.md', {
      workspaceName,
      reportPath,
      workspacePath,
      projectRoot: process.cwd(),
    });

    // Add depth-specific note
    const depthNote = this.getDepthNote(depth);
    return `${basePrompt}\n\n${depthNote}`;
  }

  private getDepthNote(depth: string): string {
    switch (depth) {
      case 'quick':
        return '**Verification Depth: Quick**\nFocus on requirement existence check and deliverable presence. Skip detailed quality analysis.';
      case 'deep':
        return '**Verification Depth: Deep**\nPerform comprehensive review including code quality, edge cases, TODO/FIXME search, and thorough documentation analysis.';
      default:
        return '**Verification Depth: Standard**\nBalanced verification of requirements and deliverables with basic quality checks.';
    }
  }
}
