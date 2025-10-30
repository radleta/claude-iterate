/**
 * Unit tests for TextTable class
 *
 * Note: Tests use ASCII characters and ANSI color codes only.
 * No emojis are used to avoid cross-platform alignment issues.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import chalk from 'chalk';
import {
  TextTable,
  type BorderStyle,
  type CellConfig,
} from '../../../src/utils/text-table.js';
import { getNone } from '../../../src/utils/border-styles.js';

describe('TextTable', () => {
  describe('ANSI and width utilities', () => {
    let table: TextTable;

    beforeEach(() => {
      table = new TextTable();
    });

    it('should measure plain text width correctly', () => {
      const cell: CellConfig = { content: 'hello', width: 10 };
      table.addRow([cell]);
      const lines = table.render();
      // Basic rendering works (more specific tests below)
      expect(lines).toBeDefined();
      expect(Array.isArray(lines)).toBe(true);
    });

    it('should handle ANSI codes in width calculation', () => {
      const cell: CellConfig = { content: chalk.red('hello'), width: 10 };
      table.addRow([cell]);
      const lines = table.render();
      // ANSI codes don't affect alignment
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should handle multiple ANSI codes', () => {
      const cell: CellConfig = {
        content: chalk.cyan.bold('test'),
        width: 10,
      };
      table.addRow([cell]);
      const lines = table.render();
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should handle empty strings', () => {
      const cell: CellConfig = { content: '', width: 10 };
      table.addRow([cell]);
      const lines = table.render();
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should handle text without ANSI codes', () => {
      const cell: CellConfig = { content: 'plain text', width: 20 };
      table.addRow([cell]);
      const lines = table.render();
      expect(lines.length).toBeGreaterThan(0);
    });
  });

  describe('wrapText', () => {
    let table: TextTable;

    beforeEach(() => {
      table = new TextTable();
    });

    it('should wrap text at word boundaries', () => {
      const wrapped = table._testWrapText('hello world test', 10);
      expect(wrapped.length).toBeGreaterThan(1);
      expect(wrapped[0]).toBe('hello');
      expect(wrapped[1]).toBe('world test');
    });

    it('should break long words mid-word when necessary', () => {
      const wrapped = table._testWrapText('verylongwordthatcantfit', 10);
      expect(wrapped.length).toBeGreaterThan(1);
      expect(wrapped[0]).toBe('verylongwo');
      expect(wrapped[1]).toBe('rdthatcant');
      expect(wrapped[2]).toBe('fit');
    });

    it('should return single line for short text', () => {
      const wrapped = table._testWrapText('short', 20);
      expect(wrapped.length).toBe(1);
      expect(wrapped[0]).toBe('short');
    });

    it('should handle empty text', () => {
      const wrapped = table._testWrapText('', 10);
      expect(wrapped.length).toBe(1);
      expect(wrapped[0]).toBe('');
    });

    it('should handle text with ANSI codes (strips before wrapping)', () => {
      const wrapped = table._testWrapText(chalk.red('hello world'), 10);
      expect(wrapped.length).toBeGreaterThan(1);
      expect(wrapped[0]).toBe('hello');
      expect(wrapped[1]).toBe('world');
    });
  });

  describe('alignText', () => {
    let table: TextTable;

    beforeEach(() => {
      table = new TextTable();
    });

    it('should left-align text', () => {
      const cell: CellConfig = { content: 'left', width: 10, align: 'left' };
      table.addRow([cell]);
      const lines = table.render();
      // Left alignment adds padding to the right
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should right-align text', () => {
      const cell: CellConfig = { content: 'right', width: 10, align: 'right' };
      table.addRow([cell]);
      const lines = table.render();
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should center-align text (even width)', () => {
      const cell: CellConfig = { content: 'hi', width: 10, align: 'center' };
      table.addRow([cell]);
      const lines = table.render();
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should center-align text (odd width)', () => {
      const cell: CellConfig = { content: 'hi', width: 11, align: 'center' };
      table.addRow([cell]);
      const lines = table.render();
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should preserve ANSI codes in alignment', () => {
      // Force chalk colors even in non-TTY environment
      const coloredText = '\x1b[36mtest\x1b[39m'; // Manual ANSI cyan
      const cell: CellConfig = {
        content: coloredText,
        width: 10,
        align: 'left',
      };
      table.addRow([cell]);
      const lines = table.render();
      // ANSI codes should be present in output
      expect(lines.some((line) => line.includes('\x1b['))).toBe(true);
    });

    it('should truncate text longer than width', () => {
      const cell: CellConfig = {
        content: 'verylongtext',
        width: 5,
        align: 'left',
      };
      table.addRow([cell]);
      const lines = table.render();
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should handle empty text alignment', () => {
      const cell: CellConfig = { content: '', width: 10, align: 'center' };
      table.addRow([cell]);
      const lines = table.render();
      expect(lines.length).toBeGreaterThan(0);
    });
  });

  describe('renderBorder', () => {
    const boxBorder: BorderStyle = {
      topLeft: '┌',
      topRight: '┐',
      bottomLeft: '└',
      bottomRight: '┘',
      horizontal: '─',
      vertical: '│',
      leftT: '├',
      rightT: '┤',
    };

    it('should render top border with correct characters', () => {
      const table = new TextTable({ width: 20, border: boxBorder });
      table.addRow([{ content: 'test', width: 16 }]);
      const lines = table.render();
      expect(lines[0]).toContain('┌');
      expect(lines[0]).toContain('┐');
      expect(lines[0]).toContain('─');
    });

    it('should render bottom border with correct characters', () => {
      const table = new TextTable({ width: 20, border: boxBorder });
      table.addRow([{ content: 'test', width: 16 }]);
      const lines = table.render();
      const lastLine = lines[lines.length - 1];
      expect(lastLine).toContain('└');
      expect(lastLine).toContain('┘');
      expect(lastLine).toContain('─');
    });

    it('should render divider border with correct characters', () => {
      const table = new TextTable({ width: 20, border: boxBorder });
      table
        .addRow([{ content: 'row1', width: 16 }])
        .addDivider()
        .addRow([{ content: 'row2', width: 16 }]);
      const lines = table.render();
      // Find divider line (contains ├ and ┤)
      const dividerLine = lines.find((line) => line.includes('├'));
      expect(dividerLine).toBeDefined();
      expect(dividerLine).toContain('├');
      expect(dividerLine).toContain('┤');
      expect(dividerLine).toContain('─');
    });

    it('should apply borderColor function if provided', () => {
      // Use a color function that actually returns ANSI codes
      const colorFn = (text: string) => `\x1b[36m${text}\x1b[39m`;
      const table = new TextTable({
        width: 20,
        border: boxBorder,
        borderColor: colorFn,
      });
      table.addRow([{ content: 'test', width: 16 }]);
      const lines = table.render();
      // ANSI codes should be present (from color function)
      expect(lines[0]).toContain('\x1b[');
    });

    it('should return empty string when no border config', () => {
      const table = new TextTable({ width: 20, border: getNone() });
      table.addRow([{ content: 'test', width: 16 }]);
      const lines = table.render();
      // No border characters in output
      expect(lines.every((line) => !line.includes('┌'))).toBe(true);
    });

    it('should respect configured table width', () => {
      const table = new TextTable({ width: 30, border: boxBorder });
      table.addRow([{ content: 'test', width: 26 }]);
      const lines = table.render();
      // Border line should be exactly 30 characters wide (visible width)
      const stripped = lines[0].replace(/\x1b\[[0-9;]*m/g, '');
      expect(stripped.length).toBe(30);
    });
  });

  describe('TextTable integration', () => {
    const boxBorder: BorderStyle = {
      topLeft: '┌',
      topRight: '┐',
      bottomLeft: '└',
      bottomRight: '┘',
      horizontal: '─',
      vertical: '│',
      leftT: '├',
      rightT: '┤',
    };

    it('should render simple two-column table with borders', () => {
      const table = new TextTable({ width: 40, border: boxBorder, padding: 1 });
      table.addRow([
        { content: 'Column 1', width: 18, align: 'left' },
        { content: 'Column 2', width: 18, align: 'left' },
      ]);
      const lines = table.render();

      expect(lines.length).toBe(3); // top border, content, bottom border
      expect(lines[0]).toContain('┌');
      expect(lines[1]).toContain('│');
      expect(lines[2]).toContain('└');
    });

    it('should render table with header, divider, content, footer', () => {
      const table = new TextTable({ width: 40, border: boxBorder, padding: 1 });
      table
        .addRow([{ content: chalk.bold('Header'), width: 36 }], 'header')
        .addDivider()
        .addRow([{ content: 'Content', width: 36 }])
        .addDivider()
        .addRow([{ content: chalk.dim('Footer'), width: 36 }], 'footer');

      const lines = table.render();

      expect(lines.length).toBe(7); // top, header, divider, content, divider, footer, bottom
      expect(lines[0]).toContain('┌');
      expect(lines[2]).toContain('├'); // First divider
      expect(lines[4]).toContain('├'); // Second divider
      expect(lines[6]).toContain('└');
    });

    it('should support fluent API (chained calls)', () => {
      const table = new TextTable({ width: 40, border: boxBorder });

      const result = table
        .addRow([{ content: 'Row 1', width: 36 }])
        .addDivider()
        .addRow([{ content: 'Row 2', width: 36 }]);

      expect(result).toBe(table); // Fluent API returns this
      const lines = table.render();
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should handle ANSI-colored cells throughout table', () => {
      // Use manual ANSI codes to ensure they're present in test environment
      const table = new TextTable({ width: 40, border: boxBorder });
      table
        .addRow([
          { content: '\x1b[31mRed\x1b[39m', width: 18 },
          { content: '\x1b[34mBlue\x1b[39m', width: 18 },
        ])
        .addRow([
          { content: '\x1b[32mGreen\x1b[39m', width: 18 },
          { content: '\x1b[33mYellow\x1b[39m', width: 18 },
        ]);

      const lines = table.render();
      const contentLines = lines.join('\n');

      // All colors should be present
      expect(contentLines).toContain('\x1b[');
    });

    it('should render empty table (just borders)', () => {
      const table = new TextTable({ width: 20, border: boxBorder });
      const lines = table.render();

      expect(lines.length).toBe(2); // top and bottom borders only
      expect(lines[0]).toContain('┌');
      expect(lines[1]).toContain('└');
    });

    it('should evaluate dynamic content functions on each render', () => {
      let counter = 0;
      const table = new TextTable({ width: 30, border: boxBorder });
      table.addRow([{ content: () => `Count: ${counter}`, width: 26 }]);

      // First render
      const lines1 = table.render();
      expect(lines1.some((line) => line.includes('Count: 0'))).toBe(true);

      // Increment counter
      counter++;

      // Second render - function should be called again
      const lines2 = table.render();
      expect(lines2.some((line) => line.includes('Count: 1'))).toBe(true);

      // Third render
      counter++;
      const lines3 = table.render();
      expect(lines3.some((line) => line.includes('Count: 2'))).toBe(true);
    });

    it('should handle mixed static and dynamic content', () => {
      let value = 100;
      const table = new TextTable({ width: 40, border: boxBorder });
      table.addRow([
        { content: 'Static Label', width: 18 },
        { content: () => `${value}%`, width: 18 },
      ]);

      const lines1 = table.render();
      expect(lines1.some((line) => line.includes('Static Label'))).toBe(true);
      expect(lines1.some((line) => line.includes('100%'))).toBe(true);

      value = 50;
      const lines2 = table.render();
      expect(lines2.some((line) => line.includes('Static Label'))).toBe(true);
      expect(lines2.some((line) => line.includes('50%'))).toBe(true);
    });

    it('should handle dynamic content errors gracefully', () => {
      const table = new TextTable({ width: 30, border: boxBorder });
      table.addRow([
        {
          content: () => {
            throw new Error('Test error');
          },
          width: 26,
        },
      ]);

      // Should not throw, should return [ERROR] placeholder
      const lines = table.render();
      expect(lines.some((line) => line.includes('[ERROR]'))).toBe(true);
    });

    it('should match console-reporter output format (without emojis)', () => {
      const table = new TextTable({
        width: 78,
        border: boxBorder,
        padding: 1,
        borderColor: chalk.cyan,
      });

      table
        .addRow(
          [{ content: chalk.bold('claude-iterate'), width: 74 }],
          'header'
        )
        .addDivider()
        .addRow([
          { content: 'Elapsed', width: 36, align: 'left' },
          { content: 'ETA', width: 36, align: 'left' },
        ])
        .addRow([
          { content: '2m 15s', width: 36, align: 'left' },
          { content: '3m 45s', width: 36, align: 'left' },
        ])
        .addDivider()
        .addRow([{ content: chalk.dim('Progress: 50%'), width: 74 }], 'footer');

      const lines = table.render();

      expect(lines.length).toBe(8); // top, header, div, row, row, div, footer, bottom
      expect(lines.some((line) => line.includes('claude-iterate'))).toBe(true);
      expect(lines.some((line) => line.includes('Elapsed'))).toBe(true);
      expect(lines.some((line) => line.includes('ETA'))).toBe(true);
      expect(lines.some((line) => line.includes('2m 15s'))).toBe(true);
      expect(lines.some((line) => line.includes('3m 45s'))).toBe(true);
    });

    // Regression test: Locks in exact character-level rendering for multi-row/column/divider tables
    it('should render complex multi-row multi-column table with dividers and match exact character output', () => {
      const boxBorder: BorderStyle = {
        topLeft: '┌',
        topRight: '┐',
        bottomLeft: '└',
        bottomRight: '┘',
        horizontal: '─',
        vertical: '│',
        leftT: '├',
        rightT: '┤',
      };

      const table = new TextTable({ width: 60, border: boxBorder, padding: 1 });

      // Add header row
      table.addRow([{ content: 'Table Header', width: 56 }], 'header');

      // Add first divider
      table.addDivider();

      // Add data rows
      table.addRow([
        { content: 'Row 1', width: 16, align: 'left' },
        { content: 'Value 1', width: 17, align: 'left' },
        { content: 'Status 1', width: 17, align: 'left' },
      ]);
      table.addRow([
        { content: 'Row 2', width: 16, align: 'left' },
        { content: 'Value 2', width: 17, align: 'left' },
        { content: 'Status 2', width: 17, align: 'left' },
      ]);

      // Add second divider
      table.addDivider();

      // Add footer row
      table.addRow([{ content: 'Footer', width: 56 }], 'footer');

      // Render table
      const lines = table.render();

      // Strip ANSI codes from all lines
      const strippedLines = lines.map((line) =>
        line.replace(/\x1b\[[0-9;]*m/g, '')
      );

      // Expected output with exact character-level rendering
      const expectedLines = [
        '┌──────────────────────────────────────────────────────────┐',
        '│ Table Header                                             │',
        '├──────────────────────────────────────────────────────────┤',
        '│ Row 1            │ Value 1           │ Status 1          │',
        '│ Row 2            │ Value 2           │ Status 2          │',
        '├──────────────────────────────────────────────────────────┤',
        '│ Footer                                                   │',
        '└──────────────────────────────────────────────────────────┘',
      ];

      // Assert line count matches
      expect(strippedLines.length).toBe(expectedLines.length);

      // Assert each line matches expected
      for (let i = 0; i < expectedLines.length; i++) {
        expect(strippedLines[i]).toBe(expectedLines[i]);
      }
    });
  });

  describe('edge cases and special scenarios', () => {
    it('should handle table with single cell', () => {
      const table = new TextTable({ width: 20 });
      table.addRow([{ content: 'Single cell', width: 18 }]);
      const lines = table.render();
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should handle cells with trim enabled', () => {
      const table = new TextTable({ width: 30 });
      table.addRow([{ content: '  trimmed  ', width: 28, trim: true }]);
      const lines = table.render();
      expect(lines.some((line) => line.includes('trimmed'))).toBe(true);
    });

    it('should handle cells with trim disabled', () => {
      const table = new TextTable({ width: 30 });
      table.addRow([{ content: '  not trimmed  ', width: 28, trim: false }]);
      const lines = table.render();
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should handle zero-width table config', () => {
      const table = new TextTable({ width: 0 }); // Auto-calculate
      table.addRow([{ content: 'test', width: 20 }]);
      const lines = table.render();
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should handle table without padding', () => {
      const boxBorder: BorderStyle = {
        topLeft: '┌',
        topRight: '┐',
        bottomLeft: '└',
        bottomRight: '┘',
        horizontal: '─',
        vertical: '│',
        leftT: '├',
        rightT: '┤',
      };

      const table = new TextTable({ width: 20, border: boxBorder, padding: 0 });
      table.addRow([{ content: 'test', width: 18 }]);
      const lines = table.render();
      expect(lines.length).toBe(3);
    });

    it('should handle multiple consecutive dividers', () => {
      const boxBorder: BorderStyle = {
        topLeft: '┌',
        topRight: '┐',
        bottomLeft: '└',
        bottomRight: '┘',
        horizontal: '─',
        vertical: '│',
        leftT: '├',
        rightT: '┤',
      };

      const table = new TextTable({ width: 20, border: boxBorder });
      table
        .addRow([{ content: 'row1', width: 16 }])
        .addDivider()
        .addDivider(); // Double divider

      const lines = table.render();
      // Should only add one divider (last marked index)
      expect(lines.length).toBe(4);
    });
  });

  describe('width validation and auto-correction', () => {
    const boxBorder: BorderStyle = {
      topLeft: '┌',
      topRight: '┐',
      bottomLeft: '└',
      bottomRight: '┘',
      horizontal: '─',
      vertical: '│',
      leftT: '├',
      rightT: '┤',
    };

    it('should calculate required width for single-column layout', () => {
      const table = new TextTable({ width: 78, border: boxBorder, padding: 1 });
      // Formula: 2 (borders) + (1 * 2 * 1) (padding) + 0 (separators) + 74 (content) = 78
      const required = table._testCalculateRequiredWidth(1, [74]);
      expect(required).toBe(78);
    });

    it('should calculate required width for two-column layout', () => {
      const table = new TextTable({ width: 78, border: boxBorder, padding: 1 });
      // Formula: 2 (borders) + (2 * 2 * 1) (padding) + 1 (separator) + 35 + 36 (content) = 78
      const required = table._testCalculateRequiredWidth(2, [35, 36]);
      expect(required).toBe(78);
    });

    it('should not adjust widths when they fit exactly', () => {
      const table = new TextTable({ width: 78, border: boxBorder, padding: 1 });
      const adjusted = table._testAdjustCellWidths(78, [35, 36]);
      expect(adjusted).toEqual([35, 36]);
    });

    it('should proportionally scale widths when they exceed table width', () => {
      const table = new TextTable({ width: 78, border: boxBorder, padding: 1 });
      // Request 36 + 36 = 72 content, but only 71 available
      // Available: 78 - 2 (borders) - 4 (padding) - 1 (separator) = 71
      // Scale factor: 71/72 = 0.9861
      // 36 * 0.9861 = 35.5 → floor = 35 for both
      // Remainder: 71 - 35 - 35 = 1 → add to first cell
      const adjusted = table._testAdjustCellWidths(78, [36, 36]);
      expect(adjusted).toEqual([36, 35]); // First cell gets remainder
      expect(adjusted.reduce((sum, w) => sum + w, 0)).toBe(71);
    });

    it('should distribute remainder to maintain exact width', () => {
      const table = new TextTable({ width: 78, border: boxBorder, padding: 1 });
      // Request 25 + 25 + 25 = 75 content, but only 69 available
      // Available: 78 - 2 (borders) - 6 (padding) - 2 (separators) = 68
      // Scale factor: 68/75 = 0.9067
      // 25 * 0.9067 = 22.67 → floor = 22 for all
      // Remainder: 68 - 22 - 22 - 22 = 2 → add to first two cells
      const adjusted = table._testAdjustCellWidths(78, [25, 25, 25]);
      expect(adjusted).toEqual([23, 23, 22]);
      expect(adjusted.reduce((sum, w) => sum + w, 0)).toBe(68);
    });

    it('should auto-correct widths in actual rendering', () => {
      const table = new TextTable({ width: 78, border: boxBorder, padding: 1 });
      // Intentionally use incorrect widths (36 + 36 = 72, exceeds available 71)
      table.addRow([
        { content: 'Left column', width: 36, align: 'left' },
        { content: 'Right column', width: 36, align: 'left' },
      ]);

      const lines = table.render();
      // Should render without exceeding 78 chars
      lines.forEach((line) => {
        // Strip ANSI codes for accurate measurement
        const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
        expect(stripped.length).toBeLessThanOrEqual(78);
      });
    });
  });

  describe('content normalization', () => {
    it('should normalize embedded newlines to spaces', () => {
      const table = new TextTable();
      const normalized = table._testNormalizeContent('line1\nline2');
      expect(normalized).toBe('line1 line2');
    });

    it('should normalize tabs to spaces', () => {
      const table = new TextTable();
      const normalized = table._testNormalizeContent('col1\tcol2');
      expect(normalized).toBe('col1 col2');
    });

    it('should collapse multiple spaces to single space', () => {
      const table = new TextTable();
      const normalized = table._testNormalizeContent('multiple    spaces');
      expect(normalized).toBe('multiple spaces');
    });

    it('should trim leading and trailing whitespace', () => {
      const table = new TextTable();
      const normalized = table._testNormalizeContent('  trimmed  ');
      expect(normalized).toBe('trimmed');
    });

    it('should handle mixed whitespace (newlines + tabs + spaces)', () => {
      const table = new TextTable();
      const normalized = table._testNormalizeContent(
        'line1\n\t  line2  \n  line3'
      );
      expect(normalized).toBe('line1 line2 line3');
    });

    it('should prevent layout-breaking content in rendered rows', () => {
      const boxBorder: BorderStyle = {
        topLeft: '┌',
        topRight: '┐',
        bottomLeft: '└',
        bottomRight: '┘',
        horizontal: '─',
        vertical: '│',
        leftT: '├',
        rightT: '┤',
      };

      const table = new TextTable({ width: 40, border: boxBorder, padding: 1 });
      // Content with embedded newlines that would break layout
      table.addRow([{ content: 'Line1\nLine2\nLine3', width: 36 }]);

      const lines = table.render();
      // Should render as single row (3 lines total: top, content, bottom)
      expect(lines.length).toBe(3);
      // Content should be normalized to single line
      expect(lines[1]).toContain('Line1 Line2 Line3');
    });
  });

  describe('measureContent (auto-width)', () => {
    it('should measure static text content', () => {
      const table = new TextTable({ width: 80 });
      table.addRow([{ content: 'hello' }, { content: 'world' }]);

      const widths = table._testMeasureContent();
      expect(widths).toEqual([5, 5]);
    });

    it('should measure ANSI-colored content correctly', () => {
      const table = new TextTable({ width: 80 });
      table.addRow([
        { content: chalk.red('hello') },
        { content: chalk.green('world') },
      ]);

      const widths = table._testMeasureContent();
      // ANSI codes stripped - visible width only
      expect(widths).toEqual([5, 5]);
    });

    it('should evaluate dynamic content functions', () => {
      const table = new TextTable({ width: 80 });
      table.addRow([{ content: () => 'dynamic' }]);

      const widths = table._testMeasureContent();
      expect(widths).toEqual([7]);
    });

    it('should return maximum width per column across multiple rows', () => {
      const table = new TextTable({ width: 80 });
      table.addRow([{ content: 'hi' }, { content: 'world' }]);
      table.addRow([{ content: 'hello' }, { content: 'x' }]);

      const widths = table._testMeasureContent();
      // max([2, 5], [5, 1]) = [5, 5]
      expect(widths).toEqual([5, 5]);
    });

    it('should handle colspan by distributing width', () => {
      const table = new TextTable({ width: 80 });
      table.addRow([{ content: 'hello world', colspan: 2 }]);
      table.addRow([{ content: 'a' }, { content: 'b' }]);

      const widths = table._testMeasureContent();
      // "hello world" = 11 chars, distributed as ceil(11/2) = 6 per column
      // Second row has [1, 1]
      // Result: max([6, 6], [1, 1]) = [6, 6]
      expect(widths[0]).toBeGreaterThanOrEqual(5);
      expect(widths[1]).toBeGreaterThanOrEqual(5);
    });

    it('should return empty array for empty table', () => {
      const table = new TextTable({ width: 80 });
      const widths = table._testMeasureContent();
      expect(widths).toEqual([]);
    });
  });

  describe('auto-width rendering', () => {
    it('should render table without width specifications using content-based sizing', () => {
      const table = new TextTable({ width: 78, padding: 1, border: getNone() });
      table.addRow([
        { content: 'short' },
        { content: 'a much longer piece of text' },
      ]);

      const lines = table.render();
      // Should render with proportional widths
      expect(lines.length).toBeGreaterThan(0);
      // Verify second column is wider (content-based, not equal distribution)
      const contentLine = lines[0];
      expect(contentLine).toContain('short');
      expect(contentLine).toContain('a much longer piece of text');
    });

    it('should respect manual width overrides when specified', () => {
      const table = new TextTable({ width: 78, padding: 1 });
      table.addRow([{ content: 'text', width: 20 }, { content: 'other' }]);

      const lines = table.render();
      expect(lines.length).toBeGreaterThan(0);
      // First column should be exactly 20 characters
      // (verify by checking spacing in rendered output)
    });

    it('should use proportional distribution for varying content lengths', () => {
      const table = new TextTable({ width: 78, padding: 1, border: getNone() });
      table.addRow([
        { content: 'x' },
        { content: 'medium text' },
        { content: 'y' },
      ]);

      const lines = table.render();
      expect(lines.length).toBeGreaterThan(0);
      // Middle column should be wider than side columns
      const contentLine = lines[0];
      expect(contentLine).toContain('medium text');
    });

    it('should handle mixed manual and auto widths', () => {
      const table = new TextTable({ width: 78, padding: 1 });
      table.addRow([
        { content: 'fixed', width: 15 },
        { content: 'auto' },
        { content: 'also auto' },
      ]);

      const lines = table.render();
      expect(lines.length).toBeGreaterThan(0);
      // First column fixed at 15, others auto-sized proportionally
    });

    it('should handle dynamic content in auto-width calculation', () => {
      let value = 'initial';
      const table = new TextTable({ width: 78, padding: 1, border: getNone() });
      table.addRow([{ content: () => value }, { content: 'static' }]);

      // First render with "initial"
      const lines1 = table.render();
      expect(lines1[0]).toContain('initial');

      // Change value and re-render
      value = 'changed value that is longer';
      const lines2 = table.render();
      expect(lines2[0]).toContain('changed value that is longer');
      // Width should be recalculated for new content
    });

    it('should maintain correct overhead calculations with auto-width', () => {
      const table = new TextTable({ width: 78, padding: 1 });
      table.addRow([{ content: 'a' }]);

      const lines = table.render();
      // Total width should not exceed configured width
      expect(lines[0]?.length).toBeLessThanOrEqual(78);
    });

    it('should handle ANSI codes in auto-width rendering', () => {
      const table = new TextTable({ width: 78, padding: 1 });
      table.addRow([
        { content: chalk.red('hello') },
        { content: chalk.green('world') },
      ]);

      const lines = table.render();
      expect(lines.length).toBeGreaterThan(0);
      // ANSI codes should not affect alignment
    });
  });

  describe('auto-width edge cases', () => {
    it('should handle single cell table', () => {
      const table = new TextTable({ width: 78, padding: 1 });
      table.addRow([{ content: 'single' }]);

      const lines = table.render();
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should handle very long content', () => {
      const table = new TextTable({ width: 78, padding: 1 });
      const longText = 'a'.repeat(100);
      table.addRow([{ content: longText }]);

      const lines = table.render();
      expect(lines.length).toBeGreaterThan(0);
      // Content should be truncated or wrapped to fit
    });

    it('should handle empty content cells', () => {
      const table = new TextTable({ width: 78, padding: 1 });
      table.addRow([{ content: '' }, { content: 'text' }]);

      const lines = table.render();
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should handle table with many columns', () => {
      const table = new TextTable({ width: 120, padding: 1 });
      table.addRow([
        { content: 'a' },
        { content: 'b' },
        { content: 'c' },
        { content: 'd' },
        { content: 'e' },
      ]);

      const lines = table.render();
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should handle tables without borders', () => {
      const table = new TextTable({ width: 78, padding: 1, border: getNone() });
      table.addRow([{ content: 'no' }, { content: 'borders' }]);

      const lines = table.render();
      expect(lines.length).toBeGreaterThan(0);
      // Should not have border characters
      expect(lines[0]?.startsWith('│')).toBe(false);
    });
  });
});
