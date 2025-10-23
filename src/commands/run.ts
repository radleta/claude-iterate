import { Command } from 'commander';
import { join } from 'path';
import { Workspace } from '../core/workspace.js';
import { ConfigManager } from '../core/config-manager.js';
import { ClaudeClient } from '../services/claude-client.js';
import { NotificationService } from '../services/notification-service.js';
import { StatusFileWatcher } from '../services/status-file-watcher.js';
import { FileLogger } from '../services/file-logger.js';
import { ConsoleReporter } from '../services/console-reporter.js';
import { Logger } from '../utils/logger.js';
import { getWorkspacePath } from '../utils/paths.js';
import {
  getIterationPrompt,
  getIterationSystemPrompt,
} from '../templates/system-prompt.js';
import { StatusChangedEvent } from '../types/notification.js';

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
    .option(
      '--stagnation-threshold <number>',
      'Stop after N consecutive no-work iterations (iterative mode only, 0=never)',
      parseInt
    )
    .option(
      '-v, --verbose',
      'Show full Claude output (equivalent to --output verbose)'
    )
    .option(
      '-q, --quiet',
      'Silent execution, errors only (equivalent to --output quiet)'
    )
    .option('--output <level>', 'Output level: quiet, progress, verbose')
    .option(
      '--dangerously-skip-permissions',
      'Skip permission prompts (runtime only, not saved to config)'
    )
    .option(
      '--dry-run',
      'Use mock Claude for testing (logs to /tmp/mock-claude.log)'
    )
    .action(
      async (
        name: string,
        options: {
          maxIterations?: number;
          delay?: number | false;
          stagnationThreshold?: number;
          verbose?: boolean;
          quiet?: boolean;
          output?: string;
          dangerouslySkipPermissions?: boolean;
          dryRun?: boolean;
        },
        command: Command
      ) => {
        const logger = new Logger(command.optsWithGlobals().colors !== false);

        try {
          // Validate conflicting output flags
          const hasVerbose = options.verbose === true;
          const hasQuiet = options.quiet === true;
          const hasOutput = options.output !== undefined;

          if (
            (hasVerbose && hasQuiet) ||
            (hasVerbose && hasOutput) ||
            (hasQuiet && hasOutput)
          ) {
            logger.error(
              'Cannot use multiple output flags (--verbose, --quiet, --output) together'
            );
            process.exit(1);
          }

          // Load config to get workspacesDir
          const configForPath = await ConfigManager.load(
            command.optsWithGlobals()
          );
          const workspacePath = getWorkspacePath(
            name,
            configForPath.get('workspacesDir')
          );

          // Load workspace to get metadata
          const workspace = await Workspace.load(name, workspacePath);
          const metadata = await workspace.getMetadata();

          // Reload config with workspace metadata for workspace-level overrides
          const config = await ConfigManager.load(
            command.optsWithGlobals(),
            metadata
          );
          const runtimeConfig = config.getConfig();

          // Create console reporter with configured output level (from merged config)
          const reporter = new ConsoleReporter(runtimeConfig.outputLevel);

          // Check if instructions exist
          if (!(await workspace.hasInstructions())) {
            logger.error('Instructions not found. Run setup first:');
            logger.log(`  claude-iterate setup ${name}`);
            process.exit(1);
          }

          // Determine settings (CLI overrides already applied in runtimeConfig)
          const maxIterations =
            options.maxIterations ?? runtimeConfig.maxIterations;
          const delay =
            options.delay === false
              ? 0
              : (options.delay ?? runtimeConfig.delay);

          // Show initial run info using reporter (respects output level)
          reporter.progress(
            `Starting claude-iterate run for workspace: ${name}`
          );
          reporter.progress(
            `Mode: ${metadata.mode} | Max iterations: ${maxIterations} | Delay: ${delay}s`
          );
          if (options.dryRun) {
            reporter.progress(`🧪 DRY RUN: Using mock Claude`);
          }
          reporter.progress('');

          // Create Claude client (use mock if --dry-run)
          let claudeCommand = runtimeConfig.claudeCommand;
          let claudeArgs = [...runtimeConfig.claudeArgs]; // Clone to avoid mutation

          // Runtime override: Add --dangerously-skip-permissions if specified (NOT saved to config)
          if (options.dangerouslySkipPermissions) {
            if (!claudeArgs.includes('--dangerously-skip-permissions')) {
              claudeArgs.push('--dangerously-skip-permissions');
              logger.warn(
                '⚠️  Using --dangerously-skip-permissions (runtime override)'
              );
            }
          }

          if (options.dryRun) {
            // Use Node.js mock (cross-platform)
            claudeCommand = 'node';
            claudeArgs = [`${process.cwd()}/mock-claude.cjs`, ...claudeArgs];
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
          const notificationService = new NotificationService(
            logger,
            runtimeConfig.verbose
          );

          // Create file logger with timestamped filename
          const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, '-')
            .slice(0, -5);
          const logPath = join(workspace.path, `iterate-${timestamp}.log`);
          const fileLogger = new FileLogger(logPath, true);

          // Log workspace info if verbose
          if (fileLogger.isEnabled()) {
            reporter.verbose(`📝 Logging to: ${logPath}`);
          }

          // Log static content once at run start
          await fileLogger.logRunStart({
            workspace: name,
            mode: metadata.mode,
            maxIterations,
            startTime: new Date(),
          });

          // Log instructions once
          await fileLogger.logInstructions(instructions);

          // Generate and log system prompt once
          const systemPrompt = await getIterationSystemPrompt(
            workspace.path,
            metadata.mode
          );
          await fileLogger.logSystemPrompt(systemPrompt);

          // Generate and log status instructions once (if exists)
          try {
            const statusInstructionsPath = join(
              workspace.path,
              '.status-instructions.md'
            );
            const { readFile } = await import('fs/promises');
            const statusInstructions = await readFile(
              statusInstructionsPath,
              'utf-8'
            );
            await fileLogger.logStatusInstructions(statusInstructions);
          } catch {
            // Status instructions file might not exist, that's okay
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

          // Setup status file watcher for real-time notifications
          const statusPath = join(workspace.path, '.status.json');
          const statusWatcher = new StatusFileWatcher(statusPath, {
            debounceMs:
              runtimeConfig.notification?.statusWatch?.debounceMs ?? 2000,
            notifyOnlyMeaningful:
              runtimeConfig.notification?.statusWatch?.notifyOnlyMeaningful ??
              true,
          });

          // Track current iteration for status update notifications
          let currentIteration = 0;

          // Subscribe to status changes
          if (
            runtimeConfig.notification?.statusWatch?.enabled !== false &&
            notificationService.isConfigured(metadata) &&
            notificationService.shouldNotify('status_update', metadata) &&
            metadata.notifyUrl
          ) {
            const notifyUrl = metadata.notifyUrl; // Capture for closure
            statusWatcher.on('statusChanged', (event: StatusChangedEvent) => {
              const { current, delta } = event;

              // Format message
              const parts: string[] = [];

              if (current.progress) {
                const { completed, total } = current.progress;
                parts.push(`${completed}/${total} items`);

                if (delta.completedDelta > 0) {
                  parts.push(`(+${delta.completedDelta})`);
                }
              }

              if (current.summary) {
                parts.push(current.summary);
              }

              if (current.complete) {
                parts.push('✅ Complete!');
              }

              const message = `STATUS UPDATE\n\n${parts.join(' - ')}`;

              // Send notification (async, don't await to not block file watcher)
              notificationService
                .send(message, {
                  url: notifyUrl,
                  title: `[${name}] Progress Update (Iteration ${currentIteration})`,
                  priority: current.complete ? 'high' : 'default',
                  tags: [
                    'claude-iterate',
                    'progress',
                    `iteration-${currentIteration}`,
                  ],
                })
                .catch((error) => {
                  logger.debug(
                    `Status update notification failed: ${error}`,
                    true
                  );
                });
            });

            // Start watching
            statusWatcher.start();
          }

          // Iteration loop
          let iterationCount = 0;
          let isComplete = false;
          let noWorkCount = 0; // Track consecutive no-work iterations

          // Get stagnation threshold (from CLI override, workspace metadata, or config)
          const stagnationThreshold =
            options.stagnationThreshold ??
            metadata.stagnationThreshold ??
            runtimeConfig.stagnationThreshold;

          try {
            while (iterationCount < maxIterations && !isComplete) {
              iterationCount++;
              currentIteration = iterationCount;

              reporter.progress(`\nRunning iteration ${iterationCount}...`);

              // Generate prompts (mode-aware) with status instructions
              // Note: System prompt already logged once at start
              const prompt = await getIterationPrompt(
                instructions,
                iterationCount,
                metadata.mode,
                workspace.path
              );

              try {
                // Log iteration start (no longer includes prompt - logged once at run start)
                await fileLogger.logIterationStart(iterationCount, new Date());

                // Execute Claude with appropriate method based on output level
                // Verbose mode: Show tool usage in real-time
                // Progress/Quiet: Use standard non-interactive mode
                if (reporter.getLevel() === 'verbose') {
                  await client.executeWithToolVisibility(
                    prompt,
                    systemPrompt,
                    undefined,
                    {
                      onToolEvent: (formatted) => {
                        // Show tool events in console (verbose level)
                        reporter.verbose(formatted);

                        // Always log to file
                        fileLogger.appendOutput(formatted + '\n');
                      },
                      onRawOutput: (chunk) => {
                        // Log raw output to file for debugging
                        fileLogger.appendOutput(chunk);
                      },
                      onError: (err) => {
                        // Parse errors logged but don't show to user
                        logger.debug(
                          `Stream parse error: ${err.message}`,
                          true
                        );
                      },
                    }
                  );
                } else {
                  // Progress/Quiet mode: Use existing non-interactive (no tool visibility)
                  await client.executeNonInteractive(
                    prompt,
                    systemPrompt,
                    undefined,
                    {
                      onStdout: (chunk) => {
                        // Always log to file (async, but don't await in callback)
                        fileLogger.appendOutput(chunk);

                        // Stream to console based on output level
                        reporter.stream(chunk);
                      },
                      onStderr: (chunk) => {
                        // Always log to file
                        fileLogger.appendOutput(chunk);

                        // Stream to console based on output level
                        reporter.stream(chunk);
                      },
                    }
                  );
                }

                // Increment iteration count and update metadata
                const updatedMetadata =
                  await workspace.incrementIterations('execution');
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
                    reporter.verbose(
                      `No work detected (${noWorkCount}/${stagnationThreshold})`
                    );

                    if (
                      stagnationThreshold > 0 &&
                      noWorkCount >= stagnationThreshold
                    ) {
                      logger.line();
                      logger.warn(
                        `⚠️  Stagnation detected: ${noWorkCount} consecutive iterations with no work`
                      );
                      logger.info(
                        'Marking task as complete due to stagnation threshold'
                      );
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
                  reporter.status(
                    '\n✓ Task completed successfully after ' +
                      iterationCount +
                      ' iterations'
                  );

                  // Show status from .status.json
                  const status = await workspace.getStatus();
                  if (status.summary) {
                    reporter.status(`   ${status.summary}`);
                  }
                  // Only show progress for loop mode
                  if (status.progress) {
                    reporter.status(
                      `   Progress: ${status.progress.completed}/${status.progress.total}`
                    );
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
                  const remaining =
                    status.progress.total - status.progress.completed;
                  reporter.status(
                    `✓ Iteration ${iterationCount} complete (${remaining} items remaining)`
                  );
                } else if (status.worked !== undefined) {
                  // Iterative mode: show work status
                  if (status.summary) {
                    reporter.status(`✓ Iteration ${iterationCount} complete`);
                    reporter.status(`   ${status.summary}`);
                  } else {
                    reporter.status(`✓ Iteration ${iterationCount} complete`);
                  }
                } else if (remainingCount !== null) {
                  // Fallback to legacy remaining count
                  reporter.status(
                    `✓ Iteration ${iterationCount} complete (${remainingCount} items remaining)`
                  );
                } else {
                  reporter.status(`✓ Iteration ${iterationCount} complete`);
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
                if (
                  delay > 0 &&
                  iterationCount < maxIterations &&
                  !isComplete
                ) {
                  reporter.verbose(
                    `Waiting ${delay}s before next iteration...`
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
          } finally {
            // Always stop the status watcher
            statusWatcher.stop();
          }
        } catch (error) {
          logger.error('Run failed', error as Error);
          process.exit(1);
        }
      }
    );
}
