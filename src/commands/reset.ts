import { Command } from 'commander';
import { Workspace } from '../core/workspace.js';
import { ConfigManager } from '../core/config-manager.js';
import { Logger } from '../utils/logger.js';
import { getWorkspacePath } from '../utils/paths.js';

/**
 * Reset workspace iteration count
 */
export function resetCommand(): Command {
  return new Command('reset')
    .description('Reset workspace iteration count')
    .argument('<name>', 'Workspace name')
    .action(async (name: string, _options: unknown, command: Command) => {
      const logger = new Logger(command.optsWithGlobals().colors !== false);

      try {
        // Load config
        const config = await ConfigManager.load(command.optsWithGlobals());
        const runtimeConfig = config.getConfig();

        // Get workspace path
        const workspacePath = getWorkspacePath(name, runtimeConfig.workspacesDir);

        // Load workspace
        const workspace = await Workspace.load(name, workspacePath);
        const before = await workspace.getInfo();

        logger.info(`Resetting iteration count for: ${name}`);
        logger.log(`  Current iterations: ${before.totalIterations}`);

        // Reset iterations
        await workspace.resetIterations();

        const after = await workspace.getInfo();

        logger.success('Iteration count reset!');
        logger.log(`  New count: ${after.totalIterations}`);
        logger.log(`  Status: ${after.status}`);

      } catch (error) {
        logger.error('Failed to reset workspace', error as Error);
        process.exit(1);
      }
    });
}
