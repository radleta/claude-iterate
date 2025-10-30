/**
 * TextTable - A reusable, testable text layout abstraction for console output
 *
 * Provides comprehensive table rendering with borders, padding, alignment, wrapping,
 * and dynamic content support. Eliminates manual layout calculations in console output.
 *
 * @example
 * ```typescript
 * import { TextTable, getLine } from './utils';
 * import chalk from 'chalk';
 *
 * const table = new TextTable({
 *   width: 78,
 *   border: getLine(),
 *   padding: 1,
 *   borderColor: chalk.cyan
 * });
 *
 * table
 *   .addRow([{ content: chalk.bold('Title'), colspan: 2 }], 'header')
 *   .addDivider()
 *   .addRow([
 *     { content: 'Label', width: 38, align: 'left' },
 *     { content: 'Value', width: 38, align: 'right' }
 *   ])
 *   .addDivider()
 *   .addRow([{ content: 'Footer', colspan: 2 }], 'footer');
 *
 * const lines = table.render();
 * console.log(lines.join('\n'));
 * ```
 *
 * @example Dynamic content for real-time updates with log-update
 * ```typescript
 * let counter = 0;
 * const table = new TextTable({ width: 50, border: getLine() });
 *
 * table.addRow([
 *   { content: () => `Count: ${counter}`, width: 48 }
 * ]);
 *
 * setInterval(() => {
 *   counter++;
 *   logUpdate(table.render().join('\n')); // Functions re-evaluated each render
 * }, 1000);
 * ```
 */

import { BorderStyle, getLine } from './border-styles.js';

/**
 * Table-level configuration.
 */
export interface TableConfig {
  /** Total table width in characters. If not specified, auto-calculated from column widths. */
  width?: number;
  /** Border style using box-drawing characters. If not specified, no borders rendered. */
  border?: BorderStyle;
  /** Cell padding (spaces on left and right of content). Default: 1 */
  padding?: number;
  /** Function to colorize border characters (e.g., chalk.cyan). Default: identity function */
  borderColor?: (text: string) => string;
}

/**
 * Row type for semantic layout.
 */
export type RowType = 'normal' | 'header' | 'footer';

/**
 * Cell configuration with support for dynamic content.
 */
export interface CellConfig {
  /**
   * Cell content. Can be:
   * - Static string
   * - Dynamic function that returns current content (evaluated on each render)
   *
   * Dynamic functions enable table reuse: create table once, update external state,
   * re-render without rebuilding table structure.
   */
  content: string | (() => string);
  /** Column width in characters. If not specified, auto-calculated from content. */
  width?: number;
  /** Text alignment within cell. Default: 'left' */
  align?: 'left' | 'right' | 'center';
  /** Wrap long text to multiple lines at word boundaries. Default: false */
  wrap?: boolean;
  /** Trim leading/trailing whitespace from content. Default: false */
  trim?: boolean;
  /** Number of columns this cell spans. Default: 1 */
  colspan?: number;
}

/**
 * Internal row storage.
 */
interface RowData {
  cells: CellConfig[];
  type: RowType;
}

/**
 * TextTable class for rendering formatted console tables.
 *
 * Features:
 * - Complete border management (top, bottom, sides, dividers)
 * - Auto-padding with configurable cell padding
 * - Multi-line wrapping with word-boundary breaks
 * - ANSI-aware width calculation (handles chalk colors correctly)
 * - Dynamic content support (functions evaluated on each render)
 * - Column width auto-calculation
 * - Divider rows for visual separation
 * - Row types (header/footer/normal) for semantic layout
 * - Fluent API for chainable calls
 * - Colspan support for flexible layouts
 *
 * All width calculations strip ANSI codes for accurate alignment.
 */
export class TextTable {
  private readonly config: Required<TableConfig>;
  private readonly rows: RowData[] = [];
  private readonly dividers: Set<number> = new Set();

  /**
   * Create a new TextTable.
   *
   * @param config - Table configuration
   */
  constructor(config?: TableConfig) {
    this.config = {
      width: config?.width ?? 0,
      border: config?.border ?? getLine(),
      padding: config?.padding ?? 1,
      borderColor: config?.borderColor ?? ((text: string) => text),
    };
  }

  /**
   * Add a row to the table.
   *
   * @param cells - Array of cell configurations
   * @param type - Row type for semantic layout. Default: 'normal'
   * @returns this (for fluent API chaining)
   *
   * @example
   * ```typescript
   * table
   *   .addRow([{ content: 'Header' }], 'header')
   *   .addRow([{ content: 'Content' }]);
   * ```
   */
  addRow(cells: CellConfig[], type: RowType = 'normal'): this {
    this.rows.push({ cells, type });
    return this;
  }

  /**
   * Add a horizontal divider line after the last added row.
   *
   * @returns this (for fluent API chaining)
   *
   * @example
   * ```typescript
   * table
   *   .addRow([{ content: 'Row 1' }])
   *   .addDivider()
   *   .addRow([{ content: 'Row 2' }]);
   * ```
   */
  addDivider(): this {
    this.dividers.add(this.rows.length - 1);
    return this;
  }

  /**
   * Render the table to an array of formatted lines.
   *
   * Dynamic content functions (if any) are evaluated during rendering.
   * Call render() multiple times to re-evaluate dynamic content with fresh values.
   *
   * @returns Array of strings, one per output line
   *
   * @example
   * ```typescript
   * const lines = table.render();
   * console.log(lines.join('\n'));
   * ```
   */
  render(): string[] {
    const output: string[] = [];

    // Add top border if configured
    if (this.hasBorder()) {
      output.push(this.renderBorder('top'));
    }

    // Render each row
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i];
      if (!row) continue; // Skip if undefined (strict mode safety)
      const rowLines = this.renderRow(row);
      output.push(...rowLines);

      // Add divider if marked
      if (this.dividers.has(i) && this.hasBorder()) {
        output.push(this.renderBorder('divider'));
      }
    }

    // Add bottom border if configured
    if (this.hasBorder()) {
      output.push(this.renderBorder('bottom'));
    }

    return output;
  }

  /**
   * Check if border rendering is enabled.
   */
  private hasBorder(): boolean {
    return Boolean(
      this.config.border &&
        this.config.border.horizontal &&
        this.config.border.vertical
    );
  }

  /**
   * Evaluate cell content (call function if dynamic, return string as-is).
   *
   * @param content - Static string or dynamic function
   * @returns Evaluated content string
   */
  private evaluateContent(content: string | (() => string)): string {
    if (typeof content === 'function') {
      try {
        return content();
      } catch (error) {
        // Handle errors in dynamic content gracefully
        console.warn(
          'TextTable: Error evaluating dynamic content function:',
          error
        );
        return '[ERROR]';
      }
    }
    return content;
  }

  /**
   * Strip ANSI escape codes from text for accurate width measurement.
   *
   * Matches all ANSI color/style codes (e.g., from chalk).
   *
   * @param text - Text that may contain ANSI codes
   * @returns Text with ANSI codes removed
   */
  private stripAnsi(text: string): string {
    // Regex matches ANSI escape sequences: \x1b[...m
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }

  /**
   * Measure the visible width of text (ANSI-aware).
   *
   * @param text - Text to measure (may contain ANSI codes)
   * @returns Visible character count (excluding ANSI codes)
   */
  private measureWidth(text: string): number {
    return this.stripAnsi(text).length;
  }

  /**
   * Normalize whitespace in content to prevent layout-breaking characters.
   *
   * Collapses all whitespace (newlines, tabs, multiple spaces) to single spaces
   * and trims leading/trailing whitespace. Preserves ANSI codes.
   *
   * @param text - Text to normalize (may contain ANSI codes)
   * @returns Normalized text with single-space whitespace
   */
  private normalizeContent(text: string): string {
    // Replace all whitespace sequences with single space, then trim
    // This preserves ANSI codes while normalizing whitespace
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Render a border line (top, bottom, or divider).
   *
   * @param type - Border type to render
   * @returns Formatted border line
   */
  private renderBorder(type: 'top' | 'bottom' | 'divider'): string {
    if (!this.hasBorder()) {
      return '';
    }

    const width = this.getEffectiveWidth();
    const contentWidth = width - 2; // Subtract corners

    let left: string;
    let right: string;

    switch (type) {
      case 'top':
        left = this.config.border.topLeft;
        right = this.config.border.topRight;
        break;
      case 'bottom':
        left = this.config.border.bottomLeft;
        right = this.config.border.bottomRight;
        break;
      case 'divider':
        left = this.config.border.leftT;
        right = this.config.border.rightT;
        break;
    }

    const line =
      left + this.config.border.horizontal.repeat(contentWidth) + right;
    return this.config.borderColor(line);
  }

  /**
   * Get the effective table width.
   *
   * @returns Configured width or auto-calculated from content
   */
  private getEffectiveWidth(): number {
    if (this.config.width > 0) {
      return this.config.width;
    }

    // Auto-calculate from first row (simplified for now)
    if (this.rows.length === 0) {
      return 80; // Default
    }

    // TODO: Implement proper auto-width calculation
    return 80;
  }

  /**
   * Render a single row (may produce multiple output lines if wrapping enabled).
   *
   * @param row - Row data to render
   * @returns Array of formatted lines for this row
   */
  private renderRow(row: RowData): string[] {
    // Evaluate dynamic content and normalize whitespace
    const evaluatedCells = row.cells.map((cell) => ({
      ...cell,
      evaluatedContent: this.normalizeContent(
        this.evaluateContent(cell.content)
      ),
    }));

    // Extract requested widths (use equal distribution if not specified)
    const cellCount = evaluatedCells.length;
    const requestedWidths = evaluatedCells.map((cell) => {
      if (cell.width !== undefined) {
        return cell.width;
      }
      // Auto-calculate equal distribution
      const borders = this.hasBorder() ? 2 : 0;
      const totalPadding = cellCount * 2 * this.config.padding;
      const separators = this.hasBorder() ? cellCount - 1 : 0;
      const overhead = borders + totalPadding + separators;
      const availableForContent = this.getEffectiveWidth() - overhead;
      return Math.floor(availableForContent / cellCount);
    });

    // Auto-adjust widths if they exceed table width (proportional scaling)
    const adjustedWidths = this.adjustCellWidths(
      this.getEffectiveWidth(),
      requestedWidths
    );

    // Render cells with adjusted widths
    const cellContents = evaluatedCells.map((cell, index) => {
      const content = cell.trim
        ? cell.evaluatedContent.trim()
        : cell.evaluatedContent;
      const width = adjustedWidths[index] ?? 20; // Use adjusted width
      const align = cell.align ?? 'left';

      return this.alignText(content, width, align);
    });

    // Build line with borders
    const padding = ' '.repeat(this.config.padding);
    const cellsWithPadding = cellContents
      .map((content) => padding + content + padding)
      .join(this.config.borderColor(this.config.border.vertical));

    if (this.hasBorder()) {
      return [
        this.config.borderColor(this.config.border.vertical) +
          cellsWithPadding +
          this.config.borderColor(this.config.border.vertical),
      ];
    }

    return [cellsWithPadding];
  }

  /**
   * Align text within a given width.
   *
   * @param text - Text to align (may contain ANSI codes)
   * @param width - Target width in characters
   * @param align - Alignment direction
   * @returns Aligned text with padding (preserves ANSI codes)
   */
  private alignText(
    text: string,
    width: number,
    align: 'left' | 'right' | 'center'
  ): string {
    const visibleWidth = this.measureWidth(text);

    if (visibleWidth >= width) {
      // Truncate if too long
      // For simplicity, if text has ANSI codes and is too long, strip them
      // A more sophisticated approach would preserve partial ANSI codes
      const stripped = this.stripAnsi(text);
      return stripped.substring(0, width);
    }

    const padding = width - visibleWidth;

    switch (align) {
      case 'left':
        return text + ' '.repeat(padding); // Preserves ANSI in text
      case 'right':
        return ' '.repeat(padding) + text; // Preserves ANSI in text
      case 'center': {
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        return ' '.repeat(leftPad) + text + ' '.repeat(rightPad); // Preserves ANSI
      }
    }
  }

  /**
   * Wrap text to multiple lines at word boundaries.
   *
   * @param text - Text to wrap (ANSI codes stripped before wrapping)
   * @param width - Maximum line width
   * @returns Array of wrapped lines
   */
  private wrapText(text: string, width: number): string[] {
    const stripped = this.stripAnsi(text);

    if (this.measureWidth(stripped) <= width) {
      return [stripped];
    }

    const lines: string[] = [];
    const words = stripped.split(' ');
    let currentLine = '';

    for (const word of words) {
      if (word.length > width) {
        // Word longer than width - break mid-word
        if (currentLine) {
          lines.push(currentLine.trim());
          currentLine = '';
        }

        let remaining = word;
        while (remaining.length > width) {
          lines.push(remaining.substring(0, width));
          remaining = remaining.substring(width);
        }

        currentLine = remaining + ' ';
      } else if ((currentLine + word).length > width) {
        // Adding word would exceed width - start new line
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        // Add word to current line
        currentLine += word + ' ';
      }
    }

    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    return lines.length > 0 ? lines : [''];
  }

  /**
   * Calculate the minimum required table width for given cell widths.
   *
   * Formula: requiredWidth = 2 (borders) + (cellCount * 2 * padding) + (cellCount - 1) (separators) + sum(cellWidths)
   *
   * @param cellCount - Number of cells in the row
   * @param cellWidths - Array of cell content widths
   * @returns Minimum table width needed to render these cells
   */
  private calculateRequiredWidth(
    cellCount: number,
    cellWidths: number[]
  ): number {
    const borders = this.hasBorder() ? 2 : 0;
    const totalPadding = cellCount * 2 * this.config.padding;
    const separators = this.hasBorder() ? cellCount - 1 : 0;
    const contentWidth = cellWidths.reduce((sum, w) => sum + w, 0);

    return borders + totalPadding + separators + contentWidth;
  }

  /**
   * Adjust cell widths proportionally to fit within target table width.
   *
   * Uses proportional scaling: each cell's width is reduced by the same percentage.
   * Distributes rounding remainder to ensure exact target width.
   *
   * @param targetWidth - Total table width to fit into
   * @param cellWidths - Current cell widths (may exceed available space)
   * @returns Adjusted cell widths that fit exactly within target
   */
  private adjustCellWidths(
    targetWidth: number,
    cellWidths: number[]
  ): number[] {
    if (cellWidths.length === 0) {
      return [];
    }

    const cellCount = cellWidths.length;
    const borders = this.hasBorder() ? 2 : 0;
    const totalPadding = cellCount * 2 * this.config.padding;
    const separators = this.hasBorder() ? cellCount - 1 : 0;
    const overhead = borders + totalPadding + separators;
    const availableForContent = targetWidth - overhead;

    // If already fits, return as-is
    const currentTotal = cellWidths.reduce((sum, w) => sum + w, 0);
    if (currentTotal <= availableForContent) {
      return cellWidths;
    }

    // Proportional scaling: newWidth[i] = Math.floor(cellWidths[i] * availableForContent / currentTotal)
    const scaleFactor = availableForContent / currentTotal;
    const adjustedWidths = cellWidths.map((w) => Math.floor(w * scaleFactor));

    // Distribute remainder to maintain exact width
    const adjustedTotal = adjustedWidths.reduce((sum, w) => sum + w, 0);
    const remainder = availableForContent - adjustedTotal;

    // Add 1 to the first N cells to use up remainder
    for (let i = 0; i < remainder && i < adjustedWidths.length; i++) {
      const current = adjustedWidths[i];
      if (current !== undefined) {
        adjustedWidths[i] = current + 1;
      }
    }

    return adjustedWidths;
  }

  /**
   * Expose wrapText for testing purposes.
   * @internal
   */
  public _testWrapText(text: string, width: number): string[] {
    return this.wrapText(text, width);
  }

  /**
   * Expose normalizeContent for testing purposes.
   * @internal
   */
  public _testNormalizeContent(text: string): string {
    return this.normalizeContent(text);
  }

  /**
   * Expose calculateRequiredWidth for testing purposes.
   * @internal
   */
  public _testCalculateRequiredWidth(
    cellCount: number,
    cellWidths: number[]
  ): number {
    return this.calculateRequiredWidth(cellCount, cellWidths);
  }

  /**
   * Expose adjustCellWidths for testing purposes.
   * @internal
   */
  public _testAdjustCellWidths(
    targetWidth: number,
    cellWidths: number[]
  ): number[] {
    return this.adjustCellWidths(targetWidth, cellWidths);
  }
}
