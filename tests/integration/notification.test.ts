/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { Workspace } from '../../src/core/workspace.js';
import { ClaudeClient } from '../../src/services/claude-client.js';
import { NotificationService } from '../../src/services/notification-service.js';
import { getTestDir, writeTestFile } from '../setup.js';
import { ExecutionMode } from '../../src/types/mode.js';

describe('Notification Integration', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let fetchCalls: Array<{ url: string; options: RequestInit }>;

  beforeEach(() => {
    // Mock fetch to capture notification calls
    fetchCalls = [];
    fetchMock = vi
      .fn()
      .mockImplementation((url: string, options: RequestInit) => {
        fetchCalls.push({ url, options });
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
        });
      });
    global.fetch = fetchMock;

    // Mock ClaudeClient to avoid actual execution
    vi.spyOn(ClaudeClient.prototype, 'isAvailable').mockResolvedValue(true);
    vi.spyOn(ClaudeClient.prototype, 'executeNonInteractive').mockResolvedValue(
      'Mock response'
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Notification service integration', () => {
    it('should send execution_start notification when configured', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'notify-exec-start');

      // Create workspace with notifyUrl and execution_start event
      const workspace = await Workspace.init(
        'notify-exec-start',
        workspacePath,
        {
          notifyUrl: 'https://ntfy.sh/test-topic',
          notifyEvents: ['execution_start'],
          maxIterations: 1,
        }
      );

      await workspace.writeInstructions('Test instructions');
      await writeTestFile(join(workspacePath, 'TODO.md'), 'Remaining: 0');

      const metadata = await workspace.getMetadata();
      const notificationService = new NotificationService();

      // Simulate run command notification check
      if (
        notificationService.isConfigured(metadata) &&
        notificationService.shouldNotify('execution_start', metadata) &&
        metadata.notifyUrl
      ) {
        await notificationService.send(
          `EXECUTION STARTED\n\nWorkspace: notify-exec-start\nMax iterations: 1`,
          {
            url: metadata.notifyUrl,
            title: 'Execution Started',
            tags: ['claude-iterate', 'execution'],
          }
        );
      }

      // Verify notification was sent
      expect(fetchCalls).toHaveLength(1);
      expect(fetchCalls[0]!.url).toBe('https://ntfy.sh/test-topic');
      expect(fetchCalls[0]!.options.method).toBe('POST');
      expect(
        fetchCalls[0]!.options.headers as Record<string, string>
      ).toMatchObject({
        Title: 'Execution Started',
        Tags: 'claude-iterate,execution',
      });
      expect(fetchCalls[0]!.options.body as string).toContain(
        'EXECUTION STARTED'
      );
      expect(fetchCalls[0]!.options.body as string).toContain(
        'notify-exec-start'
      );
    });

    it('should send completion notification', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'notify-complete');

      const workspace = await Workspace.init('notify-complete', workspacePath, {
        notifyUrl: 'https://ntfy.sh/test-topic',
        notifyEvents: ['completion'],
        maxIterations: 1,
      });

      await workspace.writeInstructions('Test instructions');
      await writeTestFile(join(workspacePath, 'TODO.md'), 'Remaining: 0');

      const metadata = await workspace.getMetadata();
      const notificationService = new NotificationService();

      // Simulate completion notification
      if (
        notificationService.isConfigured(metadata) &&
        notificationService.shouldNotify('completion', metadata) &&
        metadata.notifyUrl
      ) {
        await notificationService.send(
          `TASK COMPLETE ✅\n\nWorkspace: notify-complete\nTotal iterations: 1\nStatus: All items completed`,
          {
            url: metadata.notifyUrl,
            title: 'Task Complete',
            priority: 'high',
            tags: ['claude-iterate', 'completion'],
          }
        );
      }

      expect(fetchCalls).toHaveLength(1);
      expect(fetchCalls[0]!.url).toBe('https://ntfy.sh/test-topic');
      expect(
        fetchCalls[0]!.options.headers as Record<string, string>
      ).toMatchObject({
        Title: 'Task Complete',
        Priority: 'high',
        Tags: 'claude-iterate,completion',
      });
      expect(fetchCalls[0]!.options.body as string).toContain('TASK COMPLETE');
    });

    it('should send error notification', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'notify-error');

      const workspace = await Workspace.init('notify-error', workspacePath, {
        notifyUrl: 'https://ntfy.sh/test-topic',
        notifyEvents: ['error'],
        maxIterations: 1,
      });

      await workspace.writeInstructions('Test instructions');
      await writeTestFile(join(workspacePath, 'TODO.md'), 'Remaining: 5');

      const metadata = await workspace.getMetadata();
      const notificationService = new NotificationService();

      // Simulate error notification
      if (
        notificationService.isConfigured(metadata) &&
        notificationService.shouldNotify('error', metadata) &&
        metadata.notifyUrl
      ) {
        await notificationService.send(
          `ERROR ENCOUNTERED ⚠️\n\nWorkspace: notify-error\nIteration: 1\nError: Test error message`,
          {
            url: metadata.notifyUrl,
            title: 'Execution Error',
            priority: 'urgent',
            tags: ['claude-iterate', 'error'],
          }
        );
      }

      expect(fetchCalls).toHaveLength(1);
      expect(fetchCalls[0]!.url).toBe('https://ntfy.sh/test-topic');
      expect(
        fetchCalls[0]!.options.headers as Record<string, string>
      ).toMatchObject({
        Title: 'Execution Error',
        Priority: 'urgent',
        Tags: 'claude-iterate,error',
      });
      expect(fetchCalls[0]!.options.body as string).toContain(
        'ERROR ENCOUNTERED'
      );
    });

    it('should send iteration notification', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'notify-iteration');

      const workspace = await Workspace.init(
        'notify-iteration',
        workspacePath,
        {
          notifyUrl: 'https://ntfy.sh/test-topic',
          notifyEvents: ['iteration'], // Only iteration notifications
          maxIterations: 5,
        }
      );

      await workspace.writeInstructions('Test instructions');
      await writeTestFile(join(workspacePath, 'TODO.md'), 'Remaining: 3');

      const metadata = await workspace.getMetadata();
      const notificationService = new NotificationService();

      // Simulate iteration notification (after each iteration)
      const iterationCount = 3;
      const remainingCount = 3;
      if (
        notificationService.isConfigured(metadata) &&
        notificationService.shouldNotify('iteration', metadata) &&
        metadata.notifyUrl
      ) {
        await notificationService.send(
          `ITERATION ${iterationCount}/5\n\nWorkspace: notify-iteration\nStatus: In progress\nRemaining: ${remainingCount}`,
          {
            url: metadata.notifyUrl,
            title: `Iteration ${iterationCount}`,
            tags: ['claude-iterate', 'iteration'],
          }
        );
      }

      expect(fetchCalls).toHaveLength(1);
      expect(fetchCalls[0]!.url).toBe('https://ntfy.sh/test-topic');
      expect(
        fetchCalls[0]!.options.headers as Record<string, string>
      ).toMatchObject({
        Title: 'Iteration 3',
        Tags: 'claude-iterate,iteration',
      });
      expect(fetchCalls[0]!.options.body as string).toContain('ITERATION 3/5');
      expect(fetchCalls[0]!.options.body as string).toContain('Remaining: 3');
    });

    it('should send milestone notification', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'notify-milestone');

      const workspace = await Workspace.init(
        'notify-milestone',
        workspacePath,
        {
          notifyUrl: 'https://ntfy.sh/test-topic',
          notifyEvents: ['iteration_milestone'],
          maxIterations: 10,
        }
      );

      await workspace.writeInstructions('Test instructions');
      await writeTestFile(join(workspacePath, 'TODO.md'), 'Remaining: 5');

      const metadata = await workspace.getMetadata();
      const notificationService = new NotificationService();

      // Simulate milestone notification (every 10 iterations)
      const iterationCount = 10;
      if (
        iterationCount % 10 === 0 &&
        notificationService.isConfigured(metadata) &&
        notificationService.shouldNotify('iteration_milestone', metadata) &&
        metadata.notifyUrl
      ) {
        await notificationService.send(
          `ITERATION MILESTONE\n\nWorkspace: notify-milestone\nCompleted: ${iterationCount} iterations\nRemaining: 5`,
          {
            url: metadata.notifyUrl,
            title: 'Milestone Reached',
            tags: ['claude-iterate', 'milestone'],
          }
        );
      }

      expect(fetchCalls).toHaveLength(1);
      expect(fetchCalls[0]!.url).toBe('https://ntfy.sh/test-topic');
      expect(
        fetchCalls[0]!.options.headers as Record<string, string>
      ).toMatchObject({
        Title: 'Milestone Reached',
        Tags: 'claude-iterate,milestone',
      });
      expect(fetchCalls[0]!.options.body as string).toContain(
        'ITERATION MILESTONE'
      );
      expect(fetchCalls[0]!.options.body as string).toContain('10 iterations');
    });

    it('should send all notifications when events set to "all"', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'notify-all');

      const workspace = await Workspace.init('notify-all', workspacePath, {
        notifyUrl: 'https://ntfy.sh/test-topic',
        notifyEvents: ['all'],
        maxIterations: 1,
      });

      const metadata = await workspace.getMetadata();
      const notificationService = new NotificationService();

      // Test all event types
      const events = [
        'execution_start',
        'iteration_milestone',
        'completion',
        'error',
      ];
      for (const event of events) {
        expect(notificationService.shouldNotify(event, metadata)).toBe(true);
      }
    });

    it('should default to "all" events when notifyEvents not specified', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'notify-defaults');

      const workspace = await Workspace.init('notify-defaults', workspacePath, {
        notifyUrl: 'https://ntfy.sh/test-topic',
        // No notifyEvents specified - should default to ['all']
        maxIterations: 1,
      });

      const metadata = await workspace.getMetadata();
      const notificationService = new NotificationService();

      // Verify metadata has default
      expect(metadata.notifyEvents).toEqual(['all']);

      // ALL events should trigger
      expect(notificationService.shouldNotify('iteration', metadata)).toBe(
        true
      );
      expect(notificationService.shouldNotify('completion', metadata)).toBe(
        true
      );
      expect(notificationService.shouldNotify('error', metadata)).toBe(true);
      expect(notificationService.shouldNotify('status_update', metadata)).toBe(
        true
      );
      expect(notificationService.shouldNotify('setup_complete', metadata)).toBe(
        true
      );
      expect(
        notificationService.shouldNotify('execution_start', metadata)
      ).toBe(true);
      expect(
        notificationService.shouldNotify('iteration_milestone', metadata)
      ).toBe(true);
    });

    it('should not send notifications when notifyUrl is not configured', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'no-notify');

      const workspace = await Workspace.init('no-notify', workspacePath, {
        // No notifyUrl
        maxIterations: 1,
      });

      const metadata = await workspace.getMetadata();
      const notificationService = new NotificationService();

      // Should not be configured
      expect(notificationService.isConfigured(metadata)).toBe(false);

      // Should not send notification
      if (
        notificationService.isConfigured(metadata) &&
        notificationService.shouldNotify('completion', metadata) &&
        metadata.notifyUrl
      ) {
        await notificationService.send('Test', { url: metadata.notifyUrl });
      }

      expect(fetchCalls).toHaveLength(0);
    });
  });

  describe('Config fallback for notifications', () => {
    it('should use config notifyUrl when metadata has none', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'config-fallback');

      // Create workspace WITHOUT notifyUrl
      const workspace = await Workspace.init('config-fallback', workspacePath, {
        maxIterations: 1,
      });

      await workspace.writeInstructions('Test instructions');
      await writeTestFile(join(workspacePath, 'TODO.md'), 'Remaining: 0');

      const metadata = await workspace.getMetadata();

      // Verify no notifyUrl in metadata
      expect(metadata.notifyUrl).toBeUndefined();

      // Metadata now has default notifyEvents: ['all']
      expect(metadata.notifyEvents).toEqual(['all']);

      // Simulate config fallback (as implemented in run.ts)
      const runtimeConfig = {
        notifyUrl: 'https://ntfy.sh/global-topic',
        notifyEvents: ['completion'],
      };

      if (!metadata.notifyUrl && runtimeConfig.notifyUrl) {
        metadata.notifyUrl = runtimeConfig.notifyUrl;
      }
      // Metadata already has notifyEvents default, so this condition won't apply
      // unless explicitly empty

      // Metadata should have notifyUrl from config but keep its own notifyEvents
      expect(metadata.notifyUrl).toBe('https://ntfy.sh/global-topic');
      expect(metadata.notifyEvents).toEqual(['all']);

      const notificationService = new NotificationService();

      // Should now be configured
      expect(notificationService.isConfigured(metadata)).toBe(true);
      expect(notificationService.shouldNotify('completion', metadata)).toBe(
        true
      );

      // Send notification
      if (
        notificationService.isConfigured(metadata) &&
        notificationService.shouldNotify('completion', metadata) &&
        metadata.notifyUrl
      ) {
        await notificationService.send('Test completion', {
          url: metadata.notifyUrl,
          title: 'Task Complete',
        });
      }

      expect(fetchCalls).toHaveLength(1);
      expect(fetchCalls[0]!.url).toBe('https://ntfy.sh/global-topic');
    });

    it('should prefer workspace metadata over config', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'prefer-workspace');

      // Create workspace WITH notifyUrl
      const workspace = await Workspace.init(
        'prefer-workspace',
        workspacePath,
        {
          notifyUrl: 'https://ntfy.sh/workspace-topic',
          notifyEvents: ['completion'],
          maxIterations: 1,
        }
      );

      const metadata = await workspace.getMetadata();

      // Simulate config fallback
      const runtimeConfig = {
        notifyUrl: 'https://ntfy.sh/global-topic',
        notifyEvents: ['all'],
      };

      // Apply fallback logic (should not override existing values)
      if (!metadata.notifyUrl && runtimeConfig.notifyUrl) {
        metadata.notifyUrl = runtimeConfig.notifyUrl;
      }
      if (
        (!metadata.notifyEvents || metadata.notifyEvents.length === 0) &&
        runtimeConfig.notifyEvents
      ) {
        metadata.notifyEvents = runtimeConfig.notifyEvents as Array<
          | 'setup_complete'
          | 'execution_start'
          | 'iteration'
          | 'iteration_milestone'
          | 'completion'
          | 'error'
          | 'all'
        >;
      }

      // Should still have workspace values
      expect(metadata.notifyUrl).toBe('https://ntfy.sh/workspace-topic');
      expect(metadata.notifyEvents).toEqual(['completion']);
    });

    it('should apply config notifyEvents when metadata has empty array', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'empty-events');

      const workspace = await Workspace.init('empty-events', workspacePath, {
        notifyUrl: 'https://ntfy.sh/test',
        notifyEvents: [], // Explicitly empty
        maxIterations: 1,
      });

      const metadata = await workspace.getMetadata();

      // Simulate config fallback
      const runtimeConfig = {
        notifyEvents: ['execution_start', 'completion'],
      };

      if (
        (!metadata.notifyEvents || metadata.notifyEvents.length === 0) &&
        runtimeConfig.notifyEvents
      ) {
        metadata.notifyEvents = runtimeConfig.notifyEvents as Array<
          | 'setup_complete'
          | 'execution_start'
          | 'iteration'
          | 'iteration_milestone'
          | 'completion'
          | 'error'
          | 'all'
        >;
      }

      // Should now have config events
      expect(metadata.notifyEvents).toEqual(['execution_start', 'completion']);
    });
  });

  describe('Metadata refresh during iterations', () => {
    it('should use updated metadata after incrementIterations', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'metadata-refresh');

      const workspace = await Workspace.init(
        'metadata-refresh',
        workspacePath,
        {
          notifyUrl: 'https://ntfy.sh/test-topic',
          notifyEvents: ['completion'],
          maxIterations: 1,
        }
      );

      await workspace.writeInstructions('Test instructions');
      await writeTestFile(join(workspacePath, 'TODO.md'), 'Remaining: 0');

      let metadata = await workspace.getMetadata();

      // Simulate iteration
      const updatedMetadata = await workspace.incrementIterations('execution');

      // Apply the fix from run.ts
      Object.assign(metadata, updatedMetadata);

      // Metadata should have updated iteration counts
      expect(metadata.executionIterations).toBe(1);
      expect(metadata.totalIterations).toBe(1);
      expect(metadata.lastRun).toBeDefined();

      // Notification should still work with updated metadata
      const notificationService = new NotificationService();
      expect(notificationService.isConfigured(metadata)).toBe(true);
    });
  });

  describe('Different execution modes', () => {
    it('should send notifications in loop mode', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'loop-notify');

      const workspace = await Workspace.init('loop-notify', workspacePath, {
        mode: ExecutionMode.LOOP,
        notifyUrl: 'https://ntfy.sh/loop-topic',
        notifyEvents: ['completion'],
        maxIterations: 1,
      });

      await workspace.writeInstructions('Test instructions');
      await writeTestFile(join(workspacePath, 'TODO.md'), 'Remaining: 0');

      const metadata = await workspace.getMetadata();
      const notificationService = new NotificationService();

      if (
        notificationService.isConfigured(metadata) &&
        notificationService.shouldNotify('completion', metadata) &&
        metadata.notifyUrl
      ) {
        await notificationService.send('Loop mode complete', {
          url: metadata.notifyUrl,
          title: 'Task Complete',
        });
      }

      expect(fetchCalls).toHaveLength(1);
      expect(fetchCalls[0]!.url).toBe('https://ntfy.sh/loop-topic');
    });

    it('should send notifications in iterative mode', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'iterative-notify');

      const workspace = await Workspace.init(
        'iterative-notify',
        workspacePath,
        {
          mode: ExecutionMode.ITERATIVE,
          notifyUrl: 'https://ntfy.sh/iterative-topic',
          notifyEvents: ['completion'],
          maxIterations: 1,
        }
      );

      await workspace.writeInstructions('Test instructions');
      await writeTestFile(
        join(workspacePath, 'TODO.md'),
        '- [x] Task 1\n- [x] Task 2'
      );

      const metadata = await workspace.getMetadata();
      const notificationService = new NotificationService();

      if (
        notificationService.isConfigured(metadata) &&
        notificationService.shouldNotify('completion', metadata) &&
        metadata.notifyUrl
      ) {
        await notificationService.send('Iterative mode complete', {
          url: metadata.notifyUrl,
          title: 'Task Complete',
        });
      }

      expect(fetchCalls).toHaveLength(1);
      expect(fetchCalls[0]!.url).toBe('https://ntfy.sh/iterative-topic');
    });
  });

  describe('Notification failure handling', () => {
    it('should handle notification failures gracefully', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'notify-fail');

      const workspace = await Workspace.init('notify-fail', workspacePath, {
        notifyUrl: 'https://ntfy.sh/test-topic',
        notifyEvents: ['completion'],
        maxIterations: 1,
      });

      const metadata = await workspace.getMetadata();
      const notificationService = new NotificationService();

      // Override fetch to fail for this specific call
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      // Send notification (should not throw)
      const result = await notificationService.send('Test', {
        url: metadata.notifyUrl!,
        title: 'Test',
      });

      expect(result).toBe(false);

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it('should handle HTTP errors gracefully', async () => {
      const testDir = getTestDir();
      const workspacePath = join(testDir, 'workspaces', 'notify-http-error');

      const workspace = await Workspace.init(
        'notify-http-error',
        workspacePath,
        {
          notifyUrl: 'https://ntfy.sh/test-topic',
          notifyEvents: ['completion'],
          maxIterations: 1,
        }
      );

      const metadata = await workspace.getMetadata();
      const notificationService = new NotificationService();

      // Override fetch to return HTTP error for this specific call
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await notificationService.send('Test', {
        url: metadata.notifyUrl!,
        title: 'Test',
      });

      expect(result).toBe(false);

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });
});
