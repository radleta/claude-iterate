import { Command } from 'commander';
import { ConfigManager } from '../core/config-manager.js';
import { Logger } from '../utils/logger.js';

/**
 * Configuration management commands
 */
export function configCommand(): Command {
  const cmd = new Command('config')
    .description('Configuration management');

  // config show
  cmd
    .command('show')
    .description('Show current configuration')
    .option('--json', 'Output as JSON')
    .action(async (options: { json?: boolean }, command: Command) => {
      const logger = new Logger(command.optsWithGlobals().colors !== false);

      try {
        const config = await ConfigManager.load(command.optsWithGlobals());
        const runtimeConfig = config.getConfig();

        if (options.json) {
          console.log(JSON.stringify(runtimeConfig, null, 2));
          return;
        }

        logger.header('Current Configuration');
        logger.line();
        logger.log('Directories:');
        logger.log(`  Workspaces: ${runtimeConfig.workspacesDir}`);
        logger.log(`  Templates: ${runtimeConfig.templatesDir}`);
        logger.log(`  Global Templates: ${runtimeConfig.globalTemplatesDir}`);
        logger.log(`  Archive: ${runtimeConfig.archiveDir}`);
        logger.line();
        logger.log('Defaults:');
        logger.log(`  Max Iterations: ${runtimeConfig.maxIterations}`);
        logger.log(`  Delay: ${runtimeConfig.delay}s`);
        logger.line();
        logger.log('Claude:');
        logger.log(`  Command: ${runtimeConfig.claudeCommand}`);
        logger.log(`  Args: ${runtimeConfig.claudeArgs.join(' ')}`);

        if (runtimeConfig.notifyUrl) {
          logger.line();
          logger.log('Notifications:');
          logger.log(`  URL: ${runtimeConfig.notifyUrl}`);
          logger.log(`  Events: ${runtimeConfig.notifyEvents?.join(', ') || 'completion, error'}`);
        }

        logger.line();
        logger.log('Other:');
        logger.log(`  Colors: ${runtimeConfig.colors}`);
        logger.log(`  Verbose: ${runtimeConfig.verbose}`);

      } catch (error) {
        logger.error('Failed to show config', error as Error);
        process.exit(1);
      }
    });

  // config get <key>
  cmd
    .command('get')
    .description('Get configuration value')
    .argument('<key>', 'Configuration key')
    .action(async (key: string, _options: unknown, command: Command) => {
      const logger = new Logger(command.optsWithGlobals().colors !== false);

      try {
        const config = await ConfigManager.load(command.optsWithGlobals());
        const runtimeConfig = config.getConfig();

        const value = (runtimeConfig as unknown as Record<string, unknown>)[key];

        if (value === undefined) {
          logger.error(`Unknown config key: ${key}`);
          logger.line();
          logger.info('Available keys:');
          logger.log('  workspacesDir, templatesDir, globalTemplatesDir, archiveDir');
          logger.log('  maxIterations, delay, notifyUrl, notifyEvents');
          logger.log('  claudeCommand, claudeArgs, colors, verbose');
          process.exit(1);
        }

        if (typeof value === 'object') {
          console.log(JSON.stringify(value, null, 2));
        } else {
          console.log(value);
        }

      } catch (error) {
        logger.error('Failed to get config', error as Error);
        process.exit(1);
      }
    });

  return cmd;
}
