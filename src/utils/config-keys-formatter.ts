import chalk from 'chalk';
import { Logger } from './logger.js';
import { SchemaField } from './schema-inspector.js';

/**
 * Config key with schema info and description
 */
export interface ConfigKey extends SchemaField {
  /** Description from description map */
  description?: string;

  /** Example value */
  example?: string;

  /** Additional notes */
  notes?: string;

  /** Related keys */
  relatedKeys?: string[];

  /** Category for grouping */
  category?: string;

  /** Current effective value and source */
  current?: {
    value: unknown;
    source: 'default' | 'user' | 'project' | 'workspace';
  };
}

/**
 * Formatter for displaying configuration keys
 */
export class ConfigKeysFormatter {
  constructor(private logger: Logger) {}

  /**
   * Display config keys in table format
   */
  displayKeys(
    keys: ConfigKey[],
    scope: 'project' | 'user' | 'workspace'
  ): void {
    this.logger.info(`Configuration Keys (${scope})`);
    this.logger.log('');

    // Add note for workspace scope
    if (scope === 'workspace') {
      this.logger.log(
        'Note: Workspace config provides overrides for project/user defaults.'
      );
      this.logger.log('Priority: Workspace > Project > User > Defaults');
      this.logger.log('');
    }

    // Group by category
    const grouped = this.groupByCategory(keys);

    // Display each category
    for (const [category, categoryKeys] of grouped) {
      const title = category.charAt(0).toUpperCase() + category.slice(1);
      this.logger.log(chalk.bold(title + ':'));

      for (const key of categoryKeys) {
        // Only show non-nested fields (nested fields are shown as part of parent)
        if (!key.key.includes('.') || key.nested) {
          this.formatKey(key, 0);
        }
      }

      this.logger.log('');
    }

    // Footer with usage hints
    this.logger.log('Usage:');
    if (scope === 'workspace') {
      this.logger.log(
        '  Get:    claude-iterate config --workspace <name> <key>'
      );
      this.logger.log(
        '  Set:    claude-iterate config --workspace <name> <key> <value>'
      );
      this.logger.log(
        '  Unset:  claude-iterate config --workspace <name> <key> --unset'
      );
      this.logger.log(
        '  Keys:   claude-iterate config --workspace <name> --keys'
      );
    } else if (scope === 'user') {
      this.logger.log('  Get:    claude-iterate config --global <key>');
      this.logger.log('  Set:    claude-iterate config --global <key> <value>');
      this.logger.log('  Unset:  claude-iterate config --global <key> --unset');
      this.logger.log('  Keys:   claude-iterate config --global --keys');
    } else {
      this.logger.log('  Get:    claude-iterate config <key>');
      this.logger.log('  Set:    claude-iterate config <key> <value>');
      this.logger.log('  Unset:  claude-iterate config <key> --unset');
      this.logger.log('  Keys:   claude-iterate config --keys');
    }
  }

  /**
   * Format keys as JSON
   */
  toJSON(keys: ConfigKey[], scope: string): string {
    // Map keys to include current value if present
    const mappedKeys = keys.map((key) => {
      const result: Record<string, unknown> = {
        key: key.key,
        type: key.type,
        default: key.default,
      };

      // Include optional fields from SchemaField
      if (key.optional !== undefined) {
        result.optional = key.optional;
      }

      if (key.nested) {
        result.nested = key.nested;
      }

      if (key.description) {
        result.description = key.description;
      }

      if (key.example) {
        result.example = key.example;
      }

      if (key.notes) {
        result.notes = key.notes;
      }

      if (key.relatedKeys) {
        result.relatedKeys = key.relatedKeys;
      }

      if (key.category) {
        result.category = key.category;
      }

      if (key.enumValues) {
        result.enumValues = key.enumValues;
      }

      if (key.constraints) {
        result.constraints = key.constraints;
      }

      // Add current value if present
      if (key.current) {
        result.current = {
          value: key.current.value,
          source: key.current.source,
        };
      }

      return result;
    });

    return JSON.stringify({ scope, keys: mappedKeys }, null, 2);
  }

  /**
   * Group keys by category
   */
  private groupByCategory(keys: ConfigKey[]): Map<string, ConfigKey[]> {
    const grouped = new Map<string, ConfigKey[]>();

    for (const key of keys) {
      const category = key.category || 'other';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      grouped.get(category)!.push(key);
    }

    // Sort categories
    const sortedCategories = Array.from(grouped.keys()).sort((a, b) => {
      const order = [
        'paths',
        'execution',
        'output',
        'display',
        'notifications',
        'claude',
        'verification',
        'other',
      ];
      const aIndex = order.indexOf(a);
      const bIndex = order.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    const result = new Map<string, ConfigKey[]>();
    for (const category of sortedCategories) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result.set(category, grouped.get(category)!);
    }

    return result;
  }

  /**
   * Format a single key for table display
   */
  private formatKey(key: ConfigKey, indent: number): void {
    const prefix = '  '.repeat(indent);

    // Key name and type
    const keyDisplay = chalk.cyan(key.key.padEnd(30));
    const typeDisplay = chalk.dim(key.type.padEnd(8));
    const defaultDisplay = this.formatDefault(key.default);

    // Build first line with current value if present and not default
    let firstLine = `${prefix}${keyDisplay} ${typeDisplay} ${defaultDisplay}`;

    if (key.current && key.current.source !== 'default') {
      const currentDisplay = this.formatCurrentValue(key.current);
      firstLine += `  ${currentDisplay}`;
    }

    this.logger.log(firstLine);

    // Description
    if (key.description) {
      this.logger.log(`${prefix}  ${chalk.dim(key.description)}`);
    }

    // Example
    if (key.example) {
      this.logger.log(`${prefix}  ${chalk.dim('Example:')} ${key.example}`);
    }

    // Enum values
    if (key.enumValues && key.enumValues.length > 0) {
      const values = key.enumValues.join(', ');
      this.logger.log(`${prefix}  ${chalk.dim('Values:')} ${values}`);
    }

    // Constraints
    if (key.constraints) {
      const constraintStr = this.formatConstraints(key.constraints);
      if (constraintStr) {
        this.logger.log(`${prefix}  ${chalk.dim('Range:')} ${constraintStr}`);
      }
    }

    // Notes
    if (key.notes) {
      this.logger.log(`${prefix}  ${chalk.yellow(key.notes)}`);
    }

    // Related keys
    if (key.relatedKeys && key.relatedKeys.length > 0) {
      const related = key.relatedKeys.join(', ');
      this.logger.log(`${prefix}  ${chalk.dim('Related:')} ${related}`);
    }

    // Nested fields (for objects) - show them indented
    if (key.nested && key.nested.length > 0) {
      for (const nested of key.nested) {
        this.formatKey(nested as ConfigKey, indent + 1);
      }
    }
  }

  /**
   * Format default value for display
   */
  private formatDefault(value: unknown): string {
    if (value === undefined) {
      return chalk.dim('(not set)');
    }

    if (value === null) {
      return chalk.dim('null');
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '[]';
      }
      return JSON.stringify(value);
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Format constraints for display
   */
  private formatConstraints(constraints: SchemaField['constraints']): string {
    if (!constraints) return '';

    const parts: string[] = [];

    if (constraints.min !== undefined && constraints.max !== undefined) {
      parts.push(`${constraints.min}-${constraints.max}`);
    } else if (constraints.min !== undefined) {
      parts.push(`≥${constraints.min}`);
    } else if (constraints.max !== undefined) {
      parts.push(`≤${constraints.max}`);
    }

    if (
      constraints.minLength !== undefined &&
      constraints.maxLength !== undefined
    ) {
      parts.push(`${constraints.minLength}-${constraints.maxLength} chars`);
    } else if (constraints.minLength !== undefined) {
      parts.push(`≥${constraints.minLength} chars`);
    } else if (constraints.maxLength !== undefined) {
      parts.push(`≤${constraints.maxLength} chars`);
    }

    return parts.join(', ');
  }

  /**
   * Format current value for display
   */
  private formatCurrentValue(current: {
    value: unknown;
    source: 'default' | 'user' | 'project' | 'workspace';
  }): string {
    const { value, source } = current;

    // Format the value for display
    let displayValue: string;
    if (Array.isArray(value)) {
      // Format arrays compactly
      displayValue =
        value.length <= 3 ? JSON.stringify(value) : `[Array(${value.length})]`;
    } else if (typeof value === 'object' && value !== null) {
      // Don't show objects (too complex)
      displayValue = '[Object]';
    } else {
      displayValue = String(value);
    }

    // Color code by source
    let colorFn: (text: string) => string;
    switch (source) {
      case 'user':
        colorFn = chalk.yellow;
        break;
      case 'project':
        colorFn = chalk.cyan;
        break;
      case 'workspace':
        colorFn = chalk.magenta;
        break;
      default:
        colorFn = (text: string) => text;
    }

    return colorFn(`# Current: ${displayValue} (${source})`);
  }
}
