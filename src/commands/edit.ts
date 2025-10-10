import { Command } from 'commander';
import { Workspace } from '../core/workspace.js';
import { ConfigManager } from '../core/config-manager.js';
import { ClaudeClient } from '../services/claude-client.js';
import { Logger } from '../utils/logger.js';
import { getWorkspacePath } from '../utils/paths.js';
import { getEditPrompt, getWorkspaceSystemPrompt } from '../templates/system-prompt.js';

/**
 * Edit workspace instructions interactively
 */
export function editCommand(): Command {
  return new Command('edit')
    .description('Edit workspace instructions interactively')
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

        logger.header(`Editing instructions: ${name}`);
        logger.info('Launching interactive Claude session...');
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

        // Generate prompts
        const systemPrompt = getWorkspaceSystemPrompt(workspace.path);
        const prompt = getEditPrompt(name, workspace.path);

        // Execute Claude interactively from project root with system context
        await client.executeInteractive(prompt, systemPrompt);

        // Increment setup iterations
        await workspace.incrementIterations('setup');

        logger.line();
        logger.success('Instructions updated successfully!');
        logger.line();
        logger.info('Next steps:');
        logger.log(`  • Validate: claude-iterate validate ${name}`);
        logger.log(`  • Run: claude-iterate run ${name}`);
        logger.line();
      } catch (error) {
        logger.error('Edit failed', error as Error);
        process.exit(1);
      }
    });
}
