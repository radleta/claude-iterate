import { Command } from 'commander';
import { createRequire } from 'module';
import { initCommand } from './commands/init.js';
import { setupCommand } from './commands/setup.js';
import { editCommand } from './commands/edit.js';
import { validateCommand } from './commands/validate.js';
import { verifyCommand } from './commands/verify.js';
import { runCommand } from './commands/run.js';
import { listCommand } from './commands/list.js';
import { showCommand } from './commands/show.js';
import { cleanCommand } from './commands/clean.js';
import { resetCommand } from './commands/reset.js';
import { templateCommand } from './commands/template.js';
import { archiveCommand } from './commands/archive.js';
import { configCommand } from './commands/config.js';

// Import version from package.json
const require = createRequire(import.meta.url);
const { version: VERSION } = require('../package.json');

/**
 * Main CLI setup
 */
export async function cli() {
  const program = new Command();

  program
    .name('claude-iterate')
    .description('Task iteration system with Claude Code')
    .version(VERSION);

  // Global options
  program
    .option('--workspaces-dir <path>', 'Workspaces directory')
    .option('--templates-dir <path>', 'Templates directory')
    .option('--archive-dir <path>', 'Archive directory')
    .option('--no-colors', 'Disable colored output')
    .option('--verbose', 'Verbose output');

  // Commands
  program.addCommand(initCommand());
  program.addCommand(setupCommand());
  program.addCommand(editCommand());
  program.addCommand(validateCommand());
  program.addCommand(verifyCommand());
  program.addCommand(runCommand());
  program.addCommand(listCommand());
  program.addCommand(showCommand());
  program.addCommand(cleanCommand());
  program.addCommand(resetCommand());
  program.addCommand(templateCommand());
  program.addCommand(archiveCommand());
  program.addCommand(configCommand());

  await program.parseAsync(process.argv);
}
