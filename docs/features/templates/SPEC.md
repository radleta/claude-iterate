# Technical Specification: Templates

## Specification Layers

This spec is organized into three layers for clarity:

**Layer 1: Functional Requirements (What)**

- Save workspaces as reusable templates with metadata
- Create new workspaces from templates
- List and discover available templates
- View template details before use

**Layer 2: Architecture & Design (How - Language Agnostic)**

- Template storage structure (INSTRUCTIONS.md, .template.json, README.md)
- Project vs global template resolution
- Template metadata schema and validation

**Layer 3: Implementation Standards (How - Language Specific)**

- TypeScript implementation with Zod validation
- Commander.js CLI commands
- File system operations via abstracted fs utilities

## Public Contract / API

### CLI Commands

The templates feature exposes four CLI commands:

```bash
# Save workspace as template
claude-iterate template save <workspace> [name] [options]

# Create workspace from template
claude-iterate template use <template> <workspace>

# List all available templates
claude-iterate template list

# Show template details
claude-iterate template show <name>

# Delete a template
claude-iterate template delete <name> [options]
```

### Public TypeScript API

```typescript
// src/core/template-manager.ts
export class TemplateManager {
  constructor(projectTemplatesDir: string, globalTemplatesDir: string);

  // Save workspace as template
  async saveTemplate(
    workspacePath: string,
    templateName: string,
    options?: {
      description?: string;
      tags?: string[];
      estimatedIterations?: number;
      global?: boolean;
      force?: boolean;
    }
  ): Promise<void>;

  // Find template by name (checks project first, then global)
  async findTemplate(name: string): Promise<Template | null>;

  // Get template for workspace initialization
  async getTemplateForInit(templateName: string): Promise<{
    metadata?: TemplateMetadata;
    instructionsPath: string;
  }>;

  // List all available templates
  async listTemplates(): Promise<TemplateListItem[]>;

  // Get template details
  async getTemplate(name: string): Promise<Template>;

  // Check if template exists
  async exists(name: string): Promise<boolean>;

  // Delete a template
  async delete(name: string, global?: boolean): Promise<void>;
}
```

### Template Schema

```typescript
// src/types/template.ts
export interface TemplateMetadata {
  name: string;
  description?: string;
  version?: string;
  tags: string[];
  estimatedIterations?: number;
  author?: string;
  created?: string; // ISO 8601 datetime
  // Workspace configuration
  mode?: ExecutionMode;
  maxIterations?: number;
  delay?: number;
  completionMarkers?: string[];
}

export interface Template {
  name: string;
  path: string;
  instructionsPath: string;
  readmePath?: string;
  metadata?: TemplateMetadata;
  source: 'project' | 'global';
}

export interface TemplateListItem {
  name: string;
  description?: string;
  source: 'project' | 'global';
  tags: string[];
  estimatedIterations?: number;
}
```

## Dependencies

- [Workspace Management](../workspace-management/SPEC.md) - Loads workspace metadata for template creation, initializes workspaces from templates
- [Configuration](../configuration/SPEC.md) - Resolves template directory paths from project and user config

## CLI Commands (Detailed)

### `claude-iterate template save <workspace> [name]`

**Description:** Save a workspace as a reusable template

**Arguments:**

- `<workspace>` (required): Name of workspace to save as template
- `[name]` (optional): Template name (defaults to workspace name if omitted)

**Options:**

- `-d, --description <text>`: Template description
- `-t, --tags <tags>`: Comma-separated tags for categorization
- `-e, --estimated-iterations <number>`: Estimated iterations for tasks using this template
- `-g, --global`: Save to global templates directory
- `-f, --force`: Overwrite existing template

**Behavior:**

1. Validates workspace exists and has INSTRUCTIONS.md
2. Defaults template name to workspace name if not provided
3. Checks if template already exists (error unless `--force`)
4. Creates template directory in project or global location
5. Copies INSTRUCTIONS.md from workspace
6. Reads workspace .metadata.json to extract mode, maxIterations, delay
7. Creates .template.json with metadata and workspace configuration
8. Optionally creates README.md if description provided

**Success Output:**

```
✓ Saving workspace as template: my-template
✓ Template saved: my-template (project)

Use template:
  claude-iterate template use my-template <new-workspace>
```

**Error Cases:**

- Workspace not found: Exit code 1, message "Workspace not found"
- No INSTRUCTIONS.md: Exit code 1, message "Workspace must have instructions to save as template"
- Template exists without force: Exit code 1, message "Template already exists. Use --force to overwrite."

---

### `claude-iterate template use <template> <workspace>`

**Description:** Create a new workspace from a template

**Arguments:**

- `<template>` (required): Template name to use
- `<workspace>` (required): New workspace name

**Behavior:**

1. Validates template exists (checks project first, then global)
2. Retrieves template metadata (mode, maxIterations, delay) and instructions path
3. Initializes new workspace with template configuration
4. Copies INSTRUCTIONS.md from template to new workspace
5. Displays next steps (validate, edit, run)

**Success Output:**

```
✓ Creating workspace from template: my-template
✓ Workspace created: new-workspace

Next steps:
  • Validate: claude-iterate validate new-workspace
  • Edit (optional): claude-iterate edit new-workspace
  • Run: claude-iterate run new-workspace
```

**Error Cases:**

- Template not found: Exit code 1, message "Template not found: {name}" with suggestion to run `template list`
- Workspace already exists: Exit code 1, message from workspace init (inherited error)

---

### `claude-iterate template list`

**Description:** List all available templates with metadata

**Behavior:**

1. Scans project templates directory
2. Scans global templates directory
3. Filters duplicates (project templates take precedence)
4. Groups output by source (project vs global)
5. Displays name, description, tags, estimated iterations

**Success Output:**

```
Available Templates

📁 Project Templates:

  • api-migration
    API endpoint migration workflow
    Tags: backend, api
    Estimated iterations: 20

  • frontend-pages
    Frontend page generation
    Tags: frontend, react

🌍 Global Templates:

  • monthly-report
    Monthly reporting template
    Tags: reporting, monthly
    Estimated iterations: 5

Total: 3 template(s)
```

**No Templates Output:**

```
ℹ No templates found
  Save a template: claude-iterate template save <workspace> <template-name>
```

---

### `claude-iterate template show <name>`

**Description:** Display detailed information about a template

**Arguments:**

- `<name>` (required): Template name to display

**Behavior:**

1. Finds template (checks project first, then global)
2. Loads metadata from .template.json
3. Reads first 10 lines of INSTRUCTIONS.md for preview
4. Displays formatted details

**Success Output:**

```
Template: api-migration

📁 Source: project
📂 Path: ./claude-iterate/templates/api-migration

ℹ️  Metadata:
   Description: Migrate REST API endpoints to new framework
   Tags: backend, api, migration
   Estimated iterations: 20
   Author: developer
   Created: 2025-10-27T10:30:00Z

📄 Instructions preview:

   # API Migration Template

   This workspace helps migrate existing REST API endpoints to the new framework.

   ## Tasks

   1. Identify endpoints to migrate
   2. Create new route handlers
   ...

Use template:
  claude-iterate template use api-migration <new-workspace>
```

**Error Cases:**

- Template not found: Exit code 1, message "Template not found: {name}"

---

### `claude-iterate template delete <name>`

**Description:** Delete a template

**Arguments:**

- `<name>` (required): Template name to delete

**Options:**

- `-g, --global`: Delete from global templates
- `-f, --force`: Skip confirmation prompt

**Behavior:**

1. Determines target directory (project or global based on flag)
2. Confirms deletion unless `--force` flag provided
3. Removes template directory

**Success Output:**

```
✓ Template deleted (project): my-template
```

**Error Cases:**

- Template not found: Exit code 1, message "Template not found: {name}"
- No force flag: Exit code 0, warning message and instruction to use `--force`

## Template Storage Structure

### Template Directory Layout

**Project Templates:**

```
./claude-iterate/templates/
└── my-template/
    ├── INSTRUCTIONS.md    (Required: Workspace instructions)
    ├── .template.json     (Required: Template metadata)
    └── README.md          (Optional: Generated if description provided)
```

**Global Templates:**

```
~/.config/claude-iterate/templates/
└── my-template/
    ├── INSTRUCTIONS.md
    ├── .template.json
    └── README.md
```

### .template.json Schema

```json
{
  "name": "my-template",
  "description": "Template description for users",
  "version": "1.0.0",
  "tags": ["tag1", "tag2"],
  "estimatedIterations": 20,
  "author": "developer-name",
  "created": "2025-10-27T10:30:00.000Z",
  "mode": "loop",
  "maxIterations": 50,
  "delay": 2
}
```

**Field Validation:**

- `name`: Required, min 1 character
- `description`: Optional string
- `version`: Optional string
- `tags`: Optional array of strings, default []
- `estimatedIterations`: Optional integer >= 1
- `author`: Optional string
- `created`: Optional ISO 8601 datetime string
- `mode`: Optional enum (loop, iterative)
- `maxIterations`: Optional integer >= 1
- `delay`: Optional integer >= 0
- `completionMarkers`: Optional array of strings

### README.md Generation

When description is provided, auto-generate README.md:

```markdown
# {template-name}

{description}

## Usage

\`\`\`bash
claude-iterate template use {template-name} <new-workspace-name>
\`\`\`
```

## Template Resolution Algorithm

When finding templates by name:

1. Check project templates directory: `{projectTemplatesDir}/{name}/`
2. If found, return Template with source='project'
3. If not found, check global templates directory: `{globalTemplatesDir}/{name}/`
4. If found, return Template with source='global'
5. If not found, return null

**Priority:** Project templates always take precedence over global templates with the same name.

## Error Handling & Edge Cases

### Error Cases

1. **Workspace has no instructions**
   - Condition: saveTemplate() called on workspace without INSTRUCTIONS.md
   - Error: `Error: Workspace must have INSTRUCTIONS.md to save as template`
   - Action: Exit with code 1

2. **Template already exists**
   - Condition: saveTemplate() called with existing template name without force flag
   - Error: `TemplateExistsError: Template already exists. Use --force to overwrite.`
   - Action: Exit with code 1

3. **Template not found**
   - Condition: useTemplate(), getTemplate(), or show command with non-existent name
   - Error: `TemplateNotFoundError: Template not found: {name}`
   - Action: Exit with code 1, suggest `template list` command

4. **Invalid metadata**
   - Condition: .template.json exists but fails Zod validation
   - Error: Silently ignore invalid metadata (graceful degradation)
   - Action: Template loaded without metadata field

5. **Write permission denied**
   - Condition: Cannot write to template directory
   - Error: File system error
   - Action: Propagate error, exit with code 1

### Edge Cases

1. **Template name conflicts (project vs global)**
   - Behavior: Project template takes precedence
   - Listing: Show both but project template is returned by findTemplate()
   - Resolution: User must explicitly use `--global` flag when saving to override

2. **Template with same name as workspace**
   - Behavior: Allowed (template name defaults to workspace name)
   - No conflict: Templates and workspaces are in different directories

3. **Overwriting template with --force**
   - Behavior: Remove existing template directory entirely, recreate with new content
   - Ensures: No leftover files from previous template version

4. **Template missing .template.json**
   - Behavior: Template still usable, metadata field will be undefined
   - Validation: INSTRUCTIONS.md is the only required file

5. **Special characters in template names**
   - Behavior: Validated by directory name rules (OS-dependent)
   - Recommendation: Use alphanumeric, dash, underscore only

## Security & Non-Functional Requirements

### Security

- Template names validated to prevent directory traversal (no `../` patterns)
- File operations use abstracted fs utilities with error handling
- No execution of template content (INSTRUCTIONS.md is plain text copied as-is)
- Global templates require write access to user config directory (enforced by OS permissions)

### Performance

- Template listing scans directories synchronously (acceptable for typical <100 templates)
- Template save/use operations are I/O bound (no optimization needed)
- Metadata parsing uses Zod validation (fast for small JSON files)

### Monitoring

- All template operations logged via Logger utility
- Success/error messages displayed to user
- No telemetry or analytics

## Implementation Notes

**Patterns Discovered:**

- Similar features: workspace, archive (both manage directories and metadata)
- Testing: Vitest, coverage target >=80%, tests in `tests/unit/`, all operations mocked
- Dependencies: Workspace for init/load, ConfigManager for directory paths
- Coding style: 2-space indent, single quotes, semicolons required, ESM imports

**Template Metadata Evolution:**

- Version 1: Basic metadata (name, description, tags)
- Version 2 (current): Added workspace configuration (mode, maxIterations, delay)
- Future: Could add custom file patterns, environment variables, hooks

**Why workspace config in templates:**

- Templates capture both instructions AND proven configuration
- Users can override config when using template via CLI flags
- Enables templates to be truly reusable (not just instruction text)
