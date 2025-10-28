import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConsoleReporter } from '../../src/services/console-reporter.js';

// Mock log-update (must be before imports for hoisting)
vi.mock('log-update', () => {
  const mockFn = vi.fn();
  mockFn.done = vi.fn();
  return {
    default: mockFn,
  };
});

// Import the mocked module to get references
import logUpdate from 'log-update';

describe('ConsoleReporter', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stdoutSpy: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stderrSpy: any;

  beforeEach(() => {
    stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    vi.mocked(logUpdate).mockClear();
    vi.mocked(logUpdate.done).mockClear();
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create reporter with output level', () => {
      const reporter = new ConsoleReporter('verbose');
      expect(reporter.getLevel()).toBe('verbose');
    });

    it('should support all output levels', () => {
      expect(new ConsoleReporter('quiet').getLevel()).toBe('quiet');
      expect(new ConsoleReporter('progress').getLevel()).toBe('progress');
      expect(new ConsoleReporter('verbose').getLevel()).toBe('verbose');
    });
  });

  describe('error()', () => {
    it('should write to stderr in quiet mode', () => {
      const reporter = new ConsoleReporter('quiet');
      reporter.error('Test error');

      expect(stderrSpy).toHaveBeenCalledWith('Test error\n');
      expect(stdoutSpy).not.toHaveBeenCalled();
    });

    it('should write to stderr in progress mode', () => {
      const reporter = new ConsoleReporter('progress');
      reporter.error('Test error');

      expect(stderrSpy).toHaveBeenCalledWith('Test error\n');
    });

    it('should write to stderr in verbose mode', () => {
      const reporter = new ConsoleReporter('verbose');
      reporter.error('Test error');

      expect(stderrSpy).toHaveBeenCalledWith('Test error\n');
    });
  });

  describe('warning()', () => {
    it('should write to stderr in quiet mode', () => {
      const reporter = new ConsoleReporter('quiet');
      reporter.warning('Test warning');

      expect(stderrSpy).toHaveBeenCalledWith('Test warning\n');
      expect(stdoutSpy).not.toHaveBeenCalled();
    });

    it('should write to stderr in progress mode', () => {
      const reporter = new ConsoleReporter('progress');
      reporter.warning('Test warning');

      expect(stderrSpy).toHaveBeenCalledWith('Test warning\n');
    });

    it('should write to stderr in verbose mode', () => {
      const reporter = new ConsoleReporter('verbose');
      reporter.warning('Test warning');

      expect(stderrSpy).toHaveBeenCalledWith('Test warning\n');
    });
  });

  describe('progress()', () => {
    it('should not write in quiet mode', () => {
      const reporter = new ConsoleReporter('quiet');
      reporter.progress('Progress message');

      expect(stdoutSpy).not.toHaveBeenCalled();
      expect(stderrSpy).not.toHaveBeenCalled();
    });

    it('should write to stdout in progress mode', () => {
      const reporter = new ConsoleReporter('progress');
      reporter.progress('Progress message');

      expect(stdoutSpy).toHaveBeenCalledWith('Progress message\n');
    });

    it('should write to stdout in verbose mode', () => {
      const reporter = new ConsoleReporter('verbose');
      reporter.progress('Progress message');

      expect(stdoutSpy).toHaveBeenCalledWith('Progress message\n');
    });
  });

  describe('status()', () => {
    it('should not write in quiet mode', () => {
      const reporter = new ConsoleReporter('quiet');
      reporter.status('Status message');

      expect(stdoutSpy).not.toHaveBeenCalled();
      expect(stderrSpy).not.toHaveBeenCalled();
    });

    it('should write to stdout in progress mode', () => {
      const reporter = new ConsoleReporter('progress');
      reporter.status('Status message');

      expect(stdoutSpy).toHaveBeenCalledWith('Status message\n');
    });

    it('should write to stdout in verbose mode', () => {
      const reporter = new ConsoleReporter('verbose');
      reporter.status('Status message');

      expect(stdoutSpy).toHaveBeenCalledWith('Status message\n');
    });
  });

  describe('verbose()', () => {
    it('should not write in quiet mode', () => {
      const reporter = new ConsoleReporter('quiet');
      reporter.verbose('Verbose message');

      expect(stdoutSpy).not.toHaveBeenCalled();
      expect(stderrSpy).not.toHaveBeenCalled();
    });

    it('should not write in progress mode', () => {
      const reporter = new ConsoleReporter('progress');
      reporter.verbose('Verbose message');

      expect(stdoutSpy).not.toHaveBeenCalled();
      expect(stderrSpy).not.toHaveBeenCalled();
    });

    it('should write to stdout in verbose mode', () => {
      const reporter = new ConsoleReporter('verbose');
      reporter.verbose('Verbose message');

      expect(stdoutSpy).toHaveBeenCalledWith('Verbose message\n');
    });
  });

  describe('stream()', () => {
    it('should not write in quiet mode', () => {
      const reporter = new ConsoleReporter('quiet');
      reporter.stream('Stream content');

      expect(stdoutSpy).not.toHaveBeenCalled();
      expect(stderrSpy).not.toHaveBeenCalled();
    });

    it('should not write in progress mode', () => {
      const reporter = new ConsoleReporter('progress');
      reporter.stream('Stream content');

      expect(stdoutSpy).not.toHaveBeenCalled();
      expect(stderrSpy).not.toHaveBeenCalled();
    });

    it('should write to stdout in verbose mode', () => {
      const reporter = new ConsoleReporter('verbose');
      reporter.stream('Stream content');

      expect(stdoutSpy).toHaveBeenCalledWith('Stream content');
    });

    it('should handle Buffer input', () => {
      const reporter = new ConsoleReporter('verbose');
      const buffer = Buffer.from('Buffer content', 'utf-8');
      reporter.stream(buffer);

      expect(stdoutSpy).toHaveBeenCalledWith('Buffer content');
    });

    it('should not add newline for streaming', () => {
      const reporter = new ConsoleReporter('verbose');
      reporter.stream('chunk1');
      reporter.stream('chunk2');

      expect(stdoutSpy).toHaveBeenNthCalledWith(1, 'chunk1');
      expect(stdoutSpy).toHaveBeenNthCalledWith(2, 'chunk2');
    });
  });

  describe('output level filtering', () => {
    it('should filter correctly for quiet level', () => {
      const reporter = new ConsoleReporter('quiet');

      reporter.error('error');
      reporter.warning('warning');
      reporter.progress('progress');
      reporter.status('status');
      reporter.verbose('verbose');
      reporter.stream('stream');

      // Only error and warning should be written
      expect(stderrSpy).toHaveBeenCalledTimes(2);
      expect(stdoutSpy).not.toHaveBeenCalled();
    });

    it('should filter correctly for progress level', () => {
      const reporter = new ConsoleReporter('progress');

      reporter.error('error');
      reporter.warning('warning');
      reporter.progress('progress');
      reporter.status('status');
      reporter.verbose('verbose');
      reporter.stream('stream');

      // Error and warning to stderr
      expect(stderrSpy).toHaveBeenCalledTimes(2);
      // Progress and status to stdout (not verbose or stream)
      expect(stdoutSpy).toHaveBeenCalledTimes(2);
    });

    it('should show all output in verbose level', () => {
      const reporter = new ConsoleReporter('verbose');

      reporter.error('error');
      reporter.warning('warning');
      reporter.progress('progress');
      reporter.status('status');
      reporter.verbose('verbose');
      reporter.stream('stream');

      // Error and warning to stderr
      expect(stderrSpy).toHaveBeenCalledTimes(2);
      // Progress, status, verbose, and stream to stdout
      expect(stdoutSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('getLevel()', () => {
    it('should return current output level', () => {
      expect(new ConsoleReporter('quiet').getLevel()).toBe('quiet');
      expect(new ConsoleReporter('progress').getLevel()).toBe('progress');
      expect(new ConsoleReporter('verbose').getLevel()).toBe('verbose');
    });
  });

  describe('Enhanced UI methods', () => {
    let originalIsTTY: boolean | undefined;

    beforeEach(() => {
      originalIsTTY = process.stdout.isTTY;
      vi.useFakeTimers();
    });

    afterEach(() => {
      process.stdout.isTTY = originalIsTTY;
      vi.useRealTimers();
    });

    describe('initEnhanced()', () => {
      it('should initialize and render when TTY is true', () => {
        process.stdout.isTTY = true;
        const reporter = new ConsoleReporter('progress');
        const stats = {
          currentIteration: 0,
          maxIterations: 50,
          tasksCompleted: null,
          tasksTotal: null,
          startTime: new Date(),
          lastUpdateTime: new Date(),
          iterationDurations: [],
          elapsedSeconds: 0,
          avgIterationSeconds: 0,
          etaSeconds: null,
          mode: 'loop' as const,
          status: 'starting' as const,
          stopRequested: false,
          stopSource: null,
        };

        reporter.initEnhanced(stats);

        // Should call logUpdate to render
        expect(logUpdate).toHaveBeenCalled();
      });

      it('should not initialize when TTY is false', () => {
        process.stdout.isTTY = false;
        const reporter = new ConsoleReporter('progress');
        const stats = {
          currentIteration: 0,
          maxIterations: 50,
          tasksCompleted: null,
          tasksTotal: null,
          startTime: new Date(),
          lastUpdateTime: new Date(),
          iterationDurations: [],
          elapsedSeconds: 0,
          avgIterationSeconds: 0,
          etaSeconds: null,
          mode: 'loop' as const,
          status: 'starting' as const,
          stopRequested: false,
          stopSource: null,
        };

        reporter.initEnhanced(stats);

        // Should not write anything
        expect(stdoutSpy).not.toHaveBeenCalled();
      });

      it('should only initialize once', () => {
        process.stdout.isTTY = true;
        const reporter = new ConsoleReporter('progress');
        const stats = {
          currentIteration: 0,
          maxIterations: 50,
          tasksCompleted: null,
          tasksTotal: null,
          startTime: new Date(),
          lastUpdateTime: new Date(),
          iterationDurations: [],
          elapsedSeconds: 0,
          avgIterationSeconds: 0,
          etaSeconds: null,
          mode: 'loop' as const,
          status: 'starting' as const,
          stopRequested: false,
          stopSource: null,
        };

        reporter.initEnhanced(stats);
        const firstCallCount = stdoutSpy.mock.calls.length;

        reporter.initEnhanced(stats);
        const secondCallCount = stdoutSpy.mock.calls.length;

        // Second call should not add more calls (already initialized)
        expect(secondCallCount).toBe(firstCallCount);
      });
    });

    describe('updateStats()', () => {
      it('should update stats when initialized and TTY is true', () => {
        process.stdout.isTTY = true;
        const reporter = new ConsoleReporter('progress');
        const stats = {
          currentIteration: 5,
          maxIterations: 50,
          tasksCompleted: 10,
          tasksTotal: 60,
          startTime: new Date(),
          lastUpdateTime: new Date(),
          iterationDurations: [25000],
          elapsedSeconds: 125,
          avgIterationSeconds: 25,
          etaSeconds: null,
          mode: 'loop' as const,
          status: 'running' as const,
          stopRequested: false,
          stopSource: null,
        };

        reporter.initEnhanced(stats);
        vi.mocked(logUpdate).mockClear();

        // Advance time to pass debounce threshold
        vi.advanceTimersByTime(600);

        reporter.updateStats(stats);

        expect(logUpdate).toHaveBeenCalled();
      });

      it('should debounce updates (max 2 Hz)', () => {
        process.stdout.isTTY = true;
        const reporter = new ConsoleReporter('progress');
        const stats = {
          currentIteration: 5,
          maxIterations: 50,
          tasksCompleted: 10,
          tasksTotal: 60,
          startTime: new Date(),
          lastUpdateTime: new Date(),
          iterationDurations: [25000],
          elapsedSeconds: 125,
          avgIterationSeconds: 25,
          etaSeconds: null,
          mode: 'loop' as const,
          status: 'running' as const,
          stopRequested: false,
          stopSource: null,
        };

        reporter.initEnhanced(stats);
        const initialCalls = vi.mocked(logUpdate).mock.calls.length;

        // Multiple rapid updates
        reporter.updateStats(stats);
        reporter.updateStats(stats);
        reporter.updateStats(stats);

        // Should not add more calls (debounced)
        expect(vi.mocked(logUpdate).mock.calls.length).toBe(initialCalls);

        // Advance time past debounce
        vi.advanceTimersByTime(600);
        reporter.updateStats(stats);

        // Now should have one more call
        expect(vi.mocked(logUpdate).mock.calls.length).toBe(initialCalls + 1);
      });

      it('should not update when TTY is false', () => {
        process.stdout.isTTY = false;
        const reporter = new ConsoleReporter('progress');
        const stats = {
          currentIteration: 5,
          maxIterations: 50,
          tasksCompleted: 10,
          tasksTotal: 60,
          startTime: new Date(),
          lastUpdateTime: new Date(),
          iterationDurations: [25000],
          elapsedSeconds: 125,
          avgIterationSeconds: 25,
          etaSeconds: null,
          mode: 'loop' as const,
          status: 'running' as const,
          stopRequested: false,
          stopSource: null,
        };

        reporter.updateStats(stats);

        expect(stdoutSpy).not.toHaveBeenCalled();
      });

      it('should not update when not initialized', () => {
        process.stdout.isTTY = true;
        const reporter = new ConsoleReporter('progress');
        const stats = {
          currentIteration: 5,
          maxIterations: 50,
          tasksCompleted: 10,
          tasksTotal: 60,
          startTime: new Date(),
          lastUpdateTime: new Date(),
          iterationDurations: [25000],
          elapsedSeconds: 125,
          avgIterationSeconds: 25,
          etaSeconds: null,
          mode: 'loop' as const,
          status: 'running' as const,
          stopRequested: false,
          stopSource: null,
        };

        // Don't call initEnhanced
        reporter.updateStats(stats);

        expect(stdoutSpy).not.toHaveBeenCalled();
      });
    });

    describe('cleanup()', () => {
      it('should cleanup when initialized', () => {
        process.stdout.isTTY = true;
        const reporter = new ConsoleReporter('progress');
        const stats = {
          currentIteration: 5,
          maxIterations: 50,
          tasksCompleted: 10,
          tasksTotal: 60,
          startTime: new Date(),
          lastUpdateTime: new Date(),
          iterationDurations: [25000],
          elapsedSeconds: 125,
          avgIterationSeconds: 25,
          etaSeconds: null,
          mode: 'loop' as const,
          status: 'running' as const,
          stopRequested: false,
          stopSource: null,
        };

        reporter.initEnhanced(stats);
        reporter.cleanup();

        // Should call logUpdate.done() to persist final output
        expect(logUpdate.done).toHaveBeenCalled();

        // Should be able to call cleanup multiple times safely
        vi.mocked(logUpdate.done).mockClear();
        reporter.cleanup();
        reporter.cleanup();
        expect(logUpdate.done).not.toHaveBeenCalled(); // Not initialized anymore
      });

      it('should do nothing when not initialized', () => {
        process.stdout.isTTY = false;
        const reporter = new ConsoleReporter('progress');

        // Should not throw
        expect(() => reporter.cleanup()).not.toThrow();
      });
    });
  });
});
