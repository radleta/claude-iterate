/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { SchemaInspector } from '../../src/utils/schema-inspector.js';

describe('SchemaInspector', () => {
  const inspector = new SchemaInspector();

  describe('basic types', () => {
    it('should extract string fields', () => {
      const schema = z.object({
        name: z.string(),
      });

      const fields = inspector.inspect(schema);

      expect(fields).toHaveLength(1);
      expect(fields[0]).toEqual({
        key: 'name',
        type: 'string',
        optional: false,
      });
    });

    it('should extract number fields', () => {
      const schema = z.object({
        count: z.number(),
      });

      const fields = inspector.inspect(schema);

      expect(fields).toHaveLength(1);
      expect(fields[0]).toEqual({
        key: 'count',
        type: 'number',
        optional: false,
      });
    });

    it('should extract boolean fields', () => {
      const schema = z.object({
        enabled: z.boolean(),
      });

      const fields = inspector.inspect(schema);

      expect(fields).toHaveLength(1);
      expect(fields[0]).toEqual({
        key: 'enabled',
        type: 'boolean',
        optional: false,
      });
    });

    it('should extract array fields', () => {
      const schema = z.object({
        items: z.array(z.string()),
      });

      const fields = inspector.inspect(schema);

      expect(fields).toHaveLength(1);
      expect(fields[0]).toEqual({
        key: 'items',
        type: 'array',
        optional: false,
      });
    });
  });

  describe('optional fields', () => {
    it('should detect optional fields', () => {
      const schema = z.object({
        optional: z.string().optional(),
      });

      const fields = inspector.inspect(schema);

      expect(fields).toHaveLength(1);
      expect(fields[0]!.optional).toBe(true);
    });

    it('should detect required fields', () => {
      const schema = z.object({
        required: z.string(),
      });

      const fields = inspector.inspect(schema);

      expect(fields).toHaveLength(1);
      expect(fields[0]!.optional).toBe(false);
    });
  });

  describe('default values', () => {
    it('should extract default values for strings', () => {
      const schema = z.object({
        name: z.string().default('test'),
      });

      const fields = inspector.inspect(schema);

      expect(fields).toHaveLength(1);
      expect(fields[0]!.default).toBe('test');
    });

    it('should extract default values for numbers', () => {
      const schema = z.object({
        count: z.number().default(42),
      });

      const fields = inspector.inspect(schema);

      expect(fields).toHaveLength(1);
      expect(fields[0]!.default).toBe(42);
    });

    it('should extract default values for booleans', () => {
      const schema = z.object({
        enabled: z.boolean().default(true),
      });

      const fields = inspector.inspect(schema);

      expect(fields).toHaveLength(1);
      expect(fields[0]!.default).toBe(true);
    });

    it('should extract default values for arrays', () => {
      const schema = z.object({
        items: z.array(z.string()).default([]),
      });

      const fields = inspector.inspect(schema);

      expect(fields).toHaveLength(1);
      expect(fields[0]!.default).toEqual([]);
    });
  });

  describe('enum types', () => {
    it('should extract enum values from ZodEnum', () => {
      const schema = z.object({
        level: z.enum(['low', 'medium', 'high']),
      });

      const fields = inspector.inspect(schema);

      expect(fields).toHaveLength(1);
      expect(fields[0]!.type).toBe('enum');
      expect(fields[0]!.enumValues).toEqual(['low', 'medium', 'high']);
    });

    it('should extract enum values from native enum', () => {
      enum MyEnum {
        A = 'a',
        B = 'b',
      }

      const schema = z.object({
        value: z.nativeEnum(MyEnum),
      });

      const fields = inspector.inspect(schema);

      expect(fields).toHaveLength(1);
      expect(fields[0]!.type).toBe('enum');
      expect(fields[0]!.enumValues).toEqual(['a', 'b']);
    });

    it('should extract default values for enums', () => {
      const schema = z.object({
        level: z.enum(['low', 'medium', 'high']).default('medium'),
      });

      const fields = inspector.inspect(schema);

      expect(fields).toHaveLength(1);
      expect(fields[0]!.default).toBe('medium');
      expect(fields[0]!.enumValues).toEqual(['low', 'medium', 'high']);
    });
  });

  describe('constraints', () => {
    it('should extract min constraint for numbers', () => {
      const schema = z.object({
        count: z.number().min(1),
      });

      const fields = inspector.inspect(schema);

      expect(fields).toHaveLength(1);
      expect(fields[0]!.constraints).toEqual({ min: 1 });
    });

    it('should extract max constraint for numbers', () => {
      const schema = z.object({
        count: z.number().max(100),
      });

      const fields = inspector.inspect(schema);

      expect(fields).toHaveLength(1);
      expect(fields[0]!.constraints).toEqual({ max: 100 });
    });

    it('should extract min and max constraints for numbers', () => {
      const schema = z.object({
        count: z.number().min(1).max(10),
      });

      const fields = inspector.inspect(schema);

      expect(fields).toHaveLength(1);
      expect(fields[0]!.constraints).toEqual({ min: 1, max: 10 });
    });

    it('should extract minLength for strings', () => {
      const schema = z.object({
        name: z.string().min(3),
      });

      const fields = inspector.inspect(schema);

      expect(fields).toHaveLength(1);
      expect(fields[0]!.constraints).toEqual({ minLength: 3 });
    });

    it('should extract maxLength for strings', () => {
      const schema = z.object({
        name: z.string().max(50),
      });

      const fields = inspector.inspect(schema);

      expect(fields).toHaveLength(1);
      expect(fields[0]!.constraints).toEqual({ maxLength: 50 });
    });
  });

  describe('nested objects', () => {
    it('should extract nested object fields', () => {
      const schema = z.object({
        config: z.object({
          enabled: z.boolean(),
          value: z.string(),
        }),
      });

      const fields = inspector.inspect(schema);

      // Should have 3 fields: config, config.enabled, config.value
      expect(fields).toHaveLength(3);

      const configField = fields.find((f) => f.key === 'config');
      expect(configField).toBeDefined();
      expect(configField?.type).toBe('object');
      expect(configField?.nested).toHaveLength(2);

      const enabledField = fields.find((f) => f.key === 'config.enabled');
      expect(enabledField).toEqual({
        key: 'config.enabled',
        type: 'boolean',
        optional: false,
      });

      const valueField = fields.find((f) => f.key === 'config.value');
      expect(valueField).toEqual({
        key: 'config.value',
        type: 'string',
        optional: false,
      });
    });

    it('should handle deeply nested objects', () => {
      const schema = z.object({
        level1: z.object({
          level2: z.object({
            level3: z.string(),
          }),
        }),
      });

      const fields = inspector.inspect(schema);

      // Should have: level1, level1.level2, level1.level2.level3
      expect(fields).toHaveLength(3);

      const level3Field = fields.find((f) => f.key === 'level1.level2.level3');
      expect(level3Field).toBeDefined();
      expect(level3Field?.type).toBe('string');
    });

    it('should handle optional nested objects', () => {
      const schema = z.object({
        config: z
          .object({
            value: z.string(),
          })
          .optional(),
      });

      const fields = inspector.inspect(schema);

      const configField = fields.find((f) => f.key === 'config');
      expect(configField).toBeDefined();
      expect(configField?.optional).toBe(true);
      expect(configField?.type).toBe('object');
    });

    it('should handle nested objects with defaults', () => {
      const schema = z.object({
        config: z
          .object({
            value: z.string().default('test'),
          })
          .default({ value: 'default' }),
      });

      const fields = inspector.inspect(schema);

      const configField = fields.find((f) => f.key === 'config');
      expect(configField).toBeDefined();
      expect(configField?.default).toEqual({ value: 'default' });

      const valueField = fields.find((f) => f.key === 'config.value');
      expect(valueField).toBeDefined();
      expect(valueField?.default).toBe('test');
    });
  });

  describe('complex schemas', () => {
    it('should handle mixed types', () => {
      const schema = z.object({
        name: z.string().default('test'),
        count: z.number().min(0).max(100).default(50),
        enabled: z.boolean().default(true),
        items: z.array(z.string()).default([]),
        level: z.enum(['low', 'high']).default('low'),
      });

      const fields = inspector.inspect(schema);

      expect(fields).toHaveLength(5);

      // Verify each field
      expect(fields.find((f) => f.key === 'name')).toMatchObject({
        type: 'string',
        default: 'test',
      });

      expect(fields.find((f) => f.key === 'count')).toMatchObject({
        type: 'number',
        default: 50,
        constraints: { min: 0, max: 100 },
      });

      expect(fields.find((f) => f.key === 'enabled')).toMatchObject({
        type: 'boolean',
        default: true,
      });

      expect(fields.find((f) => f.key === 'items')).toMatchObject({
        type: 'array',
        default: [],
      });

      expect(fields.find((f) => f.key === 'level')).toMatchObject({
        type: 'enum',
        default: 'low',
        enumValues: ['low', 'high'],
      });
    });
  });

  describe('real-world schemas', () => {
    it('should handle ProjectConfigSchema-like structure', () => {
      const schema = z.object({
        workspacesDir: z.string().default('./workspaces'),
        defaultMaxIterations: z.number().int().min(1).default(50),
        outputLevel: z
          .enum(['quiet', 'progress', 'verbose'])
          .default('progress'),
        claude: z
          .object({
            command: z.string().default('claude'),
            args: z.array(z.string()).default([]),
          })
          .optional(),
      });

      const fields = inspector.inspect(schema);

      // Should have: workspacesDir, defaultMaxIterations, outputLevel, claude, claude.command, claude.args
      expect(fields.length).toBeGreaterThanOrEqual(4);

      const workspacesDirField = fields.find((f) => f.key === 'workspacesDir');
      expect(workspacesDirField).toMatchObject({
        type: 'string',
        default: './workspaces',
      });

      const maxIterField = fields.find((f) => f.key === 'defaultMaxIterations');
      expect(maxIterField).toMatchObject({
        type: 'number',
        default: 50,
        constraints: { min: 1 },
      });

      const outputLevelField = fields.find((f) => f.key === 'outputLevel');
      expect(outputLevelField).toMatchObject({
        type: 'enum',
        default: 'progress',
        enumValues: ['quiet', 'progress', 'verbose'],
      });

      const claudeField = fields.find((f) => f.key === 'claude');
      expect(claudeField).toMatchObject({
        type: 'object',
        optional: true,
      });

      const claudeCommandField = fields.find((f) => f.key === 'claude.command');
      expect(claudeCommandField).toMatchObject({
        type: 'string',
        default: 'claude',
      });

      const claudeArgsField = fields.find((f) => f.key === 'claude.args');
      expect(claudeArgsField).toMatchObject({
        type: 'array',
        default: [],
      });
    });
  });
});
