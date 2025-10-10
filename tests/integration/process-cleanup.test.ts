import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ClaudeClient } from '../../src/services/claude-client.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Integration tests for process cleanup
 * Uses real child processes (sleep command) to verify cleanup behavior
 */
describe('ClaudeClient - Process Cleanup Integration', () => {
  let client: ClaudeClient;

  beforeEach(() => {
    // Use 'sleep' command for testing (available on Linux/Mac)
    client = new ClaudeClient('sleep', []);
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

      // Start a 2-second sleep in background
      void client.executeNonInteractive('2');

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
      void client.executeNonInteractive('10');

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
      // Use a long-running process
      void client.executeNonInteractive('30');

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
    it('should not leave zombie processes after shutdown', async () => {
      // Get initial zombie count
      const { stdout: before } = await execAsync('ps aux | grep "[d]efunct" | grep sleep | wc -l');
      const zombiesBefore = parseInt(before.trim());

      // Start and kill a process
      void client.executeNonInteractive('5');
      await new Promise(resolve => setTimeout(resolve, 100));

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
      } catch (error) {
        // Process is gone - that's good!
      }

      // Check overall sleep zombie count hasn't increased
      const { stdout: after2 } = await execAsync('ps aux | grep "[d]efunct" | grep sleep | wc -l');
      const zombiesAfter = parseInt(after2.trim());

      expect(zombiesAfter).toBeLessThanOrEqual(zombiesBefore);
    }, 10000);
  });
});
