import { Command } from 'commander';
import { ConfigManager } from '../core/config-manager.js';
import { Workspace } from '../core/workspace.js';
import { Logger } from '../utils/logger.js';
import { dirExists, listDir } from '../utils/fs.js';
import { getWorkspacePath } from '../utils/paths.js';

/**
 * List all workspaces
 */
export function listCommand(): Command {
  return new Command('list')
    .alias('ls')
    .description('List all workspaces')
    .option('--status <status>', 'Filter by status (in_progress, completed, error)')
    .action(async (options: { status?: string }, command: Command) => {
      const logger = new Logger(command.optsWithGlobals().colors !== false);

      try {
        // Load config
        const config = await ConfigManager.load(command.optsWithGlobals());
        const runtimeConfig = config.getConfig();

        const workspacesDir = runtimeConfig.workspacesDir;

        // Check if workspaces directory exists
        if (!(await dirExists(workspacesDir))) {
          logger.info('No workspaces found');
          logger.log(`  Initialize a workspace: claude-iterate init <name>`);
          return;
        }

        // List directories
        const names = await listDir(workspacesDir);

        if (names.length === 0) {
          logger.info('No workspaces found');
          logger.log(`  Initialize a workspace: claude-iterate init <name>`);
          return;
        }

        logger.header('Workspaces');

        // Load workspace info
        const workspaces: Array<{
          name: string;
          status: string;
          iterations: number;
          remaining: number | null;
          complete: boolean;
        }> = [];

        for (const name of names) {
          try {
            const workspacePath = getWorkspacePath(name, workspacesDir);
            const workspace = await Workspace.load(name, workspacePath);
            const info = await workspace.getInfo();

            // Filter by status if specified
            if (options.status && info.status !== options.status) {
              continue;
            }

            workspaces.push({
              name: info.name,
              status: info.status,
              iterations: info.totalIterations,
              remaining: info.remainingCount,
              complete: info.isComplete,
            });
          } catch {
            // Skip invalid workspaces
          }
        }

        if (workspaces.length === 0) {
          if (options.status) {
            logger.info(`No workspaces with status: ${options.status}`);
          } else {
            logger.info('No valid workspaces found');
          }
          return;
        }

        // Display table
        for (const ws of workspaces) {
          const statusIcon = ws.complete ? '✅' : ws.status === 'error' ? '❌' : '🔄';
          const remainingText = ws.remaining !== null ? ` (${ws.remaining} remaining)` : '';

          logger.log(`${statusIcon} ${ws.name}`);
          logger.log(`   Status: ${ws.status}${remainingText}`);
          logger.log(`   Iterations: ${ws.iterations}`);
          logger.line();
        }

        logger.info(`Total: ${workspaces.length} workspace(s)`);

        // Show Claude configuration
        logger.line();
        logger.log('🤖 Claude Configuration:');
        logger.log(`   Command: ${runtimeConfig.claudeCommand}`);
        if (runtimeConfig.claudeArgs.length > 0) {
          logger.log(`   Args: ${runtimeConfig.claudeArgs.join(' ')}`);
          if (runtimeConfig.claudeArgs.includes('--dangerously-skip-permissions')) {
            logger.warn('   ⚠️  Permission prompts disabled');
          }
        } else {
          logger.log('   Args: (none - will prompt for permissions)');
        }

      } catch (error) {
        logger.error('Failed to list workspaces', error as Error);
        process.exit(1);
      }
    });
}
