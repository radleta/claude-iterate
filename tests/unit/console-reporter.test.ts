import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConsoleReporter } from '../../src/services/console-reporter.js';

describe('ConsoleReporter', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stdoutSpy: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stderrSpy: any;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
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
});
