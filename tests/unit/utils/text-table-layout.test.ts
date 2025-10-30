import { describe, it, expect } from 'vitest';
import {
  calculateOverhead,
  calculateAvailableWidth,
} from '../../../src/utils/text-table-layout.js';

describe('text-table-layout', () => {
  describe('calculateOverhead', () => {
    describe('with borders', () => {
      it('should calculate overhead for 1 column table', () => {
        // Formula: 2 (borders) + (1 * 2 * 1) + 0 (separators) = 4
        expect(calculateOverhead(1, 1, true)).toBe(4);
      });

      it('should calculate overhead for 2 column table', () => {
        // Formula: 2 (borders) + (2 * 2 * 1) + 1 (separator) = 7
        expect(calculateOverhead(2, 1, true)).toBe(7);
      });

      it('should calculate overhead for 3 column table', () => {
        // Formula: 2 (borders) + (3 * 2 * 1) + 2 (separators) = 10
        expect(calculateOverhead(3, 1, true)).toBe(10);
      });

      it('should calculate overhead for 5 column table', () => {
        // Formula: 2 (borders) + (5 * 2 * 1) + 4 (separators) = 16
        expect(calculateOverhead(5, 1, true)).toBe(16);
      });

      it('should handle padding=0', () => {
        // Formula: 2 (borders) + (2 * 2 * 0) + 1 (separator) = 3
        expect(calculateOverhead(2, 0, true)).toBe(3);
      });

      it('should handle padding=2', () => {
        // Formula: 2 (borders) + (2 * 2 * 2) + 1 (separator) = 11
        expect(calculateOverhead(2, 2, true)).toBe(11);
      });
    });

    describe('without borders', () => {
      it('should calculate overhead for 1 column table', () => {
        // Formula: 0 (borders) + (1 * 2 * 1) + 0 (separators) = 2
        expect(calculateOverhead(1, 1, false)).toBe(2);
      });

      it('should calculate overhead for 2 column table', () => {
        // Formula: 0 (borders) + (2 * 2 * 1) + 0 (separators) = 4
        expect(calculateOverhead(2, 1, false)).toBe(4);
      });

      it('should calculate overhead for 3 column table', () => {
        // Formula: 0 (borders) + (3 * 2 * 1) + 0 (separators) = 6
        expect(calculateOverhead(3, 1, false)).toBe(6);
      });

      it('should handle padding=0', () => {
        // Formula: 0 (borders) + (2 * 2 * 0) + 0 (separators) = 0
        expect(calculateOverhead(2, 0, false)).toBe(0);
      });

      it('should handle padding=2', () => {
        // Formula: 0 (borders) + (2 * 2 * 2) + 0 (separators) = 8
        expect(calculateOverhead(2, 2, false)).toBe(8);
      });
    });

    describe('edge cases', () => {
      it('should handle 0 columns', () => {
        // Formula: 2 (borders) + (0 * 2 * 1) + 0 (separators) = 2
        expect(calculateOverhead(0, 1, true)).toBe(2);
      });

      it('should handle large column count', () => {
        // Formula: 2 (borders) + (10 * 2 * 1) + 9 (separators) = 31
        expect(calculateOverhead(10, 1, true)).toBe(31);
      });
    });
  });

  describe('calculateAvailableWidth', () => {
    it('should calculate available width with typical values', () => {
      expect(calculateAvailableWidth(78, 8)).toBe(70);
    });

    it('should calculate available width with 80 char table', () => {
      expect(calculateAvailableWidth(80, 7)).toBe(73);
    });

    it('should calculate available width with no overhead', () => {
      expect(calculateAvailableWidth(100, 0)).toBe(100);
    });

    it('should return 0 when overhead exceeds total width', () => {
      expect(calculateAvailableWidth(10, 15)).toBe(0);
    });

    it('should return 0 when overhead equals total width', () => {
      expect(calculateAvailableWidth(10, 10)).toBe(0);
    });

    it('should handle small available widths', () => {
      expect(calculateAvailableWidth(10, 8)).toBe(2);
    });

    it('should handle large widths', () => {
      expect(calculateAvailableWidth(1000, 31)).toBe(969);
    });
  });

  describe('integration - matching existing formulas', () => {
    it('should match formula from text-table.test.ts:585-596', () => {
      // From test: "2 (borders) + (1 * 2 * 1) + 0 + 74 = 78"
      // This means: overhead + contentWidth = totalWidth
      // So: 2 + 2 + 0 + 74 = 78
      // Therefore overhead = 4
      const overhead = calculateOverhead(1, 1, true);
      expect(overhead).toBe(4);
      expect(overhead + 74).toBe(78);
    });

    it('should match 2-column example with padding=1', () => {
      // For 2 columns, borders, padding=1
      const overhead = calculateOverhead(2, 1, true);
      expect(overhead).toBe(7);

      // If table width is 78, available content = 71
      const available = calculateAvailableWidth(78, overhead);
      expect(available).toBe(71);
    });

    it('should match console-reporter pattern (78 chars, 2 borders, padding)', () => {
      // From console-reporter.ts:164 - hardcoded width: 74
      // This suggests: 78 (total) - 2 (borders) - 2 (padding for 1 column) = 74
      const overhead = calculateOverhead(1, 1, true);
      const available = calculateAvailableWidth(78, overhead);
      expect(available).toBe(74);
    });
  });
});
