import { Command } from 'commander';
import { join } from 'path';
import { Workspace } from '../core/workspace.js';
import { ConfigManager } from '../core/config-manager.js';
import { ClaudeClient } from '../services/claude-client.js';
import { NotificationService } from '../services/notification-service.js';
import { FileLogger } from '../services/file-logger.js';
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
    .option('--stagnation-threshold <number>', 'Stop after N consecutive no-work iterations (iterative mode only, 0=never)', parseInt)
    .option('--dangerously-skip-permissions', 'Skip permission prompts (runtime only, not saved to config)')
    .option('--dry-run', 'Use mock Claude for testing (logs to /tmp/mock-claude.log)')
    .action(
      async (
        name: string,
        options: {
          maxIterations?: number;
          delay?: number | false;
          stagnationThreshold?: number;
          dangerouslySkipPermissions?: boolean;
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

          // Apply config fallback for notification settings if not in metadata
          // Priority: Workspace metadata > Config file
          if (!metadata.notifyUrl && runtimeConfig.notifyUrl) {
            metadata.notifyUrl = runtimeConfig.notifyUrl;
          }
          if ((!metadata.notifyEvents || metadata.notifyEvents.length === 0) && runtimeConfig.notifyEvents) {
            metadata.notifyEvents = runtimeConfig.notifyEvents as Array<'setup_complete' | 'execution_start' | 'iteration' | 'iteration_milestone' | 'completion' | 'error' | 'all'>;
          }

          logger.header(`Running iteration loop: ${name}`);
          logger.log(`  🔧 Mode: ${metadata.mode}`);
          logger.log(`  📊 Max iterations: ${maxIterations}`);
          logger.log(`  ⏱️  Delay: ${delay}s`);
          if (options.dryRun) {
            logger.log(`  🧪 DRY RUN: Using mock Claude`);
          }
          logger.line();

          // Create Claude client (use mock if --dry-run)
          let claudeCommand = runtimeConfig.claudeCommand;
          let claudeArgs = [...runtimeConfig.claudeArgs]; // Clone to avoid mutation

          // Runtime override: Add --dangerously-skip-permissions if specified (NOT saved to config)
          if (options.dangerouslySkipPermissions) {
            if (!claudeArgs.includes('--dangerously-skip-permissions')) {
              claudeArgs.push('--dangerously-skip-permissions');
              logger.warn('⚠️  Using --dangerously-skip-permissions (runtime override)');
            }
          }

          if (options.dryRun) {
            // Use Node.js mock (cross-platform)
            claudeCommand = 'node';
            claudeArgs = [
              `${process.cwd()}/mock-claude.cjs`,
              ...claudeArgs,
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

          // Create file logger with timestamped filename
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          const logPath = join(workspace.path, `iterate-${timestamp}.log`);
          const fileLogger = new FileLogger(logPath, true);

          // Log workspace info if verbose
          if (runtimeConfig.verbose && fileLogger.isEnabled()) {
            logger.log(`  📝 Logging to: ${logPath}`);
            logger.line();
          }

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
          let noWorkCount = 0; // Track consecutive no-work iterations

          // Get stagnation threshold (from CLI override, workspace metadata, or config)
          const stagnationThreshold = options.stagnationThreshold ?? metadata.stagnationThreshold ?? runtimeConfig.stagnationThreshold;

          while (iterationCount < maxIterations && !isComplete) {
            iterationCount++;

            logger.info(`Iteration ${iterationCount}/${maxIterations}`);

            // Generate prompts (mode-aware) with status instructions
            const systemPrompt = await getIterationSystemPrompt(workspace.path, metadata.mode);
            const prompt = await getIterationPrompt(instructions, iterationCount, metadata.mode, workspace.path);

            try {
              // Log iteration start
              await fileLogger.logIterationStart(iterationCount, prompt, systemPrompt);

              // Execute Claude non-interactively from project root with iteration context
              // Stream output to file and console (if verbose)
              await client.executeNonInteractive(
                prompt,
                systemPrompt,
                undefined,
                {
                  onStdout: (chunk) => {
                    // Always log to file (async, but don't await in callback)
                    fileLogger.appendOutput(chunk);

                    // Show to console if verbose
                    if (runtimeConfig.verbose) {
                      process.stdout.write(chunk);
                    }
                  },
                  onStderr: (chunk) => {
                    // Always log to file
                    fileLogger.appendOutput(chunk);

                    // Show to console if verbose
                    if (runtimeConfig.verbose) {
                      process.stderr.write(chunk);
                    }
                  }
                }
              );

              // Increment iteration count and update metadata
              const updatedMetadata = await workspace.incrementIterations('execution');
              // Update in-memory metadata to ensure notification checks use fresh data
              Object.assign(metadata, updatedMetadata);

              // Check completion
              isComplete = await workspace.isComplete();
              const remainingCount = await workspace.getRemainingCount();

              // Stagnation detection (iterative mode only)
              if (metadata.mode === 'iterative' && !isComplete) {
                const status = await workspace.getStatus();
                if (status.worked === false) {
                  noWorkCount++;
                  logger.debug(`No work detected (${noWorkCount}/${stagnationThreshold})`, runtimeConfig.verbose);

                  if (stagnationThreshold > 0 && noWorkCount >= stagnationThreshold) {
                    logger.line();
                    logger.warn(`⚠️  Stagnation detected: ${noWorkCount} consecutive iterations with no work`);
                    logger.info('Marking task as complete due to stagnation threshold');
                    isComplete = true;
                  }
                } else {
                  noWorkCount = 0; // Reset counter on any work
                }
              }

              // Log iteration completion
              await fileLogger.logIterationComplete(
                iterationCount,
                'success',
                remainingCount
              );

              if (isComplete) {
                logger.line();
                logger.success('✅ Task completed!');

                // Show status from .status.json
                const status = await workspace.getStatus();
                if (status.summary) {
                  logger.log(`   ${status.summary}`);
                }
                // Only show progress for loop mode
                if (status.progress) {
                  logger.log(`   Progress: ${status.progress.completed}/${status.progress.total}`);
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

              // Show progress from .status.json (loop mode) or summary (iterative mode)
              const status = await workspace.getStatus();
              if (status.progress && status.progress.total > 0) {
                // Loop mode: show progress counts
                logger.log(`   Progress: ${status.progress.completed}/${status.progress.total}`);
                const remaining = status.progress.total - status.progress.completed;
                if (remaining > 0) {
                  logger.log(`   Remaining: ${remaining}`);
                }
              } else if (status.worked !== undefined) {
                // Iterative mode: show work status
                if (status.summary) {
                  logger.log(`   ${status.summary}`);
                }
              } else if (remainingCount !== null) {
                // Fallback to legacy remaining count
                logger.log(`   Remaining: ${remainingCount}`);
              }

              // Send iteration notification (after each iteration)
              if (
                notificationService.isConfigured(metadata) &&
                notificationService.shouldNotify('iteration', metadata) &&
                metadata.notifyUrl
              ) {
                await notificationService.send(
                  `ITERATION ${iterationCount}/${maxIterations}\n\nWorkspace: ${name}\nStatus: In progress\nRemaining: ${remainingCount !== null ? remainingCount : 'unknown'}`,
                  {
                    url: metadata.notifyUrl,
                    title: `Iteration ${iterationCount}`,
                    tags: ['claude-iterate', 'iteration'],
                  }
                );
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
              // Log error to file
              await fileLogger.logError(iterationCount, error as Error);

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

          // Flush any remaining log buffer
          await fileLogger.flush();

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
          if (fileLogger.isEnabled()) {
            logger.log(`Log file: ${fileLogger.getLogPath()}`);
          }
        } catch (error) {
          logger.error('Run failed', error as Error);
          process.exit(1);
        }
      }
    );
}
