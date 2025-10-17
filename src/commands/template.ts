import { Command } from 'commander';
import { Workspace } from '../core/workspace.js';
import { TemplateManager } from '../core/template-manager.js';
import { ConfigManager } from '../core/config-manager.js';
import { Logger } from '../utils/logger.js';
import { getWorkspacePath } from '../utils/paths.js';
import { readText } from '../utils/fs.js';

/**
 * Template management commands
 */
export function templateCommand(): Command {
  const cmd = new Command('template')
    .alias('tpl')
    .description('Template management');

  // template save <workspace> <name>
  cmd
    .command('save')
    .description('Save workspace as template')
    .argument('<workspace>', 'Workspace name')
    .argument('<template>', 'Template name')
    .option('-d, --description <text>', 'Template description')
    .option('-t, --tags <tags>', 'Comma-separated tags')
    .option('-e, --estimated-iterations <number>', 'Estimated iterations', parseInt)
    .option('-g, --global', 'Save to global templates')
    .action(async (workspaceName: string, templateName: string, options: {
      description?: string;
      tags?: string;
      estimatedIterations?: number;
      global?: boolean;
    }, command: Command) => {
      const logger = new Logger(command.optsWithGlobals().colors !== false);

      try {
        // Load config
        const config = await ConfigManager.load(command.optsWithGlobals());
        const runtimeConfig = config.getConfig();

        // Get workspace path
        const workspacePath = getWorkspacePath(workspaceName, runtimeConfig.workspacesDir);

        // Load workspace
        const workspace = await Workspace.load(workspaceName, workspacePath);

        // Check if instructions exist
        if (!(await workspace.hasInstructions())) {
          logger.error('Workspace must have instructions to save as template');
          process.exit(1);
        }

        logger.info(`Saving workspace as template: ${templateName}`);

        // Create template manager
        const templateManager = new TemplateManager(
          runtimeConfig.templatesDir,
          runtimeConfig.globalTemplatesDir
        );

        // Save template
        await templateManager.saveTemplate(workspace.path, templateName, {
          description: options.description,
          tags: options.tags?.split(',').map(t => t.trim()),
          estimatedIterations: options.estimatedIterations,
          global: options.global,
        });

        const location = options.global ? 'global' : 'project';
        logger.success(`Template saved: ${templateName} (${location})`);
        logger.line();
        logger.info('Use template:');
        logger.log(`  claude-iterate template use ${templateName} <new-workspace>`);

      } catch (error) {
        logger.error('Failed to save template', error as Error);
        process.exit(1);
      }
    });

  // template use <name> <workspace>
  cmd
    .command('use')
    .description('Create workspace from template')
    .argument('<template>', 'Template name')
    .argument('<workspace>', 'New workspace name')
    .action(async (templateName: string, workspaceName: string, _options: unknown, command: Command) => {
      const logger = new Logger(command.optsWithGlobals().colors !== false);

      try {
        // Load config
        const config = await ConfigManager.load(command.optsWithGlobals());
        const runtimeConfig = config.getConfig();

        // Get workspace path
        const workspacePath = getWorkspacePath(workspaceName, runtimeConfig.workspacesDir);

        // Create template manager
        const templateManager = new TemplateManager(
          runtimeConfig.templatesDir,
          runtimeConfig.globalTemplatesDir
        );

        // Check if template exists
        if (!(await templateManager.exists(templateName))) {
          logger.error(`Template not found: ${templateName}`);
          logger.log('  List templates: claude-iterate template list');
          process.exit(1);
        }

        logger.info(`Creating workspace from template: ${templateName}`);

        // Get template information
        const templateInfo = await templateManager.getTemplateForInit(templateName);

        // Initialize workspace with template configuration
        await Workspace.init(workspaceName, workspacePath, {
          mode: templateInfo.metadata?.mode,
          maxIterations: templateInfo.metadata?.maxIterations,
          delay: templateInfo.metadata?.delay,
        });

        // Copy INSTRUCTIONS.md from template
        const { copyFile } = await import('../utils/fs.js');
        const { join } = await import('path');
        const instructionsDest = join(workspacePath, 'INSTRUCTIONS.md');
        await copyFile(templateInfo.instructionsPath, instructionsDest);

        logger.success(`Workspace created: ${workspaceName}`);
        logger.line();
        logger.info('Next steps:');
        logger.log(`  • Validate: claude-iterate validate ${workspaceName}`);
        logger.log(`  • Edit (optional): claude-iterate edit ${workspaceName}`);
        logger.log(`  • Run: claude-iterate run ${workspaceName}`);

      } catch (error) {
        logger.error('Failed to use template', error as Error);
        process.exit(1);
      }
    });

  // template list
  cmd
    .command('list')
    .alias('ls')
    .description('List all templates')
    .action(async (_options: unknown, command: Command) => {
      const logger = new Logger(command.optsWithGlobals().colors !== false);

      try {
        // Load config
        const config = await ConfigManager.load(command.optsWithGlobals());
        const runtimeConfig = config.getConfig();

        // Create template manager
        const templateManager = new TemplateManager(
          runtimeConfig.templatesDir,
          runtimeConfig.globalTemplatesDir
        );

        // List templates
        const templates = await templateManager.listTemplates();

        if (templates.length === 0) {
          logger.info('No templates found');
          logger.log('  Save a template: claude-iterate template save <workspace> <template-name>');
          return;
        }

        logger.header('Available Templates');

        // Group by source
        const projectTemplates = templates.filter(t => t.source === 'project');
        const globalTemplates = templates.filter(t => t.source === 'global');

        if (projectTemplates.length > 0) {
          logger.log('📁 Project Templates:');
          logger.line();
          for (const tpl of projectTemplates) {
            logger.log(`  • ${tpl.name}`);
            if (tpl.description) {
              logger.log(`    ${tpl.description}`);
            }
            if (tpl.tags.length > 0) {
              logger.log(`    Tags: ${tpl.tags.join(', ')}`);
            }
            if (tpl.estimatedIterations) {
              logger.log(`    Estimated iterations: ${tpl.estimatedIterations}`);
            }
            logger.line();
          }
        }

        if (globalTemplates.length > 0) {
          logger.log('🌍 Global Templates:');
          logger.line();
          for (const tpl of globalTemplates) {
            logger.log(`  • ${tpl.name}`);
            if (tpl.description) {
              logger.log(`    ${tpl.description}`);
            }
            if (tpl.tags.length > 0) {
              logger.log(`    Tags: ${tpl.tags.join(', ')}`);
            }
            if (tpl.estimatedIterations) {
              logger.log(`    Estimated iterations: ${tpl.estimatedIterations}`);
            }
            logger.line();
          }
        }

        logger.info(`Total: ${templates.length} template(s)`);

      } catch (error) {
        logger.error('Failed to list templates', error as Error);
        process.exit(1);
      }
    });

  // template show <name>
  cmd
    .command('show')
    .description('Show template details')
    .argument('<name>', 'Template name')
    .action(async (name: string, _options: unknown, command: Command) => {
      const logger = new Logger(command.optsWithGlobals().colors !== false);

      try {
        // Load config
        const config = await ConfigManager.load(command.optsWithGlobals());
        const runtimeConfig = config.getConfig();

        // Create template manager
        const templateManager = new TemplateManager(
          runtimeConfig.templatesDir,
          runtimeConfig.globalTemplatesDir
        );

        // Get template
        const template = await templateManager.getTemplate(name);

        logger.header(`Template: ${template.name}`);
        logger.line();

        logger.log(`📁 Source: ${template.source}`);
        logger.log(`📂 Path: ${template.path}`);
        logger.line();

        if (template.metadata) {
          const meta = template.metadata;
          logger.log('ℹ️  Metadata:');
          if (meta.description) {
            logger.log(`   Description: ${meta.description}`);
          }
          if (meta.version) {
            logger.log(`   Version: ${meta.version}`);
          }
          if (meta.tags && meta.tags.length > 0) {
            logger.log(`   Tags: ${meta.tags.join(', ')}`);
          }
          if (meta.estimatedIterations) {
            logger.log(`   Estimated iterations: ${meta.estimatedIterations}`);
          }
          if (meta.author) {
            logger.log(`   Author: ${meta.author}`);
          }
          if (meta.created) {
            logger.log(`   Created: ${new Date(meta.created).toLocaleString()}`);
          }
          logger.line();
        }

        // Show first few lines of instructions
        const instructions = await readText(template.instructionsPath);
        const lines = instructions.split('\n').slice(0, 10);
        logger.log('📄 Instructions preview:');
        logger.log('');
        for (const line of lines) {
          logger.log(`   ${line}`);
        }
        if (instructions.split('\n').length > 10) {
          logger.log('   ...');
        }
        logger.line();

        logger.info('Use template:');
        logger.log(`  claude-iterate template use ${name} <new-workspace>`);

      } catch (error) {
        logger.error('Failed to show template', error as Error);
        process.exit(1);
      }
    });

  // template delete <name>
  cmd
    .command('delete')
    .alias('rm')
    .description('Delete a template')
    .argument('<name>', 'Template name')
    .option('-g, --global', 'Delete from global templates')
    .option('-f, --force', 'Skip confirmation')
    .action(async (name: string, options: { global?: boolean; force?: boolean }, command: Command) => {
      const logger = new Logger(command.optsWithGlobals().colors !== false);

      try {
        // Confirm unless --force
        if (!options.force) {
          const location = options.global ? 'global' : 'project';
          logger.warn(`This will permanently delete template: ${name} (${location})`);
          logger.log('Use --force to skip this confirmation');
          process.exit(0);
        }

        // Load config
        const config = await ConfigManager.load(command.optsWithGlobals());
        const runtimeConfig = config.getConfig();

        // Create template manager
        const templateManager = new TemplateManager(
          runtimeConfig.templatesDir,
          runtimeConfig.globalTemplatesDir
        );

        await templateManager.delete(name, options.global);

        const location = options.global ? 'global' : 'project';
        logger.success(`Template deleted (${location}): ${name}`);

      } catch (error) {
        logger.error('Failed to delete template', error as Error);
        process.exit(1);
      }
    });

  return cmd;
}
