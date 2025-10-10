import { join, basename } from 'path';
import {
  Template,
  TemplateMetadata,
  TemplateMetadataSchema,
  TemplateListItem,
} from '../types/template.js';
import {
  dirExists,
  ensureDir,
  fileExists,
  writeText,
  readJson,
  writeJson,
  copyFile,
  listDir,
  remove,
} from '../utils/fs.js';
import {
  TemplateNotFoundError,
  TemplateExistsError,
} from '../utils/errors.js';

/**
 * Template manager for reusable task patterns
 */
export class TemplateManager {
  constructor(
    private projectTemplatesDir: string,
    private globalTemplatesDir: string
  ) {}

  /**
   * Save workspace as template
   */
  async saveTemplate(
    workspacePath: string,
    templateName: string,
    options?: {
      description?: string;
      tags?: string[];
      estimatedIterations?: number;
      global?: boolean;
    }
  ): Promise<void> {
    const targetDir = options?.global
      ? this.globalTemplatesDir
      : this.projectTemplatesDir;

    const templatePath = join(targetDir, templateName);

    // Check if template already exists
    if (await dirExists(templatePath)) {
      throw new TemplateExistsError(templateName);
    }

    // Create template directory
    await ensureDir(templatePath);

    // Copy INSTRUCTIONS.md
    const instructionsSource = join(workspacePath, 'INSTRUCTIONS.md');
    if (!(await fileExists(instructionsSource))) {
      throw new Error('Workspace must have INSTRUCTIONS.md to save as template');
    }

    const instructionsDest = join(templatePath, 'INSTRUCTIONS.md');
    await copyFile(instructionsSource, instructionsDest);

    // Create template metadata
    const metadata: TemplateMetadata = {
      name: templateName,
      description: options?.description,
      tags: options?.tags || [],
      estimatedIterations: options?.estimatedIterations,
      created: new Date().toISOString(),
    };

    await writeJson(join(templatePath, '.template.json'), metadata);

    // Create README if description provided
    if (options?.description) {
      const readme = `# ${templateName}\n\n${options.description}\n\n## Usage\n\n\`\`\`bash\nclaude-iterate template use ${templateName} <new-workspace-name>\n\`\`\`\n`;
      await writeText(join(templatePath, 'README.md'), readme);
    }
  }

  /**
   * Use template to create new workspace
   */
  async useTemplate(
    templateName: string,
    workspacePath: string
  ): Promise<void> {
    const template = await this.findTemplate(templateName);

    if (!template) {
      throw new TemplateNotFoundError(templateName);
    }

    // Create workspace directory
    await ensureDir(workspacePath);

    // Copy INSTRUCTIONS.md
    const instructionsDest = join(workspacePath, 'INSTRUCTIONS.md');
    await copyFile(template.instructionsPath, instructionsDest);
  }

  /**
   * Find template by name (checks project first, then global)
   */
  async findTemplate(name: string): Promise<Template | null> {
    // Check project templates first
    const projectPath = join(this.projectTemplatesDir, name);
    if (await dirExists(projectPath)) {
      return await this.loadTemplate(projectPath, 'project');
    }

    // Check global templates
    const globalPath = join(this.globalTemplatesDir, name);
    if (await dirExists(globalPath)) {
      return await this.loadTemplate(globalPath, 'global');
    }

    return null;
  }

  /**
   * Load template from path
   */
  private async loadTemplate(
    path: string,
    source: 'project' | 'global'
  ): Promise<Template> {
    const instructionsPath = join(path, 'INSTRUCTIONS.md');
    const readmePath = join(path, 'README.md');
    const metadataPath = join(path, '.template.json');

    const name = basename(path);

    let metadata: TemplateMetadata | undefined;
    if (await fileExists(metadataPath)) {
      try {
        const data = await readJson<unknown>(metadataPath);
        metadata = TemplateMetadataSchema.parse(data);
      } catch {
        // Ignore invalid metadata
      }
    }

    return {
      name,
      path,
      instructionsPath,
      readmePath: (await fileExists(readmePath)) ? readmePath : undefined,
      metadata,
      source,
    };
  }

  /**
   * List all available templates
   */
  async listTemplates(): Promise<TemplateListItem[]> {
    const templates: TemplateListItem[] = [];

    // List project templates
    if (await dirExists(this.projectTemplatesDir)) {
      const projectNames = await listDir(this.projectTemplatesDir);
      for (const name of projectNames) {
        const template = await this.findTemplate(name);
        if (template) {
          templates.push({
            name: template.name,
            description: template.metadata?.description,
            source: 'project',
            tags: template.metadata?.tags || [],
            estimatedIterations: template.metadata?.estimatedIterations,
          });
        }
      }
    }

    // List global templates
    if (await dirExists(this.globalTemplatesDir)) {
      const globalNames = await listDir(this.globalTemplatesDir);
      for (const name of globalNames) {
        // Skip if already in project templates
        if (templates.some((t) => t.name === name)) {
          continue;
        }

        const template = await this.findTemplate(name);
        if (template) {
          templates.push({
            name: template.name,
            description: template.metadata?.description,
            source: 'global',
            tags: template.metadata?.tags || [],
            estimatedIterations: template.metadata?.estimatedIterations,
          });
        }
      }
    }

    return templates;
  }

  /**
   * Get template details
   */
  async getTemplate(name: string): Promise<Template> {
    const template = await this.findTemplate(name);
    if (!template) {
      throw new TemplateNotFoundError(name);
    }
    return template;
  }

  /**
   * Check if template exists
   */
  async exists(name: string): Promise<boolean> {
    const template = await this.findTemplate(name);
    return template !== null;
  }

  /**
   * Delete a template
   */
  async delete(name: string, global = false): Promise<void> {
    const templatePath = global
      ? join(this.globalTemplatesDir, name)
      : join(this.projectTemplatesDir, name);

    if (!(await dirExists(templatePath))) {
      throw new TemplateNotFoundError(name);
    }

    await remove(templatePath);
  }
}
