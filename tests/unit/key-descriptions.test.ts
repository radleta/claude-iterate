import { describe, it, expect } from 'vitest';
import {
  PROJECT_CONFIG_DESCRIPTIONS,
  USER_CONFIG_DESCRIPTIONS,
  WORKSPACE_CONFIG_DESCRIPTIONS,
  getDescriptions,
} from '../../src/config/key-descriptions.js';
import {
  ProjectConfigSchema,
  UserConfigSchema,
} from '../../src/types/config.js';
import { WorkspaceConfigSchema } from '../../src/types/metadata.js';
import { SchemaInspector } from '../../src/utils/schema-inspector.js';

describe('Key Descriptions', () => {
  const inspector = new SchemaInspector();

  describe('Project Config Descriptions', () => {
    it('should have descriptions for all schema keys', () => {
      const fields = inspector.inspect(ProjectConfigSchema);
      const schemaKeys = fields.map((f) => f.key);
      const descriptionKeys = Object.keys(PROJECT_CONFIG_DESCRIPTIONS);

      const missing = schemaKeys.filter((k) => !descriptionKeys.includes(k));

      expect(
        missing,
        `Missing descriptions for project config keys: ${missing.join(', ')}`
      ).toEqual([]);
    });

    it('should not have orphaned descriptions', () => {
      const fields = inspector.inspect(ProjectConfigSchema);
      const schemaKeys = fields.map((f) => f.key);
      const descriptionKeys = Object.keys(PROJECT_CONFIG_DESCRIPTIONS);

      const orphaned = descriptionKeys.filter((k) => !schemaKeys.includes(k));

      expect(
        orphaned,
        `Orphaned descriptions for project config (not in schema): ${orphaned.join(', ')}`
      ).toEqual([]);
    });

    it('should have non-empty descriptions', () => {
      for (const [key, desc] of Object.entries(PROJECT_CONFIG_DESCRIPTIONS)) {
        expect(
          desc.description,
          `Description for ${key} should not be empty`
        ).toBeTruthy();
        expect(
          desc.description.length,
          `Description for ${key} should have meaningful content`
        ).toBeGreaterThan(10);
      }
    });

    it('should have valid categories', () => {
      const validCategories = [
        'paths',
        'execution',
        'notifications',
        'claude',
        'verification',
      ];

      for (const [key, desc] of Object.entries(PROJECT_CONFIG_DESCRIPTIONS)) {
        if (desc.category) {
          expect(
            validCategories,
            `Invalid category for ${key}: ${desc.category}`
          ).toContain(desc.category);
        }
      }
    });
  });

  describe('User Config Descriptions', () => {
    it('should have descriptions for all schema keys', () => {
      const fields = inspector.inspect(UserConfigSchema);
      const schemaKeys = fields.map((f) => f.key);
      const descriptionKeys = Object.keys(USER_CONFIG_DESCRIPTIONS);

      const missing = schemaKeys.filter((k) => !descriptionKeys.includes(k));

      expect(
        missing,
        `Missing descriptions for user config keys: ${missing.join(', ')}`
      ).toEqual([]);
    });

    it('should not have orphaned descriptions', () => {
      const fields = inspector.inspect(UserConfigSchema);
      const schemaKeys = fields.map((f) => f.key);
      const descriptionKeys = Object.keys(USER_CONFIG_DESCRIPTIONS);

      const orphaned = descriptionKeys.filter((k) => !schemaKeys.includes(k));

      expect(
        orphaned,
        `Orphaned descriptions for user config (not in schema): ${orphaned.join(', ')}`
      ).toEqual([]);
    });

    it('should have non-empty descriptions', () => {
      for (const [key, desc] of Object.entries(USER_CONFIG_DESCRIPTIONS)) {
        expect(
          desc.description,
          `Description for ${key} should not be empty`
        ).toBeTruthy();
        expect(
          desc.description.length,
          `Description for ${key} should have meaningful content`
        ).toBeGreaterThan(10);
      }
    });
  });

  describe('Workspace Config Descriptions', () => {
    it('should have descriptions for all schema keys', () => {
      // WorkspaceConfigSchema is optional, so unwrap it first
      const schema = WorkspaceConfigSchema._def.innerType;
      const fields = inspector.inspect(schema);
      const schemaKeys = fields.map((f) => f.key);
      const descriptionKeys = Object.keys(WORKSPACE_CONFIG_DESCRIPTIONS);

      const missing = schemaKeys.filter((k) => !descriptionKeys.includes(k));

      expect(
        missing,
        `Missing descriptions for workspace config keys: ${missing.join(', ')}`
      ).toEqual([]);
    });

    it('should not have orphaned descriptions', () => {
      const schema = WorkspaceConfigSchema._def.innerType;
      const fields = inspector.inspect(schema);
      const schemaKeys = fields.map((f) => f.key);
      const descriptionKeys = Object.keys(WORKSPACE_CONFIG_DESCRIPTIONS);

      const orphaned = descriptionKeys.filter((k) => !schemaKeys.includes(k));

      expect(
        orphaned,
        `Orphaned descriptions for workspace config (not in schema): ${orphaned.join(', ')}`
      ).toEqual([]);
    });

    it('should have non-empty descriptions', () => {
      for (const [key, desc] of Object.entries(WORKSPACE_CONFIG_DESCRIPTIONS)) {
        expect(
          desc.description,
          `Description for ${key} should not be empty`
        ).toBeTruthy();
        expect(
          desc.description.length,
          `Description for ${key} should have meaningful content`
        ).toBeGreaterThan(10);
      }
    });
  });

  describe('getDescriptions helper', () => {
    it('should return project descriptions for "project" scope', () => {
      const descriptions = getDescriptions('project');
      expect(descriptions).toBe(PROJECT_CONFIG_DESCRIPTIONS);
    });

    it('should return user descriptions for "user" scope', () => {
      const descriptions = getDescriptions('user');
      expect(descriptions).toBe(USER_CONFIG_DESCRIPTIONS);
    });

    it('should return workspace descriptions for "workspace" scope', () => {
      const descriptions = getDescriptions('workspace');
      expect(descriptions).toBe(WORKSPACE_CONFIG_DESCRIPTIONS);
    });
  });

  describe('Description Quality', () => {
    it('should have examples for complex keys', () => {
      // Keys that definitely should have examples
      const complexKeys = ['claude.args', 'notifyEvents', 'outputLevel'];

      for (const key of complexKeys) {
        const projectDesc = PROJECT_CONFIG_DESCRIPTIONS[key];
        if (projectDesc) {
          expect(
            projectDesc.example,
            `Complex key ${key} should have an example`
          ).toBeTruthy();
        }
      }
    });

    it('should have warnings for dangerous options', () => {
      const dangerousDesc = PROJECT_CONFIG_DESCRIPTIONS['claude.args'];
      expect(dangerousDesc).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(dangerousDesc!.notes).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(dangerousDesc!.notes).toContain('⚠️');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(dangerousDesc!.notes).toContain('dangerously-skip-permissions');
    });
  });
});
