/**
 * Flattens a nested configuration object to dot notation.
 *
 * Example:
 *   Input:  { verification: { depth: 'standard', autoVerify: true } }
 *   Output: { 'verification.depth': 'standard', 'verification.autoVerify': true }
 *
 * @param obj - The object to flatten
 * @param prefix - Internal: current key path prefix
 * @returns Flattened object with dot notation keys
 */
export function flattenConfig(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively flatten nested objects
      Object.assign(
        result,
        flattenConfig(value as Record<string, unknown>, newKey)
      );
    } else {
      // Leaf value - add to result
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Gets a nested value from an object using dot notation path.
 *
 * Example:
 *   Input:  obj = { verification: { depth: 'standard' } }, path = 'verification.depth'
 *   Output: 'standard'
 *
 * @param obj - The object to get value from
 * @param path - Dot notation path (e.g., 'verification.depth')
 * @returns The value at the path, or undefined if not found
 */
export function getNestedValue(
  obj: Record<string, unknown>,
  path: string
): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}
