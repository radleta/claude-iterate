import { ExecutionMode } from '../../types/mode.js';
import { ModePromptStrategy } from './base-mode.js';
import { loadTemplate } from '../../utils/template.js';

/**
 * Loop mode prompt strategy (current behavior)
 */
export class LoopModeStrategy implements ModePromptStrategy {
  mode = ExecutionMode.LOOP;

  async getSetupPrompt(
    workspaceName: string,
    workspacePath: string
  ): Promise<string> {
    const validationCriteria = await this.getValidationCriteria();
    return loadTemplate('loop/setup.md', {
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
    return loadTemplate('loop/edit.md', {
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
    return loadTemplate('loop/validate.md', {
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
    return loadTemplate('loop/iteration-system.md', {
      workspacePath,
      projectRoot,
    });
  }

  async getIterationPrompt(
    instructionsContent: string,
    iterationNumber: number
  ): Promise<string> {
    return loadTemplate('loop/iteration.md', {
      instructionsContent,
      iterationNumber: iterationNumber.toString(),
    });
  }

  async getValidationCriteria(): Promise<string> {
    return loadTemplate('loop/validation-criteria.md', {});
  }

  async getStatusInstructions(
    workspacePath: string,
    projectRoot: string
  ): Promise<string> {
    return loadTemplate('loop/status-instructions.md', {
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
    const basePrompt = await loadTemplate('loop/verify-completion.md', {
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
        return '**Verification Depth: Quick**\nFocus on file existence and basic count verification. Skip detailed quality checks.';
      case 'deep':
        return '**Verification Depth: Deep**\nPerform comprehensive review including code quality, edge cases, and thorough testing analysis.';
      default:
        return '**Verification Depth: Standard**\nBalanced verification of key deliverables and basic quality checks.';
    }
  }
}
