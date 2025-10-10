import { Command } from 'commander';
import { join } from 'path';
import { Workspace } from '../core/workspace.js';
import { ConfigManager } from '../core/config-manager.js';
import { ClaudeClient } from '../services/claude-client.js';
import { Logger } from '../utils/logger.js';
import { getWorkspacePath } from '../utils/paths.js';
import { fileExists, readText } from '../utils/fs.js';
import { getValidationPrompt, getWorkspaceSystemPrompt } from '../templates/system-prompt.js';

/**
 * Validate workspace instructions
 */
export function validateCommand(): Command {
  return new Command('validate')
    .description('Validate workspace instructions')
    .argument('<name>', 'Workspace name')
    .action(async (name: string, _options: unknown, command: Command) => {
      const logger = new Logger(command.optsWithGlobals().colors !== false);

      try {
        // Load config
        const config = await ConfigManager.load(command.optsWithGlobals());
        const runtimeConfig = config.getConfig();

        // Get workspace path
        const workspacePath = getWorkspacePath(
          name,
          runtimeConfig.workspacesDir
        );

        // Load workspace
        const workspace = await Workspace.load(name, workspacePath);

        // Check if instructions exist
        if (!(await workspace.hasInstructions())) {
          logger.error('Instructions not found. Run setup first:');
          logger.log(`  claude-iterate setup ${name}`);
          process.exit(1);
        }

        logger.header(`Validating instructions: ${name}`);
        logger.info('Analyzing instructions against validation criteria...');
        logger.line();

        // Create Claude client
        const client = new ClaudeClient(
          runtimeConfig.claudeCommand,
          runtimeConfig.claudeArgs,
          logger
        );

        // Check if Claude is available
        if (!(await client.isAvailable())) {
          logger.error(
            `Claude CLI not found. Make sure '${runtimeConfig.claudeCommand}' is installed and in PATH.`
          );
          process.exit(1);
        }

        // Generate validation report path
        const reportPath = join(workspace.path, 'validation-report.md');

        // Generate prompts
        const systemPrompt = getWorkspaceSystemPrompt(workspace.path);
        const prompt = getValidationPrompt(name, reportPath, workspace.path);

        // Execute Claude non-interactively from project root with system context
        await client.executeNonInteractive(prompt, systemPrompt);

        // Check if report was created
        if (await fileExists(reportPath)) {
          const report = await readText(reportPath);
          logger.line();
          logger.log(report);
          logger.line();
          logger.success(`Validation report saved: ${reportPath}`);
        } else {
          logger.warn('Validation report not created');
        }
      } catch (error) {
        logger.error('Validation failed', error as Error);
        process.exit(1);
      }
    });
}
