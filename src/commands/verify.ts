import { Command } from 'commander';
import { Workspace } from '../core/workspace.js';
import { ConfigManager } from '../core/config-manager.js';
import { VerificationService } from '../core/verification-service.js';
import { ConsoleReporter } from '../services/console-reporter.js';
import { Logger } from '../utils/logger.js';
import { getWorkspacePath } from '../utils/paths.js';

/**
 * Verify workspace work completion
 */
export function verifyCommand(): Command {
  return new Command('verify')
    .description('Verify workspace work completion')
    .argument('<name>', 'Workspace name')
    .option('--depth <level>', 'Verification depth: quick, standard, deep')
    .option('--report-path <path>', 'Custom report path')
    .option('--json', 'Output JSON results')
    .option('--show-report', 'Show full report in console')
    .option('-v, --verbose', 'Show full Claude output')
    .option('-q, --quiet', 'Silent execution, errors only')
    .option(
      '--dangerously-skip-permissions',
      'Skip permission prompts (runtime only, not saved to config)'
    )
    .action(
      async (
        name: string,
        options: {
          depth?: string;
          reportPath?: string;
          json?: boolean;
          showReport?: boolean;
          verbose?: boolean;
          quiet?: boolean;
          dangerouslySkipPermissions?: boolean;
        },
        command: Command
      ) => {
        const logger = new Logger(command.optsWithGlobals().colors !== false);

        try {
          // Validate conflicting output flags
          const hasVerbose = options.verbose === true;
          const hasQuiet = options.quiet === true;

          if (hasVerbose && hasQuiet) {
            logger.error('Cannot use both --verbose and --quiet');
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

          // Determine output level
          let outputLevel: 'quiet' | 'progress' | 'verbose' = 'progress';
          if (options.verbose) outputLevel = 'verbose';
          if (options.quiet) outputLevel = 'quiet';

          const reporter = new ConsoleReporter(outputLevel);

          // Runtime override for --dangerously-skip-permissions
          let claudeArgs = [...runtimeConfig.claudeArgs];
          if (options.dangerouslySkipPermissions) {
            if (!claudeArgs.includes('--dangerously-skip-permissions')) {
              claudeArgs.push('--dangerously-skip-permissions');
              logger.warn(
                '⚠️  Using --dangerously-skip-permissions (runtime override)'
              );
            }
          }

          // Check instructions exist
          if (!(await workspace.hasInstructions())) {
            logger.error('Instructions not found. Run setup first:');
            logger.log(`  claude-iterate setup ${name}`);
            process.exit(1);
          }

          logger.header(`Verifying workspace: ${name}`);
          logger.line();

          // Create verification service with modified args
          const verificationServiceConfig = {
            ...runtimeConfig,
            claudeArgs,
          };

          const verificationService = new VerificationService(
            logger,
            verificationServiceConfig
          );

          // Determine depth (CLI > config > default)
          const depth =
            (options.depth as 'quick' | 'standard' | 'deep') ??
            runtimeConfig.verification.depth;

          // Run verification
          const result = await verificationService.verify(workspace, {
            depth,
            reportPath: options.reportPath,
          });

          // Update workspace metadata
          const currentMetadata = await workspace.getMetadata();
          await workspace.updateMetadata({
            verification: {
              lastVerificationStatus: result.status,
              lastVerificationTime: new Date().toISOString(),
              verificationAttempts:
                (currentMetadata.verification?.verificationAttempts ?? 0) + 1,
              verifyResumeCycles:
                currentMetadata.verification?.verifyResumeCycles ?? 0,
            },
          });

          // Output results
          if (options.json) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            // Display summary
            logger.line();
            reporter.progress(result.summary);
            logger.line();

            if (result.status === 'pass') {
              reporter.progress('✅ VERIFICATION PASSED');
            } else if (result.status === 'fail') {
              reporter.progress('❌ VERIFICATION FAILED');
              reporter.progress(`Issues found: ${result.issueCount}`);
            } else {
              reporter.progress('⚠️  NEEDS REVIEW');
            }

            if (options.showReport) {
              logger.line();
              reporter.stream(result.fullReport);
            } else {
              reporter.progress(`\nFull report: ${result.reportPath}`);
            }
          }

          // Exit code
          process.exit(result.status === 'pass' ? 0 : 1);
        } catch (error) {
          logger.error('Verification failed', error as Error);
          process.exit(1);
        }
      }
    );
}
