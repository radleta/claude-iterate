import { Command } from 'commander';
import { ArchiveManager } from '../core/archive-manager.js';
import { ConfigManager } from '../core/config-manager.js';
import { Logger } from '../utils/logger.js';
import { getWorkspacePath } from '../utils/paths.js';
import { remove } from '../utils/fs.js';

/**
 * Archive management commands
 */
export function archiveCommand(): Command {
  const cmd = new Command('archive')
    .description('Archive management');

  // archive save <workspace>
  cmd
    .command('save')
    .description('Archive a workspace')
    .argument('<name>', 'Workspace name')
    .option('--keep', 'Keep workspace after archiving (default: remove)')
    .action(async (name: string, options: { keep?: boolean }, command: Command) => {
      const logger = new Logger(command.optsWithGlobals().colors !== false);

      try {
        const config = await ConfigManager.load(command.optsWithGlobals());
        const runtimeConfig = config.getConfig();

        const archiveManager = new ArchiveManager(
          runtimeConfig.archiveDir,
          runtimeConfig.workspacesDir
        );

        logger.info(`Archiving workspace: ${name}`);

        const archiveName = await archiveManager.archive(name);

        logger.success(`Workspace archived: ${archiveName}`);
        logger.log(`  Location: ${runtimeConfig.archiveDir}/${archiveName}`);

        // Remove workspace unless --keep specified
        if (!options.keep) {
          const workspacePath = getWorkspacePath(name, runtimeConfig.workspacesDir);
          await remove(workspacePath);
          logger.info(`Workspace removed: ${name}`);
        }

      } catch (error) {
        logger.error('Failed to archive workspace', error as Error);
        process.exit(1);
      }
    });

  // archive list
  cmd
    .command('list')
    .alias('ls')
    .description('List all archives')
    .action(async (_options: unknown, command: Command) => {
      const logger = new Logger(command.optsWithGlobals().colors !== false);

      try {
        const config = await ConfigManager.load(command.optsWithGlobals());
        const runtimeConfig = config.getConfig();

        const archiveManager = new ArchiveManager(
          runtimeConfig.archiveDir,
          runtimeConfig.workspacesDir
        );

        const archives = await archiveManager.listArchives();

        if (archives.length === 0) {
          logger.info('No archives found');
          logger.log('  Archive a workspace: claude-iterate archive save <workspace>');
          return;
        }

        logger.header('Archived Workspaces');
        logger.line();

        for (const archive of archives) {
          logger.log(`📦 ${archive.name}`);
          logger.log(`   Original: ${archive.metadata.originalName}`);
          logger.log(`   Archived: ${new Date(archive.metadata.archivedAt).toLocaleString()}`);
          logger.line();
        }

        logger.info(`Total: ${archives.length} archive(s)`);

      } catch (error) {
        logger.error('Failed to list archives', error as Error);
        process.exit(1);
      }
    });

  // archive restore <name> [workspace]
  cmd
    .command('restore')
    .description('Restore archive to workspace')
    .argument('<archive>', 'Archive name')
    .argument('[workspace]', 'New workspace name (default: original name)')
    .action(async (archiveName: string, workspaceName: string | undefined, _options: unknown, command: Command) => {
      const logger = new Logger(command.optsWithGlobals().colors !== false);

      try {
        const config = await ConfigManager.load(command.optsWithGlobals());
        const runtimeConfig = config.getConfig();

        const archiveManager = new ArchiveManager(
          runtimeConfig.archiveDir,
          runtimeConfig.workspacesDir
        );

        logger.info(`Restoring archive: ${archiveName}`);

        const restoredName = await archiveManager.restore(archiveName, workspaceName);

        logger.success(`Archive restored: ${restoredName}`);
        logger.line();
        logger.info('Next steps:');
        logger.log(`  • Show: claude-iterate show ${restoredName}`);
        logger.log(`  • Run: claude-iterate run ${restoredName}`);

      } catch (error) {
        logger.error('Failed to restore archive', error as Error);
        process.exit(1);
      }
    });

  // archive show <name>
  cmd
    .command('show')
    .description('Show archive details')
    .argument('<name>', 'Archive name')
    .action(async (name: string, _options: unknown, command: Command) => {
      const logger = new Logger(command.optsWithGlobals().colors !== false);

      try {
        const config = await ConfigManager.load(command.optsWithGlobals());
        const runtimeConfig = config.getConfig();

        const archiveManager = new ArchiveManager(
          runtimeConfig.archiveDir,
          runtimeConfig.workspacesDir
        );

        const archive = await archiveManager.getArchive(name);

        logger.header(`Archive: ${archive.name}`);
        logger.line();
        logger.log(`📦 Archive Name: ${archive.metadata.archiveName}`);
        logger.log(`📂 Original Name: ${archive.metadata.originalName}`);
        logger.log(`📅 Archived At: ${new Date(archive.metadata.archivedAt).toLocaleString()}`);
        logger.log(`📁 Location: ${archive.path}`);

      } catch (error) {
        logger.error('Failed to show archive', error as Error);
        process.exit(1);
      }
    });

  // archive delete <name>
  cmd
    .command('delete')
    .alias('rm')
    .description('Delete an archive')
    .argument('<name>', 'Archive name')
    .option('-f, --force', 'Skip confirmation')
    .action(async (name: string, options: { force?: boolean }, command: Command) => {
      const logger = new Logger(command.optsWithGlobals().colors !== false);

      try {
        const config = await ConfigManager.load(command.optsWithGlobals());
        const runtimeConfig = config.getConfig();

        const archiveManager = new ArchiveManager(
          runtimeConfig.archiveDir,
          runtimeConfig.workspacesDir
        );

        // Confirm unless --force
        if (!options.force) {
          logger.warn(`This will permanently delete archive: ${name}`);
          logger.log('Use --force to skip this confirmation');
          process.exit(0);
        }

        await archiveManager.delete(name);
        logger.success(`Archive deleted: ${name}`);

      } catch (error) {
        logger.error('Failed to delete archive', error as Error);
        process.exit(1);
      }
    });

  return cmd;
}
