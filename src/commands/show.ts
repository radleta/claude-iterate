import { Command } from 'commander';
import { Workspace } from '../core/workspace.js';
import { ConfigManager } from '../core/config-manager.js';
import { Logger } from '../utils/logger.js';
import { getWorkspacePath } from '../utils/paths.js';

/**
 * Show detailed workspace information
 */
export function showCommand(): Command {
  return new Command('show')
    .description('Show detailed workspace information')
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
        const info = await workspace.getInfo();
        const metadata = await workspace.getMetadata();

        logger.header(`Workspace: ${name}`);
        logger.line();

        // Status
        const statusIcon = info.isComplete ? '✅' : info.status === 'error' ? '❌' : '🔄';
        logger.log(`${statusIcon} Status: ${info.status}`);

        if (info.isComplete) {
          logger.log('   ✅ Task completed!');
        }

        logger.line();

        // Progress
        logger.log('📊 Progress:');
        logger.log(`   Total iterations: ${info.totalIterations}`);
        logger.log(`   Setup iterations: ${metadata.setupIterations}`);
        logger.log(`   Execution iterations: ${metadata.executionIterations}`);

        if (info.remainingCount !== null) {
          logger.log(`   Remaining items: ${info.remainingCount}`);
        }

        logger.line();

        // Files
        logger.log('📁 Files:');
        logger.log(`   Path: ${workspace.path}`);
        logger.log(`   Instructions: ${info.hasInstructions ? '✓' : '✗'}`);
        logger.log(`   TODO.md: ${info.hasTodo ? '✓' : '✗'}`);
        logger.line();

        // Settings
        logger.log('⚙️  Settings:');
        logger.log(`   Mode: ${metadata.mode}`);
        logger.log(`   Max iterations: ${metadata.maxIterations}`);
        logger.log(`   Delay: ${metadata.delay}s`);
        if (metadata.notifyUrl) {
          logger.log(`   Notify URL: ${metadata.notifyUrl}`);
        }
        logger.line();

        // Claude configuration
        logger.log('🤖 Claude Configuration:');
        logger.log(`   Command: ${runtimeConfig.claudeCommand}`);
        if (runtimeConfig.claudeArgs.length > 0) {
          logger.log(`   Args: ${runtimeConfig.claudeArgs.join(' ')}`);
          if (runtimeConfig.claudeArgs.includes('--dangerously-skip-permissions')) {
            logger.warn('   ⚠️  Permission prompts disabled (--dangerously-skip-permissions)');
          }
        } else {
          logger.log('   Args: (none - will prompt for permissions)');
        }
        logger.line();

        // Timestamps
        logger.log('🕐 Timestamps:');
        logger.log(`   Created: ${new Date(info.created).toLocaleString()}`);
        if (info.lastRun) {
          logger.log(`   Last run: ${new Date(info.lastRun).toLocaleString()}`);
        }
        logger.line();

        // Next actions
        logger.info('Available actions:');
        if (!info.hasInstructions) {
          logger.log(`  • Setup: claude-iterate setup ${name}`);
        } else if (!info.isComplete) {
          logger.log(`  • Edit: claude-iterate edit ${name}`);
          logger.log(`  • Validate: claude-iterate validate ${name}`);
          logger.log(`  • Run: claude-iterate run ${name}`);
        } else {
          logger.log(`  • View TODO: cat ${workspace.getTodoPath()}`);
          logger.log(`  • Save template: claude-iterate template save ${name} <template-name>`);
        }

      } catch (error) {
        logger.error('Failed to show workspace info', error as Error);
        process.exit(1);
      }
    });
}
