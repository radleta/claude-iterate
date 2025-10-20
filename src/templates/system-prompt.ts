import { ExecutionMode } from '../types/mode.js';
import { ModeFactory } from './modes/mode-factory.js';
import { loadTemplate } from '../utils/template.js';

/**
 * Generate system prompt for workspace operations (mode-agnostic)
 */
export async function getWorkspaceSystemPrompt(
  workspacePath: string
): Promise<string> {
  return loadTemplate('workspace-system.md', {
    workspacePath,
    projectRoot: process.cwd(),
  });
}

/**
 * Generate setup prompt (mode-aware)
 */
export async function getSetupPrompt(
  workspaceName: string,
  workspacePath: string,
  mode: ExecutionMode = ExecutionMode.LOOP
): Promise<string> {
  const strategy = ModeFactory.getStrategy(mode);
  return strategy.getSetupPrompt(workspaceName, workspacePath);
}

/**
 * Generate edit prompt (mode-aware)
 */
export async function getEditPrompt(
  workspaceName: string,
  workspacePath: string,
  mode: ExecutionMode = ExecutionMode.LOOP
): Promise<string> {
  const strategy = ModeFactory.getStrategy(mode);
  return strategy.getEditPrompt(workspaceName, workspacePath);
}

/**
 * Generate validation prompt (mode-aware)
 */
export async function getValidationPrompt(
  workspaceName: string,
  reportPath: string,
  workspacePath: string,
  mode: ExecutionMode = ExecutionMode.LOOP
): Promise<string> {
  const strategy = ModeFactory.getStrategy(mode);
  return strategy.getValidationPrompt(workspaceName, reportPath, workspacePath);
}

/**
 * Generate iteration system prompt (mode-aware)
 */
export async function getIterationSystemPrompt(
  workspacePath: string,
  mode: ExecutionMode = ExecutionMode.LOOP
): Promise<string> {
  const strategy = ModeFactory.getStrategy(mode);
  return strategy.getIterationSystemPrompt(workspacePath, process.cwd());
}

/**
 * Generate iteration prompt (mode-aware) with status instructions appended
 */
export async function getIterationPrompt(
  instructionsContent: string,
  iterationNumber: number,
  mode: ExecutionMode = ExecutionMode.LOOP,
  workspacePath?: string
): Promise<string> {
  const strategy = ModeFactory.getStrategy(mode);

  // Get base iteration prompt
  const basePrompt = await strategy.getIterationPrompt(
    instructionsContent,
    iterationNumber
  );

  // If workspace path provided, append status instructions
  if (workspacePath) {
    const statusInstructions = await strategy.getStatusInstructions(
      workspacePath,
      process.cwd()
    );
    return `${basePrompt}\n\n---\n\n${statusInstructions}`;
  }

  return basePrompt;
}
