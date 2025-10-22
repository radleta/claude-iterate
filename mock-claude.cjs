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

// Emit NDJSON event for stream-json format
function emitEvent(event) {
  console.log(JSON.stringify(event));
}

// Emit tool events for stream-json format
function emitStreamJsonResponse(textResponse) {
  // Emit tool_use for Read
  emitEvent({
    type: 'assistant',
    message: {
      content: [
        {
          type: 'tool_use',
          name: 'Read',
          input: {
            file_path: '/workspace/repo/TODO.md',
          },
        },
      ],
    },
  });

  // Emit tool_result for Read
  emitEvent({
    type: 'user',
    message: {
      content: [
        {
          type: 'tool_result',
          content: 'File read successfully',
        },
      ],
    },
  });

  // Emit tool_use for Write
  emitEvent({
    type: 'assistant',
    message: {
      content: [
        {
          type: 'tool_use',
          name: 'Write',
          input: {
            file_path: '/workspace/repo/.status.json',
          },
        },
      ],
    },
  });

  // Emit tool_result for Write
  emitEvent({
    type: 'user',
    message: {
      content: [
        {
          type: 'tool_result',
          content: 'File created successfully',
        },
      ],
    },
  });

  // Emit text response
  emitEvent({
    type: 'assistant',
    message: {
      content: [
        {
          type: 'text',
          text: textResponse,
        },
      ],
    },
  });

  // Emit final result
  emitEvent({
    type: 'result',
    result: textResponse,
  });
}

// Parse command line arguments
let printMode = false;
let systemPrompt = '';
let userPrompt = '';
let skipPerms = false;
let outputFormat = 'text';
let verboseMode = false;

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

    case '--output-format':
      i++;
      outputFormat = args[i];
      log(`Arg ${i - 1}: --output-format`);
      log(`Arg ${i}: ${outputFormat}`);
      break;

    case '--verbose':
      verboseMode = true;
      log(`Arg ${i}: --verbose`);
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
log(`  OUTPUT_FORMAT: ${outputFormat}`);
log(`  VERBOSE_MODE: ${verboseMode}`);
log(`  SYSTEM_PROMPT length: ${systemPrompt.length}`);
log(`  USER_PROMPT length: ${userPrompt.length}`);
log('');

// If --print mode, simulate Claude response
if (printMode) {
  // Simulate processing delay
  setTimeout(() => {
    // Check for stagnation tests
    const stagnationMatch = userPrompt.match(/stagnation-test-(\d+)/);

    if (stagnationMatch) {
      const testNum = parseInt(stagnationMatch[1]);

      const workspaceName = `stagnation-test-${testNum}`;
      const workspacePath = path.join(process.cwd(), 'claude-iterate', 'workspaces', workspaceName);
      const statusPath = path.join(workspacePath, '.status.json');
      const todoPath = path.join(workspacePath, 'TODO.md');
      const metadataPath = path.join(workspacePath, '.metadata.json');

      // Read metadata to get current iteration count
      let iteration = 1;
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        iteration = metadata.executionIterations + 1; // Next iteration to run
        log(`Read metadata: executionIterations=${metadata.executionIterations}, next=${iteration}`);
      } catch (e) {
        log(`Could not read metadata, defaulting to iteration 1`);
      }

      log(`Stagnation test ${testNum}, iteration ${iteration}`);

      let statusContent = {};
      let todoContent = '';
      let response = '';

      if (testNum === 1) {
        // Test 1: Default stagnation (threshold=2)
        if (iteration === 1) {
          response = 'Iteration 1: Doing some work...';
          statusContent = { complete: false, worked: true, summary: 'Did some work' };
          todoContent = '# TODO\n\n- [x] Did work in iteration 1\n- [ ] Pending work';
        } else if (iteration === 2) {
          response = 'Iteration 2: No work to do...';
          statusContent = { complete: false, worked: false, summary: 'No work done (1/2)' };
          todoContent = '# TODO\n\n- [x] Did work in iteration 1\n- [ ] Pending work\n\nIteration 2: No work done (stagnation count: 1)';
        } else {
          response = 'Iteration 3: Still no work to do...';
          statusContent = { complete: false, worked: false, summary: 'No work done (2/2)' };
          todoContent = '# TODO\n\n- [x] Did work in iteration 1\n- [ ] Pending work\n\nIteration 3: No work done (stagnation count: 2) - should trigger stagnation detection';
        }
      } else if (testNum === 2) {
        // Test 2: Custom threshold (3)
        if (iteration === 1) {
          response = 'Iteration 1: Doing work...';
          statusContent = { complete: false, worked: true, summary: 'Did work' };
          todoContent = '# TODO\n\n- [x] Work done';
        } else if (iteration === 2) {
          response = 'Iteration 2: No work...';
          statusContent = { complete: false, worked: false, summary: 'No work (1/3)' };
          todoContent = '# TODO\n\n- [x] Work done\n\nNo work (1/3)';
        } else if (iteration === 3) {
          response = 'Iteration 3: Still no work...';
          statusContent = { complete: false, worked: false, summary: 'No work (2/3)' };
          todoContent = '# TODO\n\n- [x] Work done\n\nNo work (2/3)';
        } else {
          response = 'Iteration 4: Still no work...';
          statusContent = { complete: false, worked: false, summary: 'No work (3/3)' };
          todoContent = '# TODO\n\n- [x] Work done\n\nNo work (3/3) - should trigger stagnation';
        }
      } else if (testNum === 3) {
        // Test 3: Disabled stagnation (threshold=0)
        if (iteration <= 5) {
          response = `Iteration ${iteration}: No work but threshold is 0...`;
          statusContent = { complete: false, worked: false, summary: `No work but threshold is 0 (iteration ${iteration})` };
          todoContent = `# TODO\n\nIteration ${iteration}: No work but stagnation disabled`;
        } else {
          response = 'Iteration 6: Finally completing...';
          statusContent = { complete: true, worked: true, summary: 'Task complete' };
          todoContent = '# TODO\n\n- [x] Task complete';
        }
      } else if (testNum === 4) {
        // Test 4: Work resumes (counter resets)
        if (iteration === 1) {
          response = 'Iteration 1: Doing work...';
          statusContent = { complete: false, worked: true, summary: 'Did work' };
          todoContent = '# TODO\n\n- [x] Work 1';
        } else if (iteration === 2) {
          response = 'Iteration 2: No work...';
          statusContent = { complete: false, worked: false, summary: 'No work (1/2)' };
          todoContent = '# TODO\n\n- [x] Work 1\n\nNo work (1/2)';
        } else if (iteration === 3) {
          response = 'Iteration 3: Work resumes! Counter should reset...';
          statusContent = { complete: false, worked: true, summary: 'Work resumed' };
          todoContent = '# TODO\n\n- [x] Work 1\n- [x] Work resumed\n\nCounter reset!';
        } else if (iteration === 4) {
          response = 'Iteration 4: No work again...';
          statusContent = { complete: false, worked: false, summary: 'No work (1/2)' };
          todoContent = '# TODO\n\n- [x] Work 1\n- [x] Work resumed\n\nNo work (1/2)';
        } else {
          response = 'Iteration 5: Still no work...';
          statusContent = { complete: false, worked: false, summary: 'No work (2/2)' };
          todoContent = '# TODO\n\n- [x] Work 1\n- [x] Work resumed\n\nNo work (2/2) - should trigger stagnation';
        }
      }

      // Write status and TODO files
      fs.writeFileSync(statusPath, JSON.stringify(statusContent, null, 2));
      fs.writeFileSync(todoPath, todoContent);

      if (outputFormat === 'stream-json') {
        emitStreamJsonResponse(response);
      } else {
        console.log(response);
      }
      log(`Wrote status: ${JSON.stringify(statusContent)}`);
      log('SUCCESS');
      process.exit(0);
    } else if (userPrompt.includes('output.txt')) {
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

      if (outputFormat === 'stream-json') {
        emitStreamJsonResponse(
          'Task complete! All items have been checked off.'
        );
      }
    } else {
      const response = `Mock response for: ${userPrompt.slice(0, 50)}...\n\nSystem prompt received: ${systemPrompt.length} characters\nThis is a mock Claude response.`;

      if (outputFormat === 'stream-json') {
        emitStreamJsonResponse(response);
      } else {
        console.log(response);
      }
    }

    log('SUCCESS');
    process.exit(0);
  }, 500);
} else {
  console.error('Error: Only --print mode is supported by mock');
  log('ERROR: Not in print mode');
  process.exit(1);
}
