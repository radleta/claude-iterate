/**
 * Border style configuration for text tables and console output.
 * Provides lazy singletons for common border styles.
 */

/**
 * Border style configuration using box-drawing characters.
 * Used for rendering table borders with corners, lines, and junctions.
 */
export interface BorderStyle {
  /** Top-left corner character */
  topLeft: string;
  /** Top-right corner character */
  topRight: string;
  /** Bottom-left corner character */
  bottomLeft: string;
  /** Bottom-right corner character */
  bottomRight: string;
  /** Horizontal line character */
  horizontal: string;
  /** Vertical line character */
  vertical: string;
  /** Left T-junction character (for dividers) */
  leftT: string;
  /** Right T-junction character (for dividers) */
  rightT: string;
}

/**
 * Lazy singleton cache for border styles.
 * Initialized on first access to avoid unnecessary computation.
 */
let noneCache: BorderStyle | null = null;
let lineCache: BorderStyle | null = null;

/**
 * Get the "None" border style (no borders - all empty strings).
 * Uses lazy initialization for efficient memory usage.
 *
 * @returns BorderStyle with all empty strings
 *
 * @example
 * ```typescript
 * const table = new TextTable({ border: getNone() });
 * // Table renders without any borders
 * ```
 */
export function getNone(): BorderStyle {
  if (!noneCache) {
    noneCache = {
      topLeft: '',
      topRight: '',
      bottomLeft: '',
      bottomRight: '',
      horizontal: '',
      vertical: '',
      leftT: '',
      rightT: '',
    };
  }
  return noneCache;
}

/**
 * Get the "Line" border style (box-drawing characters).
 * Platform-aware: uses Unicode box-drawing on modern terminals,
 * ASCII fallback on legacy Windows console.
 * Uses lazy initialization for efficient memory usage.
 *
 * @returns BorderStyle with appropriate box-drawing characters
 *
 * @example
 * ```typescript
 * const table = new TextTable({ border: getLine() });
 * // Modern terminal: ┌─┐
 * //                  │ │
 * //                  └─┘
 * // Legacy Windows:  +-+
 * //                  | |
 * //                  +-+
 * ```
 */
export function getLine(): BorderStyle {
  if (!lineCache) {
    const platform = process.platform;
    const isWindowsLegacy = platform === 'win32' && !process.env.WT_SESSION;

    if (isWindowsLegacy) {
      // Fallback for older Windows console
      lineCache = {
        topLeft: '+',
        topRight: '+',
        bottomLeft: '+',
        bottomRight: '+',
        horizontal: '-',
        vertical: '|',
        leftT: '+',
        rightT: '+',
      };
    } else {
      // Modern terminals (including Windows Terminal)
      lineCache = {
        topLeft: '┌',
        topRight: '┐',
        bottomLeft: '└',
        bottomRight: '┘',
        horizontal: '─',
        vertical: '│',
        leftT: '├',
        rightT: '┤',
      };
    }
  }
  return lineCache;
}

/**
 * Reset singleton caches (primarily for testing).
 * @internal
 */
export function _resetCache(): void {
  noneCache = null;
  lineCache = null;
}
