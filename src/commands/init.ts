import { Command } from 'commander';
import { Workspace } from '../core/workspace.js';
import { ConfigManager } from '../core/config-manager.js';
import { Logger } from '../utils/logger.js';
import { getWorkspacePath, isValidWorkspaceName } from '../utils/paths.js';
import { ExecutionMode, MODE_DEFINITIONS } from '../types/mode.js';

/**
 * Initialize a new workspace
 */
export function initCommand(): Command {
  return new Command('init')
    .description('Initialize a new workspace')
    .argument('<name>', 'Workspace name')
    .option('-m, --max-iterations <number>', 'Maximum iterations', parseInt)
    .option('-d, --delay <seconds>', 'Delay between iterations (seconds)', parseInt)
    .option('--mode <mode>', 'Execution mode (loop|iterative)', 'loop')
    .option('--completion-markers <markers>', 'Comma-separated completion markers (loop mode only)')
    .option('--notify-url <url>', 'Notification URL (ntfy.sh)')
    .option('--notify-events <events>', 'Comma-separated events: setup_complete,execution_start,iteration_milestone,completion,error,all')
    .action(async (name: string, options: {
      maxIterations?: number;
      delay?: number;
      mode?: string;
      completionMarkers?: string;
      notifyUrl?: string;
      notifyEvents?: string;
    }, command: Command) => {
      const logger = new Logger(command.optsWithGlobals().colors !== false);

      try {
        // Validate workspace name
        if (!isValidWorkspaceName(name)) {
          logger.error('Invalid workspace name. Use only letters, numbers, hyphens, and underscores.');
          process.exit(1);
        }

        // Load config
        const config = await ConfigManager.load(command.optsWithGlobals());
        const runtimeConfig = config.getConfig();

        // Get workspace path
        const workspacePath = getWorkspacePath(name, runtimeConfig.workspacesDir);

        logger.header(`Initializing workspace: ${name}`);

        // Parse mode
        const mode = options.mode?.toLowerCase() === 'iterative'
          ? ExecutionMode.ITERATIVE
          : ExecutionMode.LOOP;

        // Parse notify events if provided
        const notifyEvents = options.notifyEvents
          ? options.notifyEvents.split(',').map(e => e.trim())
          : runtimeConfig.notifyEvents;

        // Parse completion markers if provided
        const completionMarkers = options.completionMarkers
          ? options.completionMarkers.split(',').map(m => m.trim())
          : runtimeConfig.completionMarkers;

        // Determine max iterations with mode-aware defaults
        // If CLI provides maxIterations, use it
        // Otherwise, use mode-specific default (config would need explicit mode-specific values)
        const maxIterations = options.maxIterations !== undefined
          ? options.maxIterations
          : MODE_DEFINITIONS[mode].defaultMaxIterations;

        // Create workspace
        const workspace = await Workspace.init(name, workspacePath, {
          maxIterations,
          delay: options.delay ?? runtimeConfig.delay,
          mode,
          completionMarkers,
          notifyUrl: options.notifyUrl || runtimeConfig.notifyUrl,
          notifyEvents: notifyEvents as Array<'setup_complete' | 'execution_start' | 'iteration_milestone' | 'completion' | 'error' | 'all'>,
        });

        const metadata = await workspace.getMetadata();

        logger.success(`Workspace created: ${name}`);
        logger.line();
        logger.log(`  📁 Path: ${workspace.path}`);
        logger.log(`  🔧 Mode: ${metadata.mode}`);
        logger.log(`  📊 Max iterations: ${metadata.maxIterations}`);
        logger.log(`  ⏱️  Delay: ${metadata.delay}s`);
        logger.line();
        logger.info('Next steps:');
        logger.log(`  1. Set up instructions: claude-iterate setup ${name}`);
        logger.log(`  2. Run the task: claude-iterate run ${name}`);
        logger.line();

      } catch (error) {
        logger.error('Failed to initialize workspace', error as Error);
        process.exit(1);
      }
    });
}
