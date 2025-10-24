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
        '  List:   claude-iterate config --workspace <name> --list'
      );
    } else if (scope === 'user') {
      this.logger.log('  Get:    claude-iterate config --global <key>');
      this.logger.log('  Set:    claude-iterate config --global <key> <value>');
      this.logger.log('  Unset:  claude-iterate config --global <key> --unset');
      this.logger.log('  List:   claude-iterate config --global --list');
    } else {
      this.logger.log('  Get:    claude-iterate config <key>');
      this.logger.log('  Set:    claude-iterate config <key> <value>');
      this.logger.log('  Unset:  claude-iterate config <key> --unset');
      this.logger.log('  List:   claude-iterate config --list');
    }
  }

  /**
   * Format keys as JSON
   */
  toJSON(keys: ConfigKey[], scope: string): string {
    return JSON.stringify({ scope, keys }, null, 2);
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

    this.logger.log(`${prefix}${keyDisplay} ${typeDisplay} ${defaultDisplay}`);

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
}
