import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileLogger } from '../../src/services/file-logger.js';
import { promises as fs } from 'fs';
import * as fsUtils from '../../src/utils/fs.js';

vi.mock('fs');
vi.mock('../../src/utils/fs.js');

describe('FileLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock ensureDir to always succeed
    vi.mocked(fsUtils.ensureDir).mockResolvedValue(undefined);
    // Mock writeFile to succeed
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    // Mock appendFile to succeed
    vi.mocked(fs.appendFile).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create FileLogger with path and enabled state', () => {
      const logger = new FileLogger('/test/path.log', true);

      expect(logger.getLogPath()).toBe('/test/path.log');
      expect(logger.isEnabled()).toBe(true);
    });

    it('should default to enabled=true', () => {
      const logger = new FileLogger('/test/path.log');

      expect(logger.isEnabled()).toBe(true);
    });

    it('should respect disabled state', () => {
      const logger = new FileLogger('/test/path.log', false);

      expect(logger.isEnabled()).toBe(false);
    });
  });

  describe('logIterationStart()', () => {
    it('should initialize file with header on first call', async () => {
      const logger = new FileLogger('/test/iterate.log');

      await logger.logIterationStart(1, 'Test prompt');

      // Should create directory
      expect(fsUtils.ensureDir).toHaveBeenCalledWith('/test');

      // Should write header first
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/iterate.log',
        expect.stringContaining('CLAUDE ITERATE - EXECUTION LOG'),
        'utf8'
      );

      // Should append iteration start
      expect(fs.appendFile).toHaveBeenCalledWith(
        '/test/iterate.log',
        expect.stringContaining('ITERATION 1'),
        'utf8'
      );
    });

    it('should include prompt in log', async () => {
      const logger = new FileLogger('/test/iterate.log');

      await logger.logIterationStart(1, 'Test prompt for iteration');

      expect(fs.appendFile).toHaveBeenCalledWith(
        '/test/iterate.log',
        expect.stringContaining('Test prompt for iteration'),
        'utf8'
      );
    });

    it('should include system prompt when provided', async () => {
      const logger = new FileLogger('/test/iterate.log');

      await logger.logIterationStart(
        1,
        'User prompt',
        'System prompt here'
      );

      expect(fs.appendFile).toHaveBeenCalledWith(
        '/test/iterate.log',
        expect.stringContaining('SYSTEM PROMPT:'),
        'utf8'
      );
      expect(fs.appendFile).toHaveBeenCalledWith(
        '/test/iterate.log',
        expect.stringContaining('System prompt here'),
        'utf8'
      );
    });

    it('should include CLAUDE OUTPUT header', async () => {
      const logger = new FileLogger('/test/iterate.log');

      await logger.logIterationStart(1, 'Test prompt');

      expect(fs.appendFile).toHaveBeenCalledWith(
        '/test/iterate.log',
        expect.stringContaining('CLAUDE OUTPUT:'),
        'utf8'
      );
    });

    it('should not write when disabled', async () => {
      const logger = new FileLogger('/test/iterate.log', false);

      await logger.logIterationStart(1, 'Test prompt');

      expect(fs.writeFile).not.toHaveBeenCalled();
      expect(fs.appendFile).not.toHaveBeenCalled();
    });

    it('should disable logger on write failure', async () => {
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Write failed'));
      const logger = new FileLogger('/test/iterate.log');

      await logger.logIterationStart(1, 'Test prompt');

      expect(logger.isEnabled()).toBe(false);
    });
  });

  describe('appendOutput()', () => {
    it('should buffer output chunks', async () => {
      const logger = new FileLogger('/test/iterate.log');

      await logger.appendOutput('chunk1');
      await logger.appendOutput('chunk2');

      // Should not write to file yet (buffered)
      expect(fs.appendFile).not.toHaveBeenCalled();
    });

    it('should flush buffer when it exceeds 10KB', async () => {
      const logger = new FileLogger('/test/iterate.log');
      await logger.logIterationStart(1, 'Test'); // Initialize
      vi.clearAllMocks();

      // Create a chunk larger than 10KB
      const largeChunk = 'x'.repeat(10241);
      await logger.appendOutput(largeChunk);

      // Should flush automatically
      expect(fs.appendFile).toHaveBeenCalledWith(
        '/test/iterate.log',
        largeChunk,
        'utf8'
      );
    });

    it('should not write when disabled', async () => {
      const logger = new FileLogger('/test/iterate.log', false);

      await logger.appendOutput('test output');

      expect(fs.appendFile).not.toHaveBeenCalled();
    });
  });

  describe('logIterationComplete()', () => {
    it('should flush buffer and log completion status', async () => {
      const logger = new FileLogger('/test/iterate.log');
      await logger.logIterationStart(1, 'Test');
      await logger.appendOutput('Some output');
      vi.clearAllMocks();

      await logger.logIterationComplete(1, 'success', 5);

      // Should have flushed buffer
      expect(fs.appendFile).toHaveBeenCalledWith(
        '/test/iterate.log',
        expect.stringContaining('Some output'),
        'utf8'
      );

      // Should have logged completion
      expect(fs.appendFile).toHaveBeenCalledWith(
        '/test/iterate.log',
        expect.stringContaining('STATUS: success'),
        'utf8'
      );
      expect(fs.appendFile).toHaveBeenCalledWith(
        '/test/iterate.log',
        expect.stringContaining('Remaining: 5'),
        'utf8'
      );
    });

    it('should log error status', async () => {
      const logger = new FileLogger('/test/iterate.log');
      await logger.logIterationStart(1, 'Test');
      vi.clearAllMocks();

      await logger.logIterationComplete(1, 'error');

      expect(fs.appendFile).toHaveBeenCalledWith(
        '/test/iterate.log',
        expect.stringContaining('STATUS: error'),
        'utf8'
      );
    });

    it('should not include remaining count when not provided', async () => {
      const logger = new FileLogger('/test/iterate.log');
      await logger.logIterationStart(1, 'Test');
      vi.clearAllMocks();

      await logger.logIterationComplete(1, 'success');

      const call = vi.mocked(fs.appendFile).mock.calls.find(
        call => typeof call[1] === 'string' && call[1].includes('STATUS:')
      );
      expect(call?.[1]).not.toContain('Remaining:');
    });

    it('should include completed timestamp', async () => {
      const logger = new FileLogger('/test/iterate.log');
      await logger.logIterationStart(1, 'Test');
      vi.clearAllMocks();

      await logger.logIterationComplete(1, 'success');

      expect(fs.appendFile).toHaveBeenCalledWith(
        '/test/iterate.log',
        expect.stringContaining('Completed:'),
        'utf8'
      );
    });
  });

  describe('logError()', () => {
    it('should flush buffer and log error details', async () => {
      const logger = new FileLogger('/test/iterate.log');
      await logger.logIterationStart(1, 'Test');
      await logger.appendOutput('Some output');
      vi.clearAllMocks();

      const error = new Error('Test error');
      await logger.logError(1, error);

      // Should flush buffer first
      expect(fs.appendFile).toHaveBeenCalledWith(
        '/test/iterate.log',
        expect.stringContaining('Some output'),
        'utf8'
      );

      // Should log error
      expect(fs.appendFile).toHaveBeenCalledWith(
        '/test/iterate.log',
        expect.stringContaining('ERROR (Iteration 1)'),
        'utf8'
      );
      expect(fs.appendFile).toHaveBeenCalledWith(
        '/test/iterate.log',
        expect.stringContaining('Test error'),
        'utf8'
      );
    });

    it('should include error stack when available', async () => {
      const logger = new FileLogger('/test/iterate.log');
      await logger.logIterationStart(1, 'Test');
      vi.clearAllMocks();

      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';

      await logger.logError(1, error);

      expect(fs.appendFile).toHaveBeenCalledWith(
        '/test/iterate.log',
        expect.stringContaining('Stack:'),
        'utf8'
      );
      expect(fs.appendFile).toHaveBeenCalledWith(
        '/test/iterate.log',
        expect.stringContaining('at test.js:1:1'),
        'utf8'
      );
    });

    it('should include timestamp', async () => {
      const logger = new FileLogger('/test/iterate.log');
      await logger.logIterationStart(1, 'Test');
      vi.clearAllMocks();

      await logger.logError(1, new Error('Test'));

      expect(fs.appendFile).toHaveBeenCalledWith(
        '/test/iterate.log',
        expect.stringContaining('Time:'),
        'utf8'
      );
    });
  });

  describe('flush()', () => {
    it('should write buffered content to file', async () => {
      const logger = new FileLogger('/test/iterate.log');
      await logger.logIterationStart(1, 'Test');
      await logger.appendOutput('buffered output');
      vi.clearAllMocks();

      await logger.flush();

      expect(fs.appendFile).toHaveBeenCalledWith(
        '/test/iterate.log',
        'buffered output',
        'utf8'
      );
    });

    it('should clear buffer after flush', async () => {
      const logger = new FileLogger('/test/iterate.log');
      await logger.logIterationStart(1, 'Test');
      await logger.appendOutput('buffered output');
      await logger.flush();
      vi.clearAllMocks();

      // Second flush should not write (buffer empty)
      await logger.flush();

      expect(fs.appendFile).not.toHaveBeenCalled();
    });

    it('should do nothing when buffer is empty', async () => {
      const logger = new FileLogger('/test/iterate.log');

      await logger.flush();

      expect(fs.appendFile).not.toHaveBeenCalled();
    });

    it('should disable logger on flush failure', async () => {
      const logger = new FileLogger('/test/iterate.log');
      await logger.logIterationStart(1, 'Test');
      await logger.appendOutput('test');

      vi.mocked(fs.appendFile).mockRejectedValueOnce(new Error('Flush failed'));

      await logger.flush();

      expect(logger.isEnabled()).toBe(false);
    });
  });

  describe('getLogPath()', () => {
    it('should return configured log path', () => {
      const logger = new FileLogger('/custom/path/log.txt');

      expect(logger.getLogPath()).toBe('/custom/path/log.txt');
    });
  });

  describe('isEnabled()', () => {
    it('should return enabled state', () => {
      const enabledLogger = new FileLogger('/test/log', true);
      const disabledLogger = new FileLogger('/test/log', false);

      expect(enabledLogger.isEnabled()).toBe(true);
      expect(disabledLogger.isEnabled()).toBe(false);
    });

    it('should return false after initialization failure', async () => {
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Init failed'));
      const logger = new FileLogger('/test/log');

      await logger.logIterationStart(1, 'Test');

      expect(logger.isEnabled()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should gracefully handle directory creation failure', async () => {
      vi.mocked(fsUtils.ensureDir).mockRejectedValue(new Error('Permission denied'));
      const logger = new FileLogger('/test/iterate.log');

      // Should not throw
      await expect(logger.logIterationStart(1, 'Test')).resolves.toBeUndefined();

      // Logger should be disabled
      expect(logger.isEnabled()).toBe(false);
    });

    it('should gracefully handle append failure', async () => {
      const logger = new FileLogger('/test/iterate.log');
      await logger.logIterationStart(1, 'Test');

      vi.mocked(fs.appendFile).mockRejectedValue(new Error('Disk full'));

      // Should not throw
      await expect(logger.appendOutput('test')).resolves.toBeUndefined();
      await expect(logger.flush()).resolves.toBeUndefined();

      // Logger should be disabled
      expect(logger.isEnabled()).toBe(false);
    });
  });
});
