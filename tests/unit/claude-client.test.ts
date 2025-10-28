import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeClient } from '../../src/services/claude-client.js';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process
vi.mock('child_process');

describe('ClaudeClient - Process Cleanup', () => {
  let client: ClaudeClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      // Give it a moment to register (increased for CI reliability)
      await new Promise((resolve) => setTimeout(resolve, 50));

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

      // Wait for child to be registered (increased for CI reliability)
      await new Promise((resolve) => setTimeout(resolve, 50));

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
      await new Promise((resolve) => setTimeout(resolve, 50));
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
      await expect(client.executeNonInteractive('test')).rejects.toThrow(
        'Client is shutting down'
      );
    });
  });

  describe('kill()', () => {
    it('should kill running child with SIGTERM by default', async () => {
      // Start a process
      void client.executeNonInteractive('test');

      // Wait for child to be registered with polling (CI reliable)
      for (let i = 0; i < 20; i++) {
        if (client.hasRunningChild()) break;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Kill it
      const result = client.kill();

      expect(result).toBe(true);
      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should kill running child with custom signal', async () => {
      // Start a process
      void client.executeNonInteractive('test');

      // Wait for child to be registered with polling (CI reliable)
      for (let i = 0; i < 20; i++) {
        if (client.hasRunningChild()) break;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

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

      // Wait for child to be registered with polling (CI reliable)
      for (let i = 0; i < 20; i++) {
        if (client.hasRunningChild()) break;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Check BEFORE emitting exit
      expect(client.hasRunningChild()).toBe(true);

      // Now let it complete
      mockChild.stdout.emit('data', 'output');
      mockChild.emit('exit', 0);
    });

    it('should return false after child exits', async () => {
      // Start a process
      void client.executeNonInteractive('test');

      // Wait for child to be registered (increased for CI reliability)
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Emit exit
      mockChild.emit('exit', 0);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(client.hasRunningChild()).toBe(false);
    });
  });

  describe('process cleanup on exit', () => {
    it('should cleanup currentChild reference on normal exit', async () => {
      // Start a process
      const promise = client.executeNonInteractive('test');

      // Wait for child to be registered (increased for CI reliability)
      await new Promise((resolve) => setTimeout(resolve, 50));

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

      // Wait for child to be registered (increased for CI reliability)
      await new Promise((resolve) => setTimeout(resolve, 50));

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

      // Wait for child to be registered (increased for CI reliability)
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Simulate spawn error
      mockChild.emit('error', new Error('spawn failed'));

      await expect(promise).rejects.toThrow();

      // Verify cleanup
      expect(client.hasRunningChild()).toBe(false);
    });
  });

  describe('streaming callbacks', () => {
    it('should call onStdout callback for stdout data', async () => {
      const stdoutChunks: string[] = [];
      const onStdout = vi.fn((chunk: string) => stdoutChunks.push(chunk));

      // Start process with callback
      const promise = client.executeNonInteractive(
        'test',
        undefined,
        undefined,
        {
          onStdout,
        }
      );

      // Wait for child to be registered
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Emit stdout data
      mockChild.stdout.emit('data', Buffer.from('chunk1'));
      mockChild.stdout.emit('data', Buffer.from('chunk2'));
      mockChild.emit('exit', 0);

      await promise;

      // Verify callbacks were called
      expect(onStdout).toHaveBeenCalledTimes(2);
      expect(onStdout).toHaveBeenNthCalledWith(1, 'chunk1');
      expect(onStdout).toHaveBeenNthCalledWith(2, 'chunk2');
      expect(stdoutChunks).toEqual(['chunk1', 'chunk2']);
    });

    it('should call onStderr callback for stderr data', async () => {
      const stderrChunks: string[] = [];
      const onStderr = vi.fn((chunk: string) => stderrChunks.push(chunk));

      // Start process with callback
      const promise = client.executeNonInteractive(
        'test',
        undefined,
        undefined,
        {
          onStderr,
        }
      );

      // Wait for child to be registered
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Emit stderr data
      mockChild.stderr.emit('data', Buffer.from('error1'));
      mockChild.stderr.emit('data', Buffer.from('error2'));
      mockChild.stdout.emit('data', Buffer.from('output')); // Also emit stdout for success
      mockChild.emit('exit', 0);

      await promise;

      // Verify callbacks were called
      expect(onStderr).toHaveBeenCalledTimes(2);
      expect(onStderr).toHaveBeenNthCalledWith(1, 'error1');
      expect(onStderr).toHaveBeenNthCalledWith(2, 'error2');
      expect(stderrChunks).toEqual(['error1', 'error2']);
    });

    it('should call both callbacks when provided', async () => {
      const onStdout = vi.fn();
      const onStderr = vi.fn();

      // Start process with both callbacks
      const promise = client.executeNonInteractive(
        'test',
        undefined,
        undefined,
        {
          onStdout,
          onStderr,
        }
      );

      // Wait for child to be registered
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Emit both stdout and stderr
      mockChild.stdout.emit('data', Buffer.from('output'));
      mockChild.stderr.emit('data', Buffer.from('error'));
      mockChild.emit('exit', 0);

      await promise;

      // Verify both callbacks were called
      expect(onStdout).toHaveBeenCalledWith('output');
      expect(onStderr).toHaveBeenCalledWith('error');
    });

    it('should still return full stdout when using callbacks', async () => {
      const onStdout = vi.fn();

      // Start process with callback
      const promise = client.executeNonInteractive(
        'test',
        undefined,
        undefined,
        {
          onStdout,
        }
      );

      // Wait for child to be registered
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Emit stdout data
      mockChild.stdout.emit('data', Buffer.from('chunk1'));
      mockChild.stdout.emit('data', Buffer.from('chunk2'));
      mockChild.emit('exit', 0);

      const result = await promise;

      // Verify callbacks were called AND result contains full output
      expect(onStdout).toHaveBeenCalledTimes(2);
      expect(result).toBe('chunk1chunk2');
    });

    it('should work without callbacks (backward compatibility)', async () => {
      // Start process without callbacks (old behavior)
      const promise = client.executeNonInteractive('test');

      // Wait for child to be registered
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Emit stdout data
      mockChild.stdout.emit('data', Buffer.from('output'));
      mockChild.emit('exit', 0);

      const result = await promise;

      // Should still work and return output
      expect(result).toBe('output');
    });

    it('should handle empty callbacks object', async () => {
      // Start process with empty callbacks object
      const promise = client.executeNonInteractive(
        'test',
        undefined,
        undefined,
        {}
      );

      // Wait for child to be registered
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Emit stdout data
      mockChild.stdout.emit('data', Buffer.from('output'));
      mockChild.emit('exit', 0);

      const result = await promise;

      // Should still work normally
      expect(result).toBe('output');
    });

    it('should call callbacks even on error exit', async () => {
      const onStdout = vi.fn();
      const onStderr = vi.fn();

      // Start process with callbacks
      const promise = client.executeNonInteractive(
        'test',
        undefined,
        undefined,
        {
          onStdout,
          onStderr,
        }
      );

      // Wait for child to be registered
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Emit data then error exit
      mockChild.stdout.emit('data', Buffer.from('output'));
      mockChild.stderr.emit('data', Buffer.from('error message'));
      mockChild.emit('exit', 1);

      await expect(promise).rejects.toThrow();

      // Callbacks should have been called before error
      expect(onStdout).toHaveBeenCalledWith('output');
      expect(onStderr).toHaveBeenCalledWith('error message');
    });

    it('should handle multiple rapid data chunks', async () => {
      const chunks: string[] = [];
      const onStdout = vi.fn((chunk: string) => chunks.push(chunk));

      // Start process with callback
      const promise = client.executeNonInteractive(
        'test',
        undefined,
        undefined,
        {
          onStdout,
        }
      );

      // Wait for child to be registered
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Emit many chunks rapidly
      for (let i = 0; i < 10; i++) {
        mockChild.stdout.emit('data', Buffer.from(`chunk${i}`));
      }
      mockChild.emit('exit', 0);

      const result = await promise;

      // All callbacks should be called
      expect(onStdout).toHaveBeenCalledTimes(10);
      expect(chunks).toHaveLength(10);
      // Result should contain all chunks
      expect(result).toBe(
        'chunk0chunk1chunk2chunk3chunk4chunk5chunk6chunk7chunk8chunk9'
      );
    });
  });
});
