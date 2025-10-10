import { Command } from 'commander';
import { Workspace } from '../core/workspace.js';
import { ConfigManager } from '../core/config-manager.js';
import { ClaudeClient } from '../services/claude-client.js';
import { NotificationService } from '../services/notification-service.js';
import { Logger } from '../utils/logger.js';
import { getWorkspacePath } from '../utils/paths.js';
import { getIterationPrompt, getIterationSystemPrompt } from '../templates/system-prompt.js';

/**
 * Run workspace iteration loop
 */
export function runCommand(): Command {
  return new Command('run')
    .description('Run workspace iteration loop')
    .argument('<name>', 'Workspace name')
    .option(
      '-m, --max-iterations <number>',
      'Override max iterations',
      parseInt
    )
    .option(
      '-d, --delay <seconds>',
      'Override delay between iterations',
      parseInt
    )
    .option('--no-delay', 'Skip delay between iterations')
    .option('--dry-run', 'Use mock Claude for testing (logs to /tmp/mock-claude.log)')
    .action(
      async (
        name: string,
        options: {
          maxIterations?: number;
          delay?: number | false;
          dryRun?: boolean;
        },
        command: Command
      ) => {
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

          // Get metadata
          const metadata = await workspace.getMetadata();

          // Determine settings
          const maxIterations = options.maxIterations ?? metadata.maxIterations;
          const delay =
            options.delay === false ? 0 : (options.delay ?? metadata.delay);

          logger.header(`Running iteration loop: ${name}`);
          logger.log(`  📊 Max iterations: ${maxIterations}`);
          logger.log(`  ⏱️  Delay: ${delay}s`);
          if (options.dryRun) {
            logger.log(`  🧪 DRY RUN: Using mock Claude`);
          }
          logger.line();

          // Create Claude client (use mock if --dry-run)
          let claudeCommand = runtimeConfig.claudeCommand;
          let claudeArgs = runtimeConfig.claudeArgs;

          if (options.dryRun) {
            // Use Node.js mock (cross-platform)
            claudeCommand = 'node';
            claudeArgs = [
              `${process.cwd()}/mock-claude.js`,
              ...runtimeConfig.claudeArgs,
            ];
          }

          const client = new ClaudeClient(claudeCommand, claudeArgs, logger);

          // Setup graceful shutdown on signals
          let isShuttingDown = false;
          const gracefulShutdown = async (signal: string) => {
            if (isShuttingDown) {
              logger.warn('Forcefully terminating...');
              process.exit(1);
            }

            isShuttingDown = true;
            logger.line();
            logger.warn(`\nReceived ${signal}, shutting down gracefully...`);

            try {
              await client.shutdown(5000);
              logger.success('Cleanup complete');
              process.exit(0);
            } catch (error) {
              logger.error('Cleanup failed', error as Error);
              process.exit(1);
            }
          };

          process.on('SIGINT', () => gracefulShutdown('SIGINT'));
          process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

          // Check if Claude is available
          if (!(await client.isAvailable())) {
            logger.error(
              `Claude CLI not found. Make sure '${runtimeConfig.claudeCommand}' is installed and in PATH.`
            );
            process.exit(1);
          }

          // Read instructions
          const instructions = await workspace.getInstructions();

          // Create notification service
          const notificationService = new NotificationService(logger, runtimeConfig.verbose);

          // Send execution start notification
          if (
            notificationService.isConfigured(metadata) &&
            notificationService.shouldNotify('execution_start', metadata) &&
            metadata.notifyUrl
          ) {
            await notificationService.send(
              `EXECUTION STARTED\n\nWorkspace: ${name}\nMax iterations: ${maxIterations}`,
              {
                url: metadata.notifyUrl,
                title: 'Execution Started',
                tags: ['claude-iterate', 'execution'],
              }
            );
          }

          // Iteration loop
          let iterationCount = 0;
          let isComplete = false;

          while (iterationCount < maxIterations && !isComplete) {
            iterationCount++;

            logger.info(`Iteration ${iterationCount}/${maxIterations}`);

            // Generate prompts
            const systemPrompt = getIterationSystemPrompt(workspace.path);
            const prompt = getIterationPrompt(instructions, iterationCount);

            try {
              // Execute Claude non-interactively from project root with iteration context
              await client.executeNonInteractive(prompt, systemPrompt);

              // Increment iteration count
              await workspace.incrementIterations('execution');

              // Check completion
              isComplete = await workspace.isComplete();
              const remainingCount = await workspace.getRemainingCount();

              if (isComplete) {
                logger.line();
                logger.success('✅ Task completed!');
                if (remainingCount !== null) {
                  logger.log(`   Remaining: ${remainingCount}`);
                }
                await workspace.markCompleted();

                // Send completion notification
                if (
                  notificationService.isConfigured(metadata) &&
                  notificationService.shouldNotify('completion', metadata) &&
                  metadata.notifyUrl
                ) {
                  await notificationService.send(
                    `TASK COMPLETE ✅\n\nWorkspace: ${name}\nTotal iterations: ${iterationCount}\nStatus: All items completed`,
                    {
                      url: metadata.notifyUrl,
                      title: 'Task Complete',
                      priority: 'high',
                      tags: ['claude-iterate', 'completion'],
                    }
                  );
                }

                break;
              }

              if (remainingCount !== null) {
                logger.log(`   Remaining: ${remainingCount}`);
              }

              // Send milestone notification (every 10 iterations)
              if (
                iterationCount % 10 === 0 &&
                notificationService.isConfigured(metadata) &&
                notificationService.shouldNotify(
                  'iteration_milestone',
                  metadata
                ) &&
                metadata.notifyUrl
              ) {
                await notificationService.send(
                  `ITERATION MILESTONE\n\nWorkspace: ${name}\nCompleted: ${iterationCount} iterations\nRemaining: ${remainingCount !== null ? remainingCount : 'unknown'}`,
                  {
                    url: metadata.notifyUrl,
                    title: 'Milestone Reached',
                    tags: ['claude-iterate', 'milestone'],
                  }
                );
              }

              // Delay before next iteration
              if (delay > 0 && iterationCount < maxIterations && !isComplete) {
                logger.debug(
                  `Waiting ${delay}s before next iteration...`,
                  runtimeConfig.verbose
                );
                await new Promise((resolve) =>
                  setTimeout(resolve, delay * 1000)
                );
              }
            } catch (error) {
              logger.error(
                `Iteration ${iterationCount} failed`,
                error as Error
              );
              await workspace.markError();

              // Send error notification
              if (
                notificationService.isConfigured(metadata) &&
                notificationService.shouldNotify('error', metadata) &&
                metadata.notifyUrl
              ) {
                await notificationService.send(
                  `ERROR ENCOUNTERED ⚠️\n\nWorkspace: ${name}\nIteration: ${iterationCount}\nError: ${(error as Error).message}`,
                  {
                    url: metadata.notifyUrl,
                    title: 'Execution Error',
                    priority: 'urgent',
                    tags: ['claude-iterate', 'error'],
                  }
                );
              }

              throw error;
            }

            logger.line();
          }

          if (!isComplete && iterationCount >= maxIterations) {
            logger.warn(`⚠️  Reached maximum iterations (${maxIterations})`);
            logger.line();
            logger.info('Task not yet complete. Options:');
            logger.log(`  • Continue: claude-iterate run ${name}`);
            logger.log(
              `  • Increase limit: claude-iterate run ${name} -m ${maxIterations + 50}`
            );
            logger.log(`  • Check progress: claude-iterate show ${name}`);
          }

          logger.line();
          const info = await workspace.getInfo();
          logger.log(`Total iterations: ${info.totalIterations}`);
          logger.log(
            `Execution iterations: ${metadata.executionIterations + iterationCount}`
          );
        } catch (error) {
          logger.error('Run failed', error as Error);
          process.exit(1);
        }
      }
    );
}
