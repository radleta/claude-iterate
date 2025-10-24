import { describe, it, expect } from 'vitest';
import {
  flattenConfig,
  getNestedValue,
} from '../../src/utils/config-value-flattener.js';

describe('flattenConfig', () => {
  it('flattens nested objects', () => {
    const input = {
      verification: {
        depth: 'standard',
        autoVerify: true,
      },
    };
    const expected = {
      'verification.depth': 'standard',
      'verification.autoVerify': true,
    };
    expect(flattenConfig(input)).toEqual(expected);
  });

  it('handles deeply nested objects', () => {
    const input = {
      notification: {
        statusWatch: {
          enabled: true,
          debounceMs: 2000,
        },
      },
    };
    const expected = {
      'notification.statusWatch.enabled': true,
      'notification.statusWatch.debounceMs': 2000,
    };
    expect(flattenConfig(input)).toEqual(expected);
  });

  it('handles flat objects', () => {
    const input = {
      defaultMaxIterations: 50,
      defaultDelay: 2,
    };
    expect(flattenConfig(input)).toEqual(input);
  });

  it('handles arrays as leaf values', () => {
    const input = {
      claude: {
        args: ['--foo', '--bar'],
      },
    };
    const expected = {
      'claude.args': ['--foo', '--bar'],
    };
    expect(flattenConfig(input)).toEqual(expected);
  });

  it('handles empty objects', () => {
    expect(flattenConfig({})).toEqual({});
  });

  it('handles null and undefined values', () => {
    const input = {
      foo: null,
      bar: undefined,
    };
    const expected = {
      foo: null,
      bar: undefined,
    };
    expect(flattenConfig(input)).toEqual(expected);
  });

  it('handles mixed types', () => {
    const input = {
      workspacesDir: './workspaces',
      defaultMaxIterations: 50,
      verification: {
        depth: 'standard',
        autoVerify: false,
      },
      notifyEvents: ['completion', 'error'],
    };
    const expected = {
      workspacesDir: './workspaces',
      defaultMaxIterations: 50,
      'verification.depth': 'standard',
      'verification.autoVerify': false,
      notifyEvents: ['completion', 'error'],
    };
    expect(flattenConfig(input)).toEqual(expected);
  });
});

describe('getNestedValue', () => {
  const obj = {
    workspacesDir: './workspaces',
    verification: {
      depth: 'standard',
      statusWatch: {
        enabled: true,
      },
    },
    claude: {
      args: ['--foo'],
    },
  };

  it('gets top-level values', () => {
    expect(getNestedValue(obj, 'workspacesDir')).toBe('./workspaces');
  });

  it('gets nested values', () => {
    expect(getNestedValue(obj, 'verification.depth')).toBe('standard');
  });

  it('gets deeply nested values', () => {
    expect(getNestedValue(obj, 'verification.statusWatch.enabled')).toBe(true);
  });

  it('returns undefined for non-existent paths', () => {
    expect(getNestedValue(obj, 'foo.bar.baz')).toBeUndefined();
  });

  it('returns undefined for partial paths', () => {
    expect(getNestedValue(obj, 'verification.nonexistent')).toBeUndefined();
  });

  it('handles array values', () => {
    expect(getNestedValue(obj, 'claude.args')).toEqual(['--foo']);
  });
});
