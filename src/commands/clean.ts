import { Command } from 'commander';
import { Workspace } from '../core/workspace.js';
import { ArchiveManager } from '../core/archive-manager.js';
import { ConfigManager } from '../core/config-manager.js';
import { Logger } from '../utils/logger.js';
import { getWorkspacePath } from '../utils/paths.js';
import { remove } from '../utils/fs.js';

/**
 * Clean (delete) workspace
 */
export function cleanCommand(): Command {
  return new Command('clean')
    .description('Clean (delete) workspace')
    .argument('<name>', 'Workspace name')
    .option('-f, --force', 'Skip confirmation')
    .option('--no-archive', 'Delete without archiving (default: archive first)')
    .action(async (name: string, options: { force?: boolean; archive?: boolean }, command: Command) => {
      const logger = new Logger(command.optsWithGlobals().colors !== false);

      try {
        // Load config
        const config = await ConfigManager.load(command.optsWithGlobals());
        const runtimeConfig = config.getConfig();

        // Get workspace path
        const workspacePath = getWorkspacePath(name, runtimeConfig.workspacesDir);

        // Load workspace (to verify it exists)
        const workspace = await Workspace.load(name, workspacePath);
        const info = await workspace.getInfo();

        // Confirm deletion
        if (!options.force) {
          logger.warn(`About to ${options.archive !== false ? 'archive and ' : ''}delete workspace: ${name}`);
          logger.log(`  Path: ${workspace.path}`);
          logger.log(`  Status: ${info.status}`);
          logger.log(`  Iterations: ${info.totalIterations}`);
          logger.line();

          // In non-interactive mode, require --force flag
          if (!process.stdin.isTTY) {
            logger.error('Cannot prompt in non-interactive mode. Use --force to confirm.');
            process.exit(1);
          }

          // Simple confirmation (in real implementation, use readline or prompts library)
          logger.warn('This action cannot be undone!');
          logger.log('Use --force flag to confirm deletion');
          return;
        }

        // Archive first (unless --no-archive)
        if (options.archive !== false) {
          const archiveManager = new ArchiveManager(
            runtimeConfig.archiveDir,
            runtimeConfig.workspacesDir
          );

          logger.info(`Archiving workspace: ${name}`);
          const archiveName = await archiveManager.archive(name);
          logger.success(`Workspace archived: ${archiveName}`);
          logger.log(`  Location: ${runtimeConfig.archiveDir}/${archiveName}`);
          logger.line();
        }

        // Delete workspace
        await remove(workspace.path);

        logger.success(`Workspace deleted: ${name}`);

      } catch (error) {
        logger.error('Failed to clean workspace', error as Error);
        process.exit(1);
      }
    });
}
