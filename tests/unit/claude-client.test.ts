import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeClient } from '../../src/services/claude-client.js';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process
vi.mock('child_process');

describe('ClaudeClient - Process Cleanup', () => {
  let client: ClaudeClient;
  let mockChild: any;

  beforeEach(() => {
    // Create mock child process
    mockChild = new EventEmitter();
    mockChild.pid = 12345;
    mockChild.killed = false;
    mockChild.kill = vi.fn().mockImplementation((_signal?: NodeJS.Signals) => {
      mockChild.killed = true;
      // Simulate async exit
      setTimeout(() => mockChild.emit('exit', 0), 10);
      return true;
    });
    mockChild.stdout = new EventEmitter();
    mockChild.stderr = new EventEmitter();

    // Mock spawn to return our mock child
    vi.mocked(spawn).mockReturnValue(mockChild as any);

    client = new ClaudeClient('claude', ['--test']);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('shutdown()', () => {
    it('should gracefully shutdown when child process is running', async () => {
      // Start a process
      void client.executeNonInteractive('test');

      // Give it a moment to register
      await new Promise(resolve => setTimeout(resolve, 5));

      // Verify child is running
      expect(client.hasRunningChild()).toBe(true);

      // Shutdown
      const shutdownPromise = client.shutdown(100);

      // Verify kill was called with SIGTERM
      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');

      await shutdownPromise;

      // Verify cleanup
      expect(client.hasRunningChild()).toBe(false);
      expect(client.isShutdown()).toBe(true);
    });

    it('should force kill with SIGKILL after grace period', async () => {
      // Start a process
      void client.executeNonInteractive('test').catch(() => {
        // Expected to fail with exit code 137
      });

      await new Promise(resolve => setTimeout(resolve, 5));

      // Mock child that doesn't respond to SIGTERM
      mockChild.kill = vi.fn().mockImplementation((signal?: NodeJS.Signals) => {
        if (signal === 'SIGKILL') {
          mockChild.killed = true;
          setTimeout(() => mockChild.emit('exit', 137), 10);
        }
        return true;
      });

      // Shutdown with very short grace period
      await client.shutdown(50);

      // Verify SIGKILL was attempted
      expect(mockChild.kill).toHaveBeenCalledWith('SIGKILL');

      // Wait for promise to settle
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    it('should handle no running child gracefully', async () => {
      // No process running
      expect(client.hasRunningChild()).toBe(false);

      // Should not throw
      await expect(client.shutdown()).resolves.toBeUndefined();
    });

    it('should prevent new processes after shutdown', async () => {
      // Start shutdown
      await client.shutdown();

      // Try to start new process
      await expect(
        client.executeNonInteractive('test')
      ).rejects.toThrow('Client is shutting down');
    });
  });

  describe('kill()', () => {
    it('should kill running child with SIGTERM by default', async () => {
      // Start a process
      void client.executeNonInteractive('test');

      await new Promise(resolve => setTimeout(resolve, 5));

      // Kill it
      const result = client.kill();

      expect(result).toBe(true);
      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should kill running child with custom signal', async () => {
      // Start a process
      void client.executeNonInteractive('test');

      await new Promise(resolve => setTimeout(resolve, 5));

      // Kill it with SIGKILL
      const result = client.kill('SIGKILL');

      expect(result).toBe(true);
      expect(mockChild.kill).toHaveBeenCalledWith('SIGKILL');
    });

    it('should return false when no child is running', () => {
      const result = client.kill();
      expect(result).toBe(false);
    });
  });

  describe('hasRunningChild()', () => {
    it('should return false initially', () => {
      expect(client.hasRunningChild()).toBe(false);
    });

    it('should return true when child is running', async () => {
      // Start a process (don't await - we want it running)
      void client.executeNonInteractive('test');

      // Wait for spawn to complete
      await new Promise(resolve => setTimeout(resolve, 20));

      // Check BEFORE emitting exit
      expect(client.hasRunningChild()).toBe(true);

      // Now let it complete
      mockChild.stdout.emit('data', 'output');
      mockChild.emit('exit', 0);
    });

    it('should return false after child exits', async () => {
      // Start a process
      void client.executeNonInteractive('test');

      await new Promise(resolve => setTimeout(resolve, 5));

      // Emit exit
      mockChild.emit('exit', 0);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(client.hasRunningChild()).toBe(false);
    });
  });

  describe('process cleanup on exit', () => {
    it('should cleanup currentChild reference on normal exit', async () => {
      // Start a process
      const promise = client.executeNonInteractive('test');

      await new Promise(resolve => setTimeout(resolve, 5));

      // Simulate successful output and exit
      mockChild.stdout.emit('data', 'output');
      mockChild.emit('exit', 0);

      await promise;

      // Verify cleanup
      expect(client.hasRunningChild()).toBe(false);
    });

    it('should cleanup currentChild reference on error exit', async () => {
      // Start a process
      const promise = client.executeNonInteractive('test');

      await new Promise(resolve => setTimeout(resolve, 5));

      // Simulate error exit
      mockChild.stderr.emit('data', 'error');
      mockChild.emit('exit', 1);

      await expect(promise).rejects.toThrow();

      // Verify cleanup
      expect(client.hasRunningChild()).toBe(false);
    });

    it('should cleanup currentChild reference on spawn error', async () => {
      // Start a process
      const promise = client.executeNonInteractive('test');

      await new Promise(resolve => setTimeout(resolve, 5));

      // Simulate spawn error
      mockChild.emit('error', new Error('spawn failed'));

      await expect(promise).rejects.toThrow();

      // Verify cleanup
      expect(client.hasRunningChild()).toBe(false);
    });
  });
});
