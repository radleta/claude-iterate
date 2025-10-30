/**
 * Layout calculation utilities for TextTable
 *
 * Provides pure functions for calculating table layout overhead and available width,
 * extracted from the main TextTable implementation for testability and reusability.
 */

/**
 * Calculate the total overhead (non-content space) for a table
 *
 * Formula: borders + (cellCount × 2 × padding) + (cellCount - 1) separators
 *
 * @param cellCount - Number of columns in the table
 * @param padding - Padding value on each side of cell content
 * @param hasBorder - Whether the table has borders
 * @returns Total overhead in characters
 *
 * @example
 * // For a 2-column table with borders and padding=1:
 * calculateOverhead(2, 1, true)  // Returns 8
 * // Breakdown: 2 (borders) + 4 (2 cells × 2 sides × 1 padding) + 1 (separator) = 7
 *
 * @example
 * // For a 1-column table with borders and padding=1:
 * calculateOverhead(1, 1, true)  // Returns 4
 * // Breakdown: 2 (borders) + 2 (1 cell × 2 sides × 1 padding) + 0 (separators) = 4
 */
export function calculateOverhead(
  cellCount: number,
  padding: number,
  hasBorder: boolean
): number {
  const borders = hasBorder ? 2 : 0;
  const totalPadding = cellCount * 2 * padding;
  const separators = hasBorder ? Math.max(0, cellCount - 1) : 0;
  return borders + totalPadding + separators;
}

/**
 * Calculate the available width for cell content after accounting for overhead
 *
 * @param totalWidth - Total table width in characters
 * @param overhead - Overhead calculated by calculateOverhead()
 * @returns Available width for content in characters (minimum 0)
 *
 * @example
 * // For a 78-character table with 8 characters overhead:
 * calculateAvailableWidth(78, 8)  // Returns 70
 *
 * @example
 * // Edge case: overhead exceeds total width
 * calculateAvailableWidth(10, 15)  // Returns 0 (not negative)
 */
export function calculateAvailableWidth(
  totalWidth: number,
  overhead: number
): number {
  const available = totalWidth - overhead;
  return Math.max(0, available);
}
