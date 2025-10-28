/**
 * Box drawing character set interface
 * Supports both Unicode and ASCII fallback characters
 */
export interface BoxChars {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
  leftT: string; // T-junction for separators (├ or +)
  rightT: string; // T-junction for separators (┤ or +)
}

/**
 * Get box drawing characters based on platform
 * Modern terminals: Unicode box-drawing characters
 * Legacy Windows: ASCII fallback
 *
 * @returns BoxChars object with appropriate character set
 *
 * @example
 * const box = getBoxCharacters();
 * console.log(box.topLeft + box.horizontal + box.topRight); // ┌─┐ or +-+
 */
export function getBoxCharacters(): BoxChars {
  const platform = process.platform;
  const isWindowsLegacy = platform === 'win32' && !process.env.WT_SESSION;

  if (isWindowsLegacy) {
    // Fallback for older Windows console
    return {
      topLeft: '+',
      topRight: '+',
      bottomLeft: '+',
      bottomRight: '+',
      horizontal: '-',
      vertical: '|',
      leftT: '+',
      rightT: '+',
    };
  }

  // Modern terminals (including Windows Terminal)
  return {
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
