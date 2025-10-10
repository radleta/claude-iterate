#!/usr/bin/env node
/**
 * Mock Claude CLI for testing parameter passing
 * Cross-platform replacement for mock-claude.sh
 * Usage: node mock-claude.js [options] <prompt>
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Log file path (cross-platform)
const logFile = path.join(os.tmpdir(), 'mock-claude.log');

// Log helper
function log(message) {
  fs.appendFileSync(logFile, message + '\n', 'utf8');
}

// Parse command line arguments
let printMode = false;
let systemPrompt = '';
let userPrompt = '';
let skipPerms = false;

log('=== Mock Claude Called ===');
log(`Timestamp: ${new Date().toISOString()}`);
log(`Number of args: ${process.argv.length - 2}`);
log('');

const args = process.argv.slice(2);
let i = 0;

while (i < args.length) {
  const arg = args[i];

  switch (arg) {
    case '--version':
      console.log('mock-claude 1.0.0');
      process.exit(0);
      break;

    case '--print':
    case '-p':
      printMode = true;
      log(`Arg ${i}: --print`);
      break;

    case '--dangerously-skip-permissions':
      skipPerms = true;
      log(`Arg ${i}: --dangerously-skip-permissions`);
      break;

    case '--append-system-prompt':
      i++;
      const systemArg = args[i];
      if (systemArg.startsWith('@')) {
        const filePath = systemArg.slice(1);
        try {
          systemPrompt = fs.readFileSync(filePath, 'utf8');
          log(`Arg ${i - 1}: --append-system-prompt`);
          log(`Arg ${i}: [@${filePath} - ${systemPrompt.length} chars from file]`);
        } catch (error) {
          console.error(`Error: File not found: ${filePath}`);
          process.exit(1);
        }
      } else {
        systemPrompt = systemArg;
        log(`Arg ${i - 1}: --append-system-prompt`);
        log(`Arg ${i}: [SYSTEM_PROMPT - ${systemPrompt.length} chars]`);
      }
      break;

    default:
      // User prompt (may use @file syntax)
      if (arg.startsWith('@')) {
        const filePath = arg.slice(1);
        try {
          userPrompt = fs.readFileSync(filePath, 'utf8');
          log(`Arg ${i}: [@${filePath} - ${userPrompt.length} chars from file]`);
        } catch (error) {
          console.error(`Error: File not found: ${filePath}`);
          process.exit(1);
        }
      } else {
        userPrompt = arg;
        log(`Arg ${i}: [USER_PROMPT - ${userPrompt.length} chars]`);
      }
      break;
  }
  i++;
}

log('');
log('Parsed values:');
log(`  PRINT_MODE: ${printMode}`);
log(`  SKIP_PERMS: ${skipPerms}`);
log(`  SYSTEM_PROMPT length: ${systemPrompt.length}`);
log(`  USER_PROMPT length: ${userPrompt.length}`);
log('');

// If --print mode, simulate Claude response
if (printMode) {
  // Simulate processing delay
  setTimeout(() => {
    // Parse the user prompt to extract task info
    if (userPrompt.includes('output.txt')) {
      const workspacePath = path.join(
        process.cwd(),
        'claude-iterate',
        'workspaces',
        'real-test'
      );

      // Create the output file as requested
      const outputPath = path.join(workspacePath, 'output.txt');
      fs.writeFileSync(
        outputPath,
        '1\n2\n3\n4\n5\n\nCounting complete!\n',
        'utf8'
      );

      // Update TODO.md to mark complete
      const todoPath = path.join(workspacePath, 'TODO.md');
      fs.writeFileSync(
        todoPath,
        `# TODO

- [x] Create output.txt file
- [x] Add numbers 1-5
- [x] Add blank line
- [x] Add completion message

**Remaining: 0**
`,
        'utf8'
      );

      // Simulate Claude's response
      console.log(`I'll complete this simple counting task.

Let me read the current TODO:
<bash>cat ${todoPath}</bash>

Now I'll create the output.txt file with the numbers 1-5:
<bash>cat > ${outputPath} <<'EOF'
1
2
3
4
5

Counting complete!
EOF</bash>

Let me update the TODO to mark everything complete:
<bash>cat > ${todoPath} <<'EOF'
# TODO

- [x] Create output.txt file
- [x] Add numbers 1-5
- [x] Add blank line
- [x] Add completion message

**Remaining: 0**
EOF</bash>

Task complete! All items have been checked off.`);
    } else {
      console.log(`Mock response for: ${userPrompt.slice(0, 50)}...`);
      console.log('');
      console.log(`System prompt received: ${systemPrompt.length} characters`);
      console.log('This is a mock Claude response.');
    }

    log('SUCCESS');
    process.exit(0);
  }, 500);
} else {
  console.error('Error: Only --print mode is supported by mock');
  log('ERROR: Not in print mode');
  process.exit(1);
}
