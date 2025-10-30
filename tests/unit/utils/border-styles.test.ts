import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  BorderStyle,
  getNone,
  getLine,
  _resetCache,
} from '../../../src/utils/border-styles.js';

describe('border-styles', () => {
  describe('getNone', () => {
    beforeEach(() => {
      _resetCache();
    });

    it('should return border style with all empty strings', () => {
      const none = getNone();

      expect(none.topLeft).toBe('');
      expect(none.topRight).toBe('');
      expect(none.bottomLeft).toBe('');
      expect(none.bottomRight).toBe('');
      expect(none.horizontal).toBe('');
      expect(none.vertical).toBe('');
      expect(none.leftT).toBe('');
      expect(none.rightT).toBe('');
    });

    it('should return same instance on multiple calls (singleton)', () => {
      const none1 = getNone();
      const none2 = getNone();

      expect(none1).toBe(none2);
    });

    it('should satisfy BorderStyle interface', () => {
      const none: BorderStyle = getNone();

      expect(none).toBeDefined();
      expect(typeof none.topLeft).toBe('string');
      expect(typeof none.topRight).toBe('string');
      expect(typeof none.bottomLeft).toBe('string');
      expect(typeof none.bottomRight).toBe('string');
      expect(typeof none.horizontal).toBe('string');
      expect(typeof none.vertical).toBe('string');
      expect(typeof none.leftT).toBe('string');
      expect(typeof none.rightT).toBe('string');
    });
  });

  describe('getLine', () => {
    let originalPlatform: string;
    let originalWT_SESSION: string | undefined;

    beforeEach(() => {
      _resetCache();
      originalPlatform = process.platform;
      originalWT_SESSION = process.env.WT_SESSION;
    });

    afterEach(() => {
      _resetCache();
      // Restore original values
      Object.defineProperty(process, 'platform', { value: originalPlatform });
      if (originalWT_SESSION !== undefined) {
        process.env.WT_SESSION = originalWT_SESSION;
      } else {
        delete process.env.WT_SESSION;
      }
    });

    it('should return Unicode characters on macOS', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      const line = getLine();

      expect(line.topLeft).toBe('┌');
      expect(line.topRight).toBe('┐');
      expect(line.bottomLeft).toBe('└');
      expect(line.bottomRight).toBe('┘');
      expect(line.horizontal).toBe('─');
      expect(line.vertical).toBe('│');
      expect(line.leftT).toBe('├');
      expect(line.rightT).toBe('┤');
    });

    it('should return Unicode characters on Linux', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      const line = getLine();

      expect(line.topLeft).toBe('┌');
      expect(line.topRight).toBe('┐');
      expect(line.bottomLeft).toBe('└');
      expect(line.bottomRight).toBe('┘');
      expect(line.horizontal).toBe('─');
      expect(line.vertical).toBe('│');
      expect(line.leftT).toBe('├');
      expect(line.rightT).toBe('┤');
    });

    it('should return Unicode characters on Windows Terminal', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.WT_SESSION = 'some-session-id';

      const line = getLine();

      expect(line.topLeft).toBe('┌');
      expect(line.topRight).toBe('┐');
      expect(line.bottomLeft).toBe('└');
      expect(line.bottomRight).toBe('┘');
      expect(line.horizontal).toBe('─');
      expect(line.vertical).toBe('│');
      expect(line.leftT).toBe('├');
      expect(line.rightT).toBe('┤');
    });

    it('should return ASCII characters on legacy Windows console', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      delete process.env.WT_SESSION;

      const line = getLine();

      expect(line.topLeft).toBe('+');
      expect(line.topRight).toBe('+');
      expect(line.bottomLeft).toBe('+');
      expect(line.bottomRight).toBe('+');
      expect(line.horizontal).toBe('-');
      expect(line.vertical).toBe('|');
      expect(line.leftT).toBe('+');
      expect(line.rightT).toBe('+');
    });

    it('should return same instance on multiple calls (singleton)', () => {
      const line1 = getLine();
      const line2 = getLine();

      expect(line1).toBe(line2);
    });

    it('should satisfy BorderStyle interface', () => {
      const line: BorderStyle = getLine();

      expect(line).toBeDefined();
      expect(typeof line.topLeft).toBe('string');
      expect(typeof line.topRight).toBe('string');
      expect(typeof line.bottomLeft).toBe('string');
      expect(typeof line.bottomRight).toBe('string');
      expect(typeof line.horizontal).toBe('string');
      expect(typeof line.vertical).toBe('string');
      expect(typeof line.leftT).toBe('string');
      expect(typeof line.rightT).toBe('string');
    });
  });

  describe('singleton behavior', () => {
    beforeEach(() => {
      _resetCache();
    });

    it('should maintain separate instances for getNone and getLine', () => {
      const none = getNone();
      const line = getLine();

      expect(none).not.toBe(line);
      expect(none.topLeft).not.toBe(line.topLeft);
    });

    it('should reset cache properly', () => {
      const none1 = getNone();
      const line1 = getLine();

      _resetCache();

      const none2 = getNone();
      const line2 = getLine();

      // After reset, should get new instances
      expect(none1).not.toBe(none2);
      expect(line1).not.toBe(line2);

      // But values should be the same
      expect(none1).toEqual(none2);
      expect(line1).toEqual(line2);
    });
  });
});
