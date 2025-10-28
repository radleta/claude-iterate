# Technical Specification: Configuration

## Specification Layers

This spec is organized into three layers:

**Layer 1: Functional Requirements (What)**

- Configuration management with layered priority system
- Support for three scopes: project, user, workspace
- Key discovery and value resolution

**Layer 2: Architecture & Design (How - Language Agnostic)**

- Layered config resolution algorithm
- Dot notation for nested keys
- Schema-based validation

**Layer 3: Implementation Standards (How - Language Specific)**

- TypeScript 5.8+ with Zod validation
- Commander.js for CLI interface
- JSON file storage

## Public Contract / API

### CLI Commands

```bash
# View all keys for a scope
claude-iterate config --keys                          # Project keys
claude-iterate config --keys --global                 # User keys
claude-iterate config --keys --workspace <name>       # Workspace keys

# Get value
claude-iterate config <key>                           # Project
claude-iterate config --global <key>                  # User
claude-iterate config --workspace <name> <key>        # Workspace

# Set value
claude-iterate config <key> <value>                   # Project
claude-iterate config --global <key> <value>          # User
claude-iterate config --workspace <name> <key> <value> # Workspace

# Array operations
claude-iterate config <key> --add <value>             # Add to array
claude-iterate config <key> --remove <value>          # Remove from array
claude-iterate config <key> --unset                   # Remove key

# List all config
claude-iterate config --list                          # Project
claude-iterate config --list --global                 # User
claude-iterate config --list --workspace <name>       # Workspace
```

### ConfigManager API

```typescript
// Load configuration with layered merging
ConfigManager.load(cliOptions?, workspaceMetadata?): Promise<ConfigManager>

// Get specific config value
configManager.get<K>(key: K): RuntimeConfig[K]

// Get full config object
configManager.getConfig(): RuntimeConfig

// Resolve effective values with source tracking
configManager.resolveEffectiveValues(
  scope: 'project' | 'user' | 'workspace',
  workspaceMetadata?: Metadata
): Promise<Map<string, { value: unknown; source: string }>>
```

### Config File Schemas

**Project Config** (`.claude-iterate.json`):

```typescript
{
  workspacesDir: string;
  templatesDir: string;
  archiveDir: string;
  defaultMaxIterations: number;
  defaultDelay: number;
  defaultStagnationThreshold: number;
  outputLevel: 'quiet' | 'progress' | 'verbose';
  notifyUrl?: string;
  notifyEvents: string[];
  notification?: { statusWatch?: {...} };
  claude: { command: string; args: string[] };
  verification: { autoVerify, resumeOnFail, maxAttempts, reportFilename, depth, notifyOnVerification };
}
```

**User Config** (`~/.config/claude-iterate/config.json`):

```typescript
{
  globalTemplatesDir: string;
  defaultMaxIterations: number;
  defaultDelay: number;
  defaultStagnationThreshold: number;
  outputLevel: 'quiet' | 'progress' | 'verbose';
  notifyUrl?: string;
  claude: { command: string; args: string[] };
  colors: boolean;
  verification: { ... };
}
```

**Workspace Config** (`.metadata.json` → `config` field):

```typescript
{
  outputLevel?: 'quiet' | 'progress' | 'verbose';
  claude?: { command?: string; args?: string[] };
  verification?: { depth?, autoVerify?, resumeOnFail?, maxAttempts?, reportFilename?, notifyOnVerification? };
}
```

## Dependencies

None - This is a foundational feature used by other commands.

## CLI Command Details

### `config [key] [value]`

**Purpose**: Get or set configuration values at project, user, or workspace level.

**Arguments:**

- `[key]` - Configuration key in dot notation (e.g., `verification.depth`)
- `[value]` - Value to set (omit to get current value)

**Options:**

- `-g, --global` - Use user config instead of project config
- `-w, --workspace <name>` - Manage workspace-level config
- `-k, --keys` - Show available configuration keys with descriptions
- `-l, --list` - List all configuration values
- `--json` - Output as JSON (for use with `--keys`)
- `--add <value>` - Add value to array (array-type configs only)
- `--remove <value>` - Remove value from array (array-type configs only)
- `--unset` - Remove configuration key

**Behaviors:**

- No arguments + `--keys`: Show available keys for scope
- No arguments + `--list`: Show all config values for scope
- Key only: Show current value for key
- Key + value: Set key to value
- Key + `--add`: Add value to array key
- Key + `--remove`: Remove value from array key
- Key + `--unset`: Delete key

**Error Handling:**

- Missing key (without `--list` or `--keys`): Exit 1 with error message
- Invalid scope combination: Exit 1 with error message
- Schema validation failure: Exit 1 with detailed error
- Array operation on non-array: Exit 1 with error
- Workspace not found: Exit 1 with error

## Configuration Resolution Algorithm

**Priority Order** (highest to lowest):

1. CLI flags (runtime only, passed to `ConfigManager.load`)
2. Workspace config (`.metadata.json` → `config` field)
3. Project config (`.claude-iterate.json`)
4. User config (`~/.config/claude-iterate/config.json`)
5. Schema defaults

**Resolution Process:**

1. Start with schema defaults
2. Load user config if exists → merge using `mergeUserConfig()`
3. Load project config if exists → merge using `mergeProjectConfig()`
4. Load workspace metadata if provided → merge using `mergeWorkspaceConfig()`
5. Apply CLI options if provided → merge using `mergeCliOptions()`
6. Resolve tilde (`~`) in all path fields
7. Return merged `RuntimeConfig`

**Merge Strategy:**

- Simple values: Higher priority overwrites lower priority
- Objects: Shallow merge (higher priority fields override)
- Arrays: Complete replacement (no merging)

## Dot Notation System

**Purpose**: Access nested configuration keys using dot notation (e.g., `claude.args`, `verification.depth`).

**Implementation:**

- `getNestedValue(obj, path)` - Navigate object using dot path, return value or undefined
- `setNestedValue(obj, path, value)` - Create nested structure if needed, set leaf value
- `unsetNestedValue(obj, path)` - Delete leaf value, return boolean for success

**Examples:**

```javascript
// Get: verification.depth → config.verification.depth
getNestedValue(config, 'verification.depth'); // 'standard'

// Set: verification.depth = 'deep' → config.verification.depth = 'deep'
setNestedValue(config, 'verification.depth', 'deep');

// Unset: verification.depth → delete config.verification.depth
unsetNestedValue(config, 'verification.depth'); // true
```

## Array Operations

**Purpose**: Manage array-type configurations without manual JSON editing.

**Operations:**

- `--add <value>` - Append value to array if not already present
- `--remove <value>` - Remove value from array if present
- `--unset` - Delete entire array key

**Validation:**

- Only works on array-type fields (validated via schema inspection)
- `--add` with existing value: Warning, no change
- `--remove` with missing value: Warning, no change
- Non-array field: Error exit 1

**Use Cases:**

```bash
# Add Claude CLI argument
claude-iterate config claude.args --add --dangerously-skip-permissions

# Remove Claude CLI argument
claude-iterate config claude.args --remove --dangerously-skip-permissions

# Clear all arguments
claude-iterate config claude.args --unset
```

**Security Warning:**
When adding `--dangerously-skip-permissions`, display warning about security implications with link to documentation.

## Key Discovery System

**Purpose**: Help users discover available configuration keys with types, defaults, and current values.

**Components:**

### SchemaInspector

- Introspects Zod schemas to extract field metadata
- Recursively processes nested objects
- Extracts: key path, type, optional status, default value, enum values, constraints

### ConfigKeysFormatter

- Formats schema fields into human-readable output
- Groups keys by category (paths, execution, output, notifications, claude, verification)
- Color-codes current values by source (yellow=user, cyan=project, magenta=workspace)
- Provides JSON output option for scripting

### Key Descriptions

- Human-written descriptions stored in `src/config/key-descriptions.ts`
- Provides: description, example, notes, related keys, category
- Separate description maps for project, user, and workspace scopes

**Output Format:**

```
Configuration Keys (project)

Paths:
  workspacesDir                string    ./claude-iterate/workspaces  # Current: ./custom (project)
    Directory containing all workspace subdirectories
    Example: ./my-workspaces

Execution:
  defaultMaxIterations         number    50
    Maximum iterations before automatic stop
    Example: 100
    Range: ≥1
    Related: defaultDelay, defaultStagnationThreshold
```

**JSON Output:**

```json
{
  "scope": "project",
  "keys": [
    {
      "key": "workspacesDir",
      "type": "string",
      "default": "./claude-iterate/workspaces",
      "description": "Directory containing all workspace subdirectories",
      "example": "./my-workspaces",
      "category": "paths",
      "current": {
        "value": "./custom",
        "source": "project"
      }
    }
  ]
}
```

## Value Resolution with Source Tracking

**Purpose**: Show users where each config value comes from (default, user, project, workspace).

**Algorithm:**

1. Flatten all config sources to dot notation using `flattenConfig()`
2. For each unique key across all sources:
   - Check workspace config (if workspace scope)
   - Check project config (if workspace or project scope)
   - Check user config
   - Fall back to schema default
3. Return map of key → `{ value, source }`

**Source Priority:**

- `workspace` - From workspace's `.metadata.json`
- `project` - From `.claude-iterate.json`
- `user` - From `~/.config/claude-iterate/config.json`
- `default` - From schema default value

**Use Case:**
Displayed in `--keys` output to show which config file is currently controlling each setting.

## Schema Validation

**Validation Points:**

- Before saving project config: `ProjectConfigSchema.parse(config)`
- Before saving user config: `UserConfigSchema.parse(config)`
- Before saving workspace config: `WorkspaceConfigSchema.parse(config)`

**Validation Failures:**

- Exit code: 1
- Error message: Detailed Zod validation error
- No partial writes (atomic operations)

## File Locations

**Project Config:**

- Path: `./.claude-iterate.json` (current working directory)
- Created on: First `claude-iterate config <key> <value>` command
- Schema: `ProjectConfigSchema`

**User Config:**

- Path: `~/.config/claude-iterate/config.json`
- Created on: First `claude-iterate config --global <key> <value>` command
- Schema: `UserConfigSchema`

**Workspace Config:**

- Path: `<workspacesDir>/<workspace-name>/.metadata.json` → `config` field
- Created on: Workspace initialization or first workspace-specific config set
- Schema: `WorkspaceConfigSchema` (subset of ProjectConfig)

## Security Considerations

**Permission Prompt Warning:**

- When adding `--dangerously-skip-permissions` to `claude.args`, display warning:
  - Explains what the flag does (disables permission prompts)
  - Lists risks (file access, command execution without confirmation)
  - Recommends container usage only
  - Provides link to Anthropic documentation

**Path Resolution:**

- Tilde (`~`) expansion supported for user home directory
- All paths resolved to absolute paths before use
- No path traversal validation (user controls their own config)

## Performance Requirements

- Config file reads: <10ms (small JSON files)
- Schema validation: <20ms (Zod parsing)
- Config resolution: <30ms (layered merging)

## Error Messages

**Missing Key:**

```
Configuration key required. Use --keys to see all available keys.
```

**Invalid Schema:**

```
Invalid project config: Expected number, received string at defaultMaxIterations
```

**Non-Array Operation:**

```
Key 'outputLevel' is not an array
```

**Workspace Not Found:**

```
Workspace 'my-task' not found
```

**Circular Reference (N/A):**
Config system doesn't support references, so circular dependencies are impossible.

## Implementation Notes

**Pattern Discovered:**

- Commander.js used for CLI command definition
- Logger utility for colored console output
- Async file operations using `fs.promises`
- Zod schemas define shape and defaults

**Testing Patterns:**

- Unit tests: Mock file system, test config resolution logic
- Integration tests: Temp directories, test full config inheritance chain
- Coverage target: ≥80% line coverage

**Code Style:**

- 2-space indentation
- Single quotes for strings
- Semicolons required
- ESM modules (`import`/`export`)
