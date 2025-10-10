#!/usr/bin/env node
/**
 * Mock Claude CLI for integration testing
 * Cross-platform replacement for mock-claude.sh
 * Accepts the same flags as claude CLI and sleeps for the duration specified in the prompt
 */

let sleepDuration = null;

// Parse arguments
const args = process.argv.slice(2);

for (const arg of args) {
  // Ignore Claude-specific flags
  if (arg === '--print' || arg === '--dangerously-skip-permissions') {
    continue;
  }

  // Treat as the duration (prompt)
  sleepDuration = parseFloat(arg);
}

// Sleep for the specified duration
if (sleepDuration !== null && !isNaN(sleepDuration)) {
  setTimeout(() => {
    process.exit(0);
  }, sleepDuration * 1000);
} else {
  console.error('No duration specified');
  process.exit(1);
}
