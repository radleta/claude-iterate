import { Command } from 'commander';
import { Workspace } from '../core/workspace.js';
import { ConfigManager } from '../core/config-manager.js';
import { VerificationService } from '../core/verification-service.js';
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
    .action(async (name: string, options, command: Command) => {
      const logger = new Logger(command.optsWithGlobals().colors !== false);

      try {
        // Load config
        const config = await ConfigManager.load(command.optsWithGlobals());
        const runtimeConfig = config.getConfig();

        // Get workspace
        const workspacePath = getWorkspacePath(
          name,
          runtimeConfig.workspacesDir
        );
        const workspace = await Workspace.load(name, workspacePath);

        // Check instructions exist
        if (!(await workspace.hasInstructions())) {
          logger.error('Instructions not found. Run setup first:');
          logger.log(`  claude-iterate setup ${name}`);
          process.exit(1);
        }

        logger.header(`Verifying workspace: ${name}`);
        logger.line();

        // Create verification service
        const verificationService = new VerificationService(
          logger,
          runtimeConfig
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
          logger.log(result.summary);
          logger.line();

          if (result.status === 'pass') {
            logger.success('✅ VERIFICATION PASSED');
          } else if (result.status === 'fail') {
            logger.error('❌ VERIFICATION FAILED');
            logger.log(`Issues found: ${result.issueCount}`);
          } else {
            logger.warn('⚠️ NEEDS REVIEW');
          }

          if (options.showReport) {
            logger.line();
            logger.log(result.fullReport);
          } else {
            logger.log(`\nFull report: ${result.reportPath}`);
          }
        }

        // Exit code
        process.exit(result.status === 'pass' ? 0 : 1);
      } catch (error) {
        logger.error('Verification failed', error as Error);
        process.exit(1);
      }
    });
}
