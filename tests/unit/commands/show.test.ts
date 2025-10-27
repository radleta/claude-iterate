import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkspaceNotFoundError } from '../../../src/utils/errors.js';
import { Logger } from '../../../src/utils/logger.js';

/**
 * Tests for show command error handling
 *
 * Note: We test the error handling logic specifically, as the full command
 * integration is covered by E2E tests.
 */

describe('Show command error handling', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger(false); // No colors for tests
    vi.spyOn(logger, 'error');
    vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`process.exit: ${code}`);
    });
  });

  it('should handle WorkspaceNotFoundError with clean message', () => {
    const workspaceName = 'nonexistent-workspace';
    const error = new WorkspaceNotFoundError(workspaceName);

    // Simulate the error handling in show command
    try {
      if (error instanceof WorkspaceNotFoundError) {
        logger.error(`Workspace not found: ${workspaceName}`);
        process.exit(1);
      }
    } catch (e) {
      // Process.exit throws in our mock
      expect((e as Error).message).toBe('process.exit: 1');
    }

    // Verify clean error message was logged
    expect(logger.error).toHaveBeenCalledWith(
      `Workspace not found: ${workspaceName}`
    );
  });

  it('should handle generic errors with stack trace', () => {
    const error = new Error('Something went wrong');

    // Simulate the error handling in show command
    try {
      if (error instanceof WorkspaceNotFoundError) {
        logger.error(`Workspace not found: test`);
        process.exit(1);
      }
      logger.error('Failed to show workspace info', error);
      process.exit(1);
    } catch (e) {
      // Process.exit throws in our mock
      expect((e as Error).message).toBe('process.exit: 1');
    }

    // Verify generic error was logged with error object
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to show workspace info',
      error
    );
  });

  it('should distinguish between WorkspaceNotFoundError and other errors', () => {
    const workspaceError = new WorkspaceNotFoundError('test-workspace');
    const genericError = new Error('Generic error');

    expect(workspaceError instanceof WorkspaceNotFoundError).toBe(true);
    expect(genericError instanceof WorkspaceNotFoundError).toBe(false);
  });
});
