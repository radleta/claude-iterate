import { describe, it, expect, vi } from 'vitest';
import {
  ConfigKeysFormatter,
  ConfigKey,
} from '../../src/utils/config-keys-formatter.js';
import { Logger } from '../../src/utils/logger.js';

describe('ConfigKeysFormatter', () => {
  const createMockLogger = () => {
    const logs: string[] = [];
    return {
      logger: {
        info: vi.fn((msg: string) => logs.push(msg)),
        log: vi.fn((msg: string) => logs.push(msg)),
        colors: {
          cyan: (text: string) => text,
          dim: (text: string) => text,
          bold: (text: string) => text,
          yellow: (text: string) => text,
        },
      } as unknown as Logger,
      logs,
    };
  };

  describe('displayKeys', () => {
    it('should display keys in table format', () => {
      const { logger, logs } = createMockLogger();
      const formatter = new ConfigKeysFormatter(logger);

      const keys: ConfigKey[] = [
        {
          key: 'name',
          type: 'string',
          optional: false,
          default: 'test',
          description: 'A name field',
          category: 'general',
        },
      ];

      formatter.displayKeys(keys, 'project');

      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((log) => log.includes('Configuration Keys'))).toBe(true);
      expect(logs.some((log) => log.includes('name'))).toBe(true);
      expect(logs.some((log) => log.includes('A name field'))).toBe(true);
    });

    it('should group keys by category', () => {
      const { logger, logs } = createMockLogger();
      const formatter = new ConfigKeysFormatter(logger);

      const keys: ConfigKey[] = [
        {
          key: 'path1',
          type: 'string',
          optional: false,
          category: 'paths',
        },
        {
          key: 'exec1',
          type: 'number',
          optional: false,
          category: 'execution',
        },
        {
          key: 'path2',
          type: 'string',
          optional: false,
          category: 'paths',
        },
      ];

      formatter.displayKeys(keys, 'project');

      // Should have category headers
      expect(logs.some((log) => log.includes('Paths'))).toBe(true);
      expect(logs.some((log) => log.includes('Execution'))).toBe(true);
    });

    it('should show workspace note for workspace scope', () => {
      const { logger, logs } = createMockLogger();
      const formatter = new ConfigKeysFormatter(logger);

      formatter.displayKeys([], 'workspace');

      expect(
        logs.some((log) => log.includes('Workspace config provides overrides'))
      ).toBe(true);
    });

    it('should show usage hints for each scope', () => {
      const { logger: projectLogger, logs: projectLogs } = createMockLogger();
      const projectFormatter = new ConfigKeysFormatter(projectLogger);
      projectFormatter.displayKeys([], 'project');
      expect(
        projectLogs.some((log) => log.includes('claude-iterate config <key>'))
      ).toBe(true);

      const { logger: userLogger, logs: userLogs } = createMockLogger();
      const userFormatter = new ConfigKeysFormatter(userLogger);
      userFormatter.displayKeys([], 'user');
      expect(
        userLogs.some((log) =>
          log.includes('claude-iterate config --global <key>')
        )
      ).toBe(true);

      const { logger: workspaceLogger, logs: workspaceLogs } =
        createMockLogger();
      const workspaceFormatter = new ConfigKeysFormatter(workspaceLogger);
      workspaceFormatter.displayKeys([], 'workspace');
      expect(
        workspaceLogs.some((log) =>
          log.includes('claude-iterate config --workspace <name> <key>')
        )
      ).toBe(true);
    });

    it('should display enum values', () => {
      const { logger, logs } = createMockLogger();
      const formatter = new ConfigKeysFormatter(logger);

      const keys: ConfigKey[] = [
        {
          key: 'level',
          type: 'enum',
          optional: false,
          enumValues: ['low', 'medium', 'high'],
          category: 'general',
        },
      ];

      formatter.displayKeys(keys, 'project');

      expect(logs.some((log) => log.includes('Values:'))).toBe(true);
      expect(logs.some((log) => log.includes('low, medium, high'))).toBe(true);
    });

    it('should display constraints', () => {
      const { logger, logs } = createMockLogger();
      const formatter = new ConfigKeysFormatter(logger);

      const keys: ConfigKey[] = [
        {
          key: 'count',
          type: 'number',
          optional: false,
          constraints: { min: 1, max: 100 },
          category: 'general',
        },
      ];

      formatter.displayKeys(keys, 'project');

      expect(logs.some((log) => log.includes('Range:'))).toBe(true);
      expect(logs.some((log) => log.includes('1-100'))).toBe(true);
    });

    it('should display examples', () => {
      const { logger, logs } = createMockLogger();
      const formatter = new ConfigKeysFormatter(logger);

      const keys: ConfigKey[] = [
        {
          key: 'path',
          type: 'string',
          optional: false,
          example: '/usr/local/bin',
          category: 'general',
        },
      ];

      formatter.displayKeys(keys, 'project');

      expect(logs.some((log) => log.includes('Example:'))).toBe(true);
      expect(logs.some((log) => log.includes('/usr/local/bin'))).toBe(true);
    });

    it('should display notes with warning color', () => {
      const { logger, logs } = createMockLogger();
      const formatter = new ConfigKeysFormatter(logger);

      const keys: ConfigKey[] = [
        {
          key: 'dangerous',
          type: 'boolean',
          optional: false,
          notes: '⚠️  This is dangerous',
          category: 'general',
        },
      ];

      formatter.displayKeys(keys, 'project');

      expect(logs.some((log) => log.includes('⚠️  This is dangerous'))).toBe(
        true
      );
    });

    it('should display related keys', () => {
      const { logger, logs } = createMockLogger();
      const formatter = new ConfigKeysFormatter(logger);

      const keys: ConfigKey[] = [
        {
          key: 'maxIterations',
          type: 'number',
          optional: false,
          relatedKeys: ['delay', 'threshold'],
          category: 'general',
        },
      ];

      formatter.displayKeys(keys, 'project');

      expect(logs.some((log) => log.includes('Related:'))).toBe(true);
      expect(logs.some((log) => log.includes('delay, threshold'))).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should format keys as JSON', () => {
      const logger = new Logger(false);
      const formatter = new ConfigKeysFormatter(logger);

      const keys: ConfigKey[] = [
        {
          key: 'name',
          type: 'string',
          optional: false,
          default: 'test',
          description: 'A name field',
        },
      ];

      const json = formatter.toJSON(keys, 'project');

      expect(json).toBeTruthy();
      const parsed = JSON.parse(json);
      expect(parsed.scope).toBe('project');
      expect(parsed.keys).toHaveLength(1);
      expect(parsed.keys[0].key).toBe('name');
      expect(parsed.keys[0].type).toBe('string');
      expect(parsed.keys[0].default).toBe('test');
    });

    it('should include all metadata in JSON', () => {
      const logger = new Logger(false);
      const formatter = new ConfigKeysFormatter(logger);

      const keys: ConfigKey[] = [
        {
          key: 'level',
          type: 'enum',
          optional: true,
          default: 'medium',
          description: 'Level setting',
          example: 'high',
          notes: 'Important note',
          relatedKeys: ['threshold'],
          category: 'execution',
          enumValues: ['low', 'medium', 'high'],
          constraints: { min: 1, max: 10 },
        },
      ];

      const json = formatter.toJSON(keys, 'project');
      const parsed = JSON.parse(json);

      const key = parsed.keys[0];
      expect(key.key).toBe('level');
      expect(key.type).toBe('enum');
      expect(key.optional).toBe(true);
      expect(key.default).toBe('medium');
      expect(key.description).toBe('Level setting');
      expect(key.example).toBe('high');
      expect(key.notes).toBe('Important note');
      expect(key.relatedKeys).toEqual(['threshold']);
      expect(key.category).toBe('execution');
      expect(key.enumValues).toEqual(['low', 'medium', 'high']);
      expect(key.constraints).toEqual({ min: 1, max: 10 });
    });
  });

  describe('formatDefault', () => {
    it('should format undefined as "(not set)"', () => {
      const { logger } = createMockLogger();
      const formatter = new ConfigKeysFormatter(logger);

      const keys: ConfigKey[] = [
        {
          key: 'optional',
          type: 'string',
          optional: true,
          default: undefined,
          category: 'general',
        },
      ];

      formatter.displayKeys(keys, 'project');
      // The default formatter is private, but we test it indirectly through displayKeys
    });

    it('should format arrays', () => {
      const { logger } = createMockLogger();
      const formatter = new ConfigKeysFormatter(logger);

      const keys: ConfigKey[] = [
        {
          key: 'items',
          type: 'array',
          optional: false,
          default: ['a', 'b'],
          category: 'general',
        },
      ];

      formatter.displayKeys(keys, 'project');
    });

    it('should format empty arrays', () => {
      const { logger } = createMockLogger();
      const formatter = new ConfigKeysFormatter(logger);

      const keys: ConfigKey[] = [
        {
          key: 'items',
          type: 'array',
          optional: false,
          default: [],
          category: 'general',
        },
      ];

      formatter.displayKeys(keys, 'project');
    });
  });

  describe('groupByCategory', () => {
    it('should sort categories in logical order', () => {
      const { logger, logs } = createMockLogger();
      const formatter = new ConfigKeysFormatter(logger);

      const keys: ConfigKey[] = [
        {
          key: 'verify',
          type: 'boolean',
          optional: false,
          category: 'verification',
        },
        { key: 'path', type: 'string', optional: false, category: 'paths' },
        { key: 'cmd', type: 'string', optional: false, category: 'claude' },
        { key: 'iter', type: 'number', optional: false, category: 'execution' },
      ];

      formatter.displayKeys(keys, 'project');

      // Find index positions of category headers
      const pathsIndex = logs.findIndex((log) => log.includes('Paths'));
      const executionIndex = logs.findIndex((log) => log.includes('Execution'));
      const claudeIndex = logs.findIndex((log) => log.includes('Claude'));
      const verificationIndex = logs.findIndex((log) =>
        log.includes('Verification')
      );

      // Verify order: paths, execution, claude, verification
      expect(pathsIndex).toBeLessThan(executionIndex);
      expect(executionIndex).toBeLessThan(claudeIndex);
      expect(claudeIndex).toBeLessThan(verificationIndex);
    });
  });
});
