import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getBoxCharacters } from '../../../src/utils/box-characters.js';

describe('box-characters', () => {
  describe('getBoxCharacters', () => {
    let originalPlatform: string;
    let originalWT_SESSION: string | undefined;

    beforeEach(() => {
      originalPlatform = process.platform;
      originalWT_SESSION = process.env.WT_SESSION;
    });

    afterEach(() => {
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
      const box = getBoxCharacters();

      expect(box.topLeft).toBe('┌');
      expect(box.topRight).toBe('┐');
      expect(box.bottomLeft).toBe('└');
      expect(box.bottomRight).toBe('┘');
      expect(box.horizontal).toBe('─');
      expect(box.vertical).toBe('│');
      expect(box.leftT).toBe('├');
      expect(box.rightT).toBe('┤');
    });

    it('should return Unicode characters on Linux', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      const box = getBoxCharacters();

      expect(box.topLeft).toBe('┌');
      expect(box.topRight).toBe('┐');
      expect(box.bottomLeft).toBe('└');
      expect(box.bottomRight).toBe('┘');
      expect(box.horizontal).toBe('─');
      expect(box.vertical).toBe('│');
      expect(box.leftT).toBe('├');
      expect(box.rightT).toBe('┤');
    });

    it('should return Unicode characters on Windows Terminal', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.WT_SESSION = 'some-session-id';

      const box = getBoxCharacters();

      expect(box.topLeft).toBe('┌');
      expect(box.topRight).toBe('┐');
      expect(box.bottomLeft).toBe('└');
      expect(box.bottomRight).toBe('┘');
      expect(box.horizontal).toBe('─');
      expect(box.vertical).toBe('│');
      expect(box.leftT).toBe('├');
      expect(box.rightT).toBe('┤');
    });

    it('should return ASCII characters on legacy Windows console', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      delete process.env.WT_SESSION;

      const box = getBoxCharacters();

      expect(box.topLeft).toBe('+');
      expect(box.topRight).toBe('+');
      expect(box.bottomLeft).toBe('+');
      expect(box.bottomRight).toBe('+');
      expect(box.horizontal).toBe('-');
      expect(box.vertical).toBe('|');
      expect(box.leftT).toBe('+');
      expect(box.rightT).toBe('+');
    });
  });
});
