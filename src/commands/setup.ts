import { Command } from 'commander';
import { Workspace } from '../core/workspace.js';
import { ConfigManager } from '../core/config-manager.js';
import { ClaudeClient } from '../services/claude-client.js';
import { NotificationService } from '../services/notification-service.js';
import { Logger } from '../utils/logger.js';
import { getWorkspacePath } from '../utils/paths.js';
import { getSetupPrompt, getWorkspaceSystemPrompt } from '../templates/system-prompt.js';

/**
 * Set up workspace instructions interactively
 */
export function setupCommand(): Command {
  return new Command('setup')
    .description('Set up workspace instructions interactively')
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
        const metadata = await workspace.getMetadata();

        logger.header(`Setting up instructions: ${name}`);
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

        // Generate prompts (mode-aware)
        const systemPrompt = await getWorkspaceSystemPrompt(workspace.path);
        const prompt = await getSetupPrompt(name, workspace.path, metadata.mode);

        // Execute Claude interactively from project root with system context
        await client.executeInteractive(prompt, systemPrompt);

        // Increment setup iterations
        await workspace.incrementIterations('setup');

        // Check if instructions were created
        if (await workspace.hasInstructions()) {
          await workspace.markSetupComplete();
          logger.line();
          logger.success('Instructions created successfully!');

          // Send notification if configured
          const updatedMetadata = await workspace.getMetadata();
          const config = await ConfigManager.load(command.optsWithGlobals());
          const runtimeConfig = config.getConfig();
          const notificationService = new NotificationService(logger, runtimeConfig.verbose);

          if (
            notificationService.isConfigured(updatedMetadata) &&
            notificationService.shouldNotify('setup_complete', updatedMetadata) &&
            updatedMetadata.notifyUrl
          ) {
            await notificationService.send(
              `WORKSPACE SETUP COMPLETE\n\nWorkspace: ${name}\nInstructions: Created and validated\nReady to execute with: claude-iterate run ${name}`,
              {
                url: updatedMetadata.notifyUrl,
                title: 'Setup Complete',
                tags: ['claude-iterate', 'setup'],
              }
            );
          }

          logger.line();
          logger.info('Next steps:');
          logger.log(`  • Validate: claude-iterate validate ${name}`);
          logger.log(`  • Edit: claude-iterate edit ${name}`);
          logger.log(`  • Run: claude-iterate run ${name}`);
          logger.line();
        } else {
          logger.line();
          logger.warn(
            'Instructions file not found. You may need to run setup again.'
          );
        }
      } catch (error) {
        logger.error('Setup failed', error as Error);
        process.exit(1);
      }
    });
}
