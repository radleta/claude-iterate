import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { TemplateManager } from '../../src/core/template-manager.js';
import { Workspace } from '../../src/core/workspace.js';
import { getTestDir, writeTestFile } from '../setup.js';

describe('TemplateManager', () => {
  it('should save workspace as template', async () => {
    const testDir = getTestDir();
    const projectTemplatesDir = join(testDir, 'templates');
    const globalTemplatesDir = join(testDir, 'global-templates');
    const workspacePath = join(testDir, 'workspaces', 'test-workspace');

    const workspace = await Workspace.init('test-workspace', workspacePath);
    await workspace.writeInstructions('# Test Instructions');

    const manager = new TemplateManager(projectTemplatesDir, globalTemplatesDir);

    await manager.saveTemplate(workspacePath, 'test-template', {
      description: 'Test template',
      tags: ['test', 'demo'],
    });

    const template = await manager.findTemplate('test-template');
    expect(template).toBeDefined();
    expect(template?.name).toBe('test-template');
    expect(template?.source).toBe('project');
  });

  it('should save template to global directory', async () => {
    const testDir = getTestDir();
    const projectTemplatesDir = join(testDir, 'templates');
    const globalTemplatesDir = join(testDir, 'global-templates');
    const workspacePath = join(testDir, 'workspaces', 'test-workspace');

    const workspace = await Workspace.init('test-workspace', workspacePath);
    await workspace.writeInstructions('# Global Template');

    const manager = new TemplateManager(projectTemplatesDir, globalTemplatesDir);

    await manager.saveTemplate(workspacePath, 'global-template', {
      description: 'Global test template',
      global: true,
    });

    const template = await manager.findTemplate('global-template');
    expect(template).toBeDefined();
    expect(template?.source).toBe('global');
  });

  it('should throw error if workspace has no instructions', async () => {
    const testDir = getTestDir();
    const projectTemplatesDir = join(testDir, 'templates');
    const globalTemplatesDir = join(testDir, 'global-templates');
    const workspacePath = join(testDir, 'workspaces', 'no-instructions');

    await Workspace.init('no-instructions', workspacePath);

    const manager = new TemplateManager(projectTemplatesDir, globalTemplatesDir);

    await expect(
      manager.saveTemplate(workspacePath, 'test-template')
    ).rejects.toThrow('INSTRUCTIONS.md');
  });

  it('should use template to create workspace', async () => {
    const testDir = getTestDir();
    const projectTemplatesDir = join(testDir, 'templates');
    const globalTemplatesDir = join(testDir, 'global-templates');
    const templatePath = join(projectTemplatesDir, 'my-template');

    // Create template manually
    await writeTestFile(
      join(templatePath, 'INSTRUCTIONS.md'),
      '# Template Instructions'
    );
    await writeTestFile(
      join(templatePath, '.template.json'),
      JSON.stringify({ name: 'my-template', description: 'Test' })
    );

    const manager = new TemplateManager(projectTemplatesDir, globalTemplatesDir);

    // Get template for init
    const templateInfo = await manager.getTemplateForInit('my-template');

    // Initialize workspace
    const newWorkspacePath = join(testDir, 'workspaces', 'from-template');
    await Workspace.init('from-template', newWorkspacePath);

    // Copy INSTRUCTIONS.md from template
    const { copyFile } = await import('../../src/utils/fs.js');
    const instructionsDest = join(newWorkspacePath, 'INSTRUCTIONS.md');
    await copyFile(templateInfo.instructionsPath, instructionsDest);

    // Verify INSTRUCTIONS.md was copied
    const workspace = await Workspace.load('from-template', newWorkspacePath);
    const instructions = await workspace.getInstructions();

    expect(instructions).toContain('Template Instructions');
  });

  it('should list templates from project and global', async () => {
    const testDir = getTestDir();
    const projectTemplatesDir = join(testDir, 'templates');
    const globalTemplatesDir = join(testDir, 'global-templates');

    // Create project template
    await writeTestFile(
      join(projectTemplatesDir, 'project-tpl', 'INSTRUCTIONS.md'),
      'Project template'
    );
    await writeTestFile(
      join(projectTemplatesDir, 'project-tpl', '.template.json'),
      JSON.stringify({ name: 'project-tpl', description: 'Project template' })
    );

    // Create global template
    await writeTestFile(
      join(globalTemplatesDir, 'global-tpl', 'INSTRUCTIONS.md'),
      'Global template'
    );
    await writeTestFile(
      join(globalTemplatesDir, 'global-tpl', '.template.json'),
      JSON.stringify({ name: 'global-tpl', description: 'Global template' })
    );

    const manager = new TemplateManager(projectTemplatesDir, globalTemplatesDir);

    const templates = await manager.listTemplates();

    expect(templates).toHaveLength(2);
    expect(templates.find((t) => t.name === 'project-tpl')).toBeDefined();
    expect(templates.find((t) => t.name === 'global-tpl')).toBeDefined();
  });

  it('should prioritize project templates over global', async () => {
    const testDir = getTestDir();
    const projectTemplatesDir = join(testDir, 'templates');
    const globalTemplatesDir = join(testDir, 'global-templates');

    // Create both project and global template with same name
    await writeTestFile(
      join(projectTemplatesDir, 'same-name', 'INSTRUCTIONS.md'),
      'Project version'
    );
    await writeTestFile(
      join(globalTemplatesDir, 'same-name', 'INSTRUCTIONS.md'),
      'Global version'
    );

    const manager = new TemplateManager(projectTemplatesDir, globalTemplatesDir);

    const template = await manager.findTemplate('same-name');

    expect(template).toBeDefined();
    expect(template?.source).toBe('project');
  });

  it('should get template details', async () => {
    const testDir = getTestDir();
    const projectTemplatesDir = join(testDir, 'templates');
    const globalTemplatesDir = join(testDir, 'global-templates');

    await writeTestFile(
      join(projectTemplatesDir, 'detailed', 'INSTRUCTIONS.md'),
      'Instructions'
    );
    await writeTestFile(
      join(projectTemplatesDir, 'detailed', '.template.json'),
      JSON.stringify({
        name: 'detailed',
        description: 'Detailed template',
        tags: ['foo', 'bar'],
        estimatedIterations: 10,
      })
    );

    const manager = new TemplateManager(projectTemplatesDir, globalTemplatesDir);

    const template = await manager.getTemplate('detailed');

    expect(template.name).toBe('detailed');
    expect(template.metadata?.description).toBe('Detailed template');
    expect(template.metadata?.tags).toEqual(['foo', 'bar']);
    expect(template.metadata?.estimatedIterations).toBe(10);
  });

  it('should check if template exists', async () => {
    const testDir = getTestDir();
    const projectTemplatesDir = join(testDir, 'templates');
    const globalTemplatesDir = join(testDir, 'global-templates');

    await writeTestFile(
      join(projectTemplatesDir, 'exists', 'INSTRUCTIONS.md'),
      'Exists'
    );

    const manager = new TemplateManager(projectTemplatesDir, globalTemplatesDir);

    expect(await manager.exists('exists')).toBe(true);
    expect(await manager.exists('does-not-exist')).toBe(false);
  });

  it('should throw error if template not found', async () => {
    const testDir = getTestDir();
    const projectTemplatesDir = join(testDir, 'templates');
    const globalTemplatesDir = join(testDir, 'global-templates');

    const manager = new TemplateManager(projectTemplatesDir, globalTemplatesDir);

    await expect(manager.getTemplate('nonexistent')).rejects.toThrow(
      'not found'
    );
  });

  it('should throw error if template already exists', async () => {
    const testDir = getTestDir();
    const projectTemplatesDir = join(testDir, 'templates');
    const globalTemplatesDir = join(testDir, 'global-templates');
    const workspacePath = join(testDir, 'workspaces', 'test-workspace');

    const workspace = await Workspace.init('test-workspace', workspacePath);
    await workspace.writeInstructions('# Instructions');

    const manager = new TemplateManager(projectTemplatesDir, globalTemplatesDir);

    await manager.saveTemplate(workspacePath, 'duplicate');

    await expect(
      manager.saveTemplate(workspacePath, 'duplicate')
    ).rejects.toThrow('already exists');
  });
});
