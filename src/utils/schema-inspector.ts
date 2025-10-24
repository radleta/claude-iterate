import { ZodTypeAny, ZodObject } from 'zod';

/**
 * Metadata extracted from a Zod schema field
 */
export interface SchemaField {
  /** Dot-notation key path (e.g., "claude.args") */
  key: string;

  /** Zod type name (string, number, boolean, array, object, enum) */
  type: string;

  /** Whether field is optional */
  optional: boolean;

  /** Default value (if defined) */
  default?: unknown;

  /** Valid values for enums */
  enumValues?: string[];

  /** Nested fields for objects */
  nested?: SchemaField[];

  /** Validation constraints */
  constraints?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

/**
 * Inspector for extracting metadata from Zod schemas
 */
export class SchemaInspector {
  /**
   * Inspect a Zod schema and extract all fields
   * @param schema - Zod object schema
   * @param prefix - Dot notation prefix for nested keys
   * @returns Flat array of all fields with full paths
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inspect(schema: ZodObject<any>, prefix = ''): SchemaField[] {
    const fields: SchemaField[] = [];
    const shape = this.getShape(schema);

    if (!shape) return fields;

    for (const [key, field] of Object.entries(shape)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const info = this.extractFieldInfo(field as ZodTypeAny);

      // For objects, recurse into nested fields
      if (info.type === 'object' && this.hasShape(field as ZodTypeAny)) {
        const unwrapped = this.unwrapModifiers(field as ZodTypeAny);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nested = this.inspect(unwrapped as ZodObject<any>, fullKey);
        fields.push({
          key: fullKey,
          ...info,
          nested: nested.length > 0 ? nested : undefined,
        });
        // Also add the nested fields to the flat array
        fields.push(...nested);
      } else {
        fields.push({ key: fullKey, ...info });
      }
    }

    return fields;
  }

  /**
   * Extract metadata from a single Zod field
   */
  private extractFieldInfo(field: ZodTypeAny): Omit<SchemaField, 'key'> {
    let optional = false;
    let defaultValue: unknown | undefined;

    // Check for optional and default modifiers
    let current = field;
    while (current._def) {
      const typeName = current._def.typeName;

      if (typeName === 'ZodOptional') {
        optional = true;
        current = current._def.innerType;
      } else if (typeName === 'ZodDefault') {
        const defaultFn = current._def.defaultValue;
        defaultValue =
          typeof defaultFn === 'function' ? defaultFn() : defaultFn;
        current = current._def.innerType;
      } else {
        break;
      }
    }

    return {
      type: this.getTypeName(current),
      optional,
      default: defaultValue,
      enumValues: this.getEnumValues(current),
      constraints: this.getConstraints(current),
    };
  }

  /**
   * Get type name from Zod definition
   */
  private getTypeName(field: ZodTypeAny): string {
    const typeName = field._def.typeName;

    switch (typeName) {
      case 'ZodString':
        return 'string';
      case 'ZodNumber':
        return 'number';
      case 'ZodBoolean':
        return 'boolean';
      case 'ZodArray':
        return 'array';
      case 'ZodObject':
        return 'object';
      case 'ZodEnum':
      case 'ZodNativeEnum':
        return 'enum';
      default:
        return typeName.replace('Zod', '').toLowerCase();
    }
  }

  /**
   * Extract enum values for enum types
   */
  private getEnumValues(field: ZodTypeAny): string[] | undefined {
    const typeName = field._def.typeName;

    if (typeName === 'ZodEnum') {
      return field._def.values as string[];
    }

    if (typeName === 'ZodNativeEnum') {
      const enumObj = field._def.values;
      // For native enums, extract the string values
      return Object.values(enumObj).filter(
        (v) => typeof v === 'string'
      ) as string[];
    }

    return undefined;
  }

  /**
   * Extract validation constraints
   */
  private getConstraints(
    field: ZodTypeAny
  ): SchemaField['constraints'] | undefined {
    const typeName = field._def.typeName;
    const checks = field._def.checks || [];

    if (typeName === 'ZodNumber') {
      const constraints: SchemaField['constraints'] = {};

      for (const check of checks) {
        if (check.kind === 'min') {
          constraints.min = check.value;
        } else if (check.kind === 'max') {
          constraints.max = check.value;
        }
      }

      return Object.keys(constraints).length > 0 ? constraints : undefined;
    }

    if (typeName === 'ZodString') {
      const constraints: SchemaField['constraints'] = {};

      for (const check of checks) {
        if (check.kind === 'min') {
          constraints.minLength = check.value;
        } else if (check.kind === 'max') {
          constraints.maxLength = check.value;
        } else if (check.kind === 'regex') {
          constraints.pattern = check.regex.source;
        }
      }

      return Object.keys(constraints).length > 0 ? constraints : undefined;
    }

    return undefined;
  }

  /**
   * Get shape from Zod object
   */
  private getShape(schema: ZodTypeAny): Record<string, ZodTypeAny> | null {
    // Direct shape property
    if ('shape' in schema && schema.shape) {
      return schema.shape as Record<string, ZodTypeAny>;
    }

    // Shape function
    if (schema._def?.shape) {
      const shape = schema._def.shape;
      return typeof shape === 'function' ? shape() : shape;
    }

    return null;
  }

  /**
   * Check if field has a shape (is an object)
   */
  private hasShape(field: ZodTypeAny): boolean {
    const unwrapped = this.unwrapModifiers(field);
    return this.getShape(unwrapped) !== null;
  }

  /**
   * Unwrap optional/default modifiers to get to the core type
   */
  private unwrapModifiers(field: ZodTypeAny): ZodTypeAny {
    let current = field;
    while (current._def) {
      const typeName = current._def.typeName;
      if (typeName === 'ZodOptional' || typeName === 'ZodDefault') {
        current = current._def.innerType;
      } else {
        break;
      }
    }
    return current;
  }
}
