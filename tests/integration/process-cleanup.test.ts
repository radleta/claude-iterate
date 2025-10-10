import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ClaudeClient } from '../../src/services/claude-client.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Integration tests for process cleanup
 * Uses mock-claude.js Node.js script to simulate Claude CLI behavior (cross-platform)
 */
describe('ClaudeClient - Process Cleanup Integration', () => {
  let client: ClaudeClient;
  const mockClaudePath = join(__dirname, '../helpers/mock-claude.js');

  beforeEach(() => {
    // Use Node.js mock that accepts --print flag like real claude
    client = new ClaudeClient('node', [mockClaudePath]);
  });

  afterEach(async () => {
    // Cleanup any running processes
    if (client.hasRunningChild()) {
      await client.shutdown(1000);
    }
  });

  describe('Real process cleanup', () => {
    it('should spawn and track a real child process', async () => {
      expect(client.hasRunningChild()).toBe(false);

      // Start a 2-second sleep in background (will be killed, so catch rejection)
      void client.executeNonInteractive('2').catch(() => {
        // Expected to be killed
      });

      // Give it a moment to spawn
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should be running now
      expect(client.hasRunningChild()).toBe(true);

      // Kill it
      await client.shutdown(500);

      // Should be cleaned up
      expect(client.hasRunningChild()).toBe(false);
    }, 3000);

    it('should cleanup on normal process completion', async () => {
      expect(client.hasRunningChild()).toBe(false);

      // Start a very short sleep (0.1 seconds)
      await client.executeNonInteractive('0.1');

      // Should have cleaned up after completion
      expect(client.hasRunningChild()).toBe(false);
    }, 2000);

    it('should gracefully shutdown with SIGTERM', async () => {
      void client.executeNonInteractive('10').catch(() => {
        // Expected to be killed
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const startTime = Date.now();

      // Shutdown should complete quickly with SIGTERM
      await client.shutdown(2000);

      const duration = Date.now() - startTime;

      // Should have terminated quickly (not waited full 10 seconds)
      expect(duration).toBeLessThan(1000);
      expect(client.hasRunningChild()).toBe(false);
    }, 5000);

    it('should force kill after grace period', async () => {
      // Use a long-running process (will be killed, so catch rejection)
      void client.executeNonInteractive('30').catch(() => {
        // Expected to be killed
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const startTime = Date.now();

      // Very short grace period to force SIGKILL
      await client.shutdown(200);

      const duration = Date.now() - startTime;

      // Should have been killed (grace period + SIGKILL buffer)
      expect(duration).toBeLessThan(2000);
      expect(client.hasRunningChild()).toBe(false);
    }, 5000);
  });

  describe('Zombie prevention', () => {
    // Skip on Windows since 'ps' command is Unix-specific
    const isWindows = process.platform === 'win32';

    it.skipIf(isWindows)('should not leave zombie processes after shutdown', async () => {
      // Get initial zombie count for our mock script
      const { stdout: before } = await execAsync('ps aux | grep "[d]efunct" | grep "mock-claude" | wc -l');
      const zombiesBefore = parseInt(before.trim());

      // Start and kill a process (will be killed, so catch rejection)
      void client.executeNonInteractive('5').catch(() => {
        // Expected to be killed
      });
      await new Promise(resolve => setTimeout(resolve, 100));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pid = (client as any).currentChild?.pid;
      expect(pid).toBeDefined();

      await client.shutdown(500);

      // Give OS a moment to reap
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check if that PID became a zombie
      try {
        const { stdout: after } = await execAsync(`ps -p ${pid} -o state= 2>/dev/null || echo "gone"`);
        const state = after.trim();

        // Process should either be gone or not be a zombie
        expect(state === 'gone' || state !== 'Z').toBe(true);
      } catch {
        // Process is gone - that's good!
      }

      // Check overall zombie count for our mock script hasn't increased
      const { stdout: after2 } = await execAsync('ps aux | grep "[d]efunct" | grep "mock-claude" | wc -l');
      const zombiesAfter = parseInt(after2.trim());

      expect(zombiesAfter).toBeLessThanOrEqual(zombiesBefore);
    }, 10000);
  });
});
