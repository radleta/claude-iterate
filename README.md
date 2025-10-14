# claude-iterate

A professional CLI tool for managing automated task iterations with Claude Code. Provides workspace management, instruction crafting, templates, and autonomous iteration loops—all with comprehensive TypeScript types and testing.

[![Tests](https://img.shields.io/badge/tests-131%20passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)]()

## Features

- 🎯 **Workspace Management** - Isolated environments for complex multi-step tasks
- 📝 **Guided Setup** - Interactive instruction crafting with validation
- 🔄 **Automation** - Autonomous iteration loops with Claude Code
- 🎭 **Execution Modes** - Choose between loop mode (incremental) and iterative mode (complete as much as possible)
- 📦 **Templates** - Reusable task patterns for common workflows
- 📁 **Archives** - Preserve completed work for reference
- ✅ **Testing** - Comprehensive test coverage with mocked Claude calls
- 🎨 **Professional** - TypeScript, npm-publishable, well-documented

## Installation

### Global Installation (Recommended)

```bash
npm install -g claude-iterate
```

### Local Installation

```bash
npm install claude-iterate
npx claude-iterate init my-task
```

## Quick Start

```bash
# Initialize a workspace
claude-iterate init my-feature

# Set up instructions interactively
claude-iterate setup my-feature

# Validate instructions
claude-iterate validate my-feature

# Run the iteration loop
claude-iterate run my-feature
```

## Core Concepts

### Workspace

An isolated environment for a task with:
- `INSTRUCTIONS.md` - What Claude should do
- `TODO.md` - Current state and progress
- `.metadata.json` - Tracking data
- `working/` - Scratch space for files

### Execution Modes

claude-iterate supports two distinct execution modes, each optimized for different workflows:

#### Loop Mode (Default)

Best for incremental tasks where progress should be tracked explicitly:

- Claude knows it's part of an iteration loop
- Uses "Remaining: N" count to track progress
- Completes one step at a time per iteration
- Updates count after each step: "Remaining: 5" → "Remaining: 4"
- Stops when "Remaining: 0" is reached
- Default max iterations: 50

**When to use:**
- Breaking down large tasks into explicit steps
- Tracking granular progress
- Tasks that benefit from explicit completion counting

#### Iterative Mode

Best for autonomous work sessions where Claude should complete as much as possible:

- Claude doesn't know it's iterating (appears as a fresh session)
- Uses checkbox format for TODO items (- [ ] / - [x])
- Completes as many TODO items as possible per iteration
- Focuses on doing work rather than stopping early
- Stops when all checkboxes are marked complete
- Default max iterations: 20 (fewer needed since more work per iteration)

**When to use:**
- Complex multi-step tasks requiring sustained focus
- Tasks where stopping early would be inefficient
- Autonomous work sessions with minimal iteration overhead

### Iteration Loop (Loop Mode)

1. Claude reads INSTRUCTIONS.md (what to do)
2. Claude reads TODO.md (current state)
3. Claude executes task step
4. Claude updates TODO.md with progress
5. Claude updates "Remaining: N" count
6. Repeat until "Remaining: 0"

### Completion Markers (Loop Mode)

Completion markers are strings that claude-iterate looks for in TODO.md to determine when a task is complete. They're fully customizable through a three-tier hierarchy:

**Default Markers:**
- `Remaining: 0`
- `**Remaining**: 0`
- `TASK COMPLETE`
- `✅ TASK COMPLETE`

**Customization Priority (highest to lowest):**
1. **Runtime Override** - `run` command `--completion-markers` flag
2. **Workspace-Specific** - `init` command `--completion-markers` flag
3. **Config File** - Project or user configuration file
4. **Built-in Defaults** - Fallback values

**Examples:**

```bash
# Set custom markers during init
claude-iterate init my-task --completion-markers "DONE,FINISHED,COMPLETE"

# Override markers for a single run
claude-iterate run my-task --completion-markers "ALL DONE"

# Or configure globally in ~/.config/claude-iterate/config.json
{
  "completionMarkers": ["Task Done", "100% Complete"]
}
```

**Note:** Completion markers only apply to loop mode. Iterative mode uses checkbox completion (- [ ] / - [x]).

### Templates

Save successful workspace instructions as reusable templates:
- **Project templates**: Stored in `./claude-iterate/templates/` (committed)
- **Global templates**: Stored in `~/.config/claude-iterate/templates/` (shared)

### Configuration

Layered configuration with priority:
1. CLI flags (highest)
2. Project `.claude-iterate.json`
3. User `~/.config/claude-iterate/config.json`
4. Built-in defaults

## Commands

### Workspace Management

#### `init <name>`

Initialize a new workspace.

```bash
claude-iterate init my-task

# With options
claude-iterate init my-task \
  --mode iterative \
  --max-iterations 100 \
  --delay 5 \
  --notify-url https://ntfy.sh/my-topic \
  --notify-events all
```

**Options:**
- `--mode <mode>` - Execution mode: `loop` (default) or `iterative`
- `-m, --max-iterations <number>` - Maximum iterations (default: mode-specific)
- `-d, --delay <seconds>` - Delay between iterations (default: 2)
- `--completion-markers <markers>` - Comma-separated completion markers (loop mode only)
- `--notify-url <url>` - Notification URL (ntfy.sh)
- `--notify-events <events>` - Comma-separated events (default: completion,error)

#### `list` / `ls`

List all workspaces with status.

```bash
claude-iterate list

# Filter by status
claude-iterate list --status completed
claude-iterate list --status in_progress
claude-iterate list --status error
```

#### `show <name>`

Show detailed workspace information.

```bash
claude-iterate show my-task
```

**Displays:**
- Status and completion
- Iteration counts
- File locations
- Settings and timestamps
- Available next actions

#### `clean <name>`

Archive and delete a workspace.

```bash
# Archives then deletes (default)
claude-iterate clean my-task --force

# Delete without archiving
claude-iterate clean my-task --force --no-archive
```

**Options:**
- `-f, --force` - Skip confirmation (required)
- `--no-archive` - Delete without archiving (default: archive first)

**Note:** By default, workspaces are archived before deletion for safety. The archive can be restored later with `archive restore`.

#### `reset <name>`

Reset iteration counts (keeps instructions).

```bash
claude-iterate reset my-task
```

### Instructions Management

#### `setup <name>`

Create instructions interactively.

```bash
claude-iterate setup my-task
```

**What happens:**
- Launches interactive Claude session
- Guides you through instruction creation
- Validates against quality criteria
- Creates INSTRUCTIONS.md

#### `edit <name>`

Edit instructions interactively.

```bash
claude-iterate edit my-task
```

#### `validate <name>`

Validate instructions non-interactively.

```bash
claude-iterate validate my-task
```

**Validation criteria:**
- Autonomous execution capability
- State awareness (TODO.md handling)
- Re-runnability (dynamic counting)
- Clear TODO.md format
- Error handling
- Appropriate scale
- Completion detection

### Execution

#### `run <name>`

Run the iteration loop.

```bash
claude-iterate run my-task

# Override settings
claude-iterate run my-task --max-iterations 100
claude-iterate run my-task --delay 5
claude-iterate run my-task --no-delay
```

**Options:**
- `-m, --max-iterations <number>` - Override max iterations
- `-d, --delay <seconds>` - Override delay
- `--no-delay` - Skip delay between iterations
- `--completion-markers <markers>` - Override completion markers (comma-separated, loop mode only)
- `--dangerously-skip-permissions` - Skip permission prompts (runtime only, not saved to config)

**How it works:**
1. Reads INSTRUCTIONS.md
2. For each iteration:
   - Passes instructions to Claude
   - Claude reads TODO.md
   - Claude does work
   - Claude updates TODO.md
   - Checks completion markers
3. Stops when complete or max iterations reached

### Template Management

#### `template save <workspace> <name>`

Save workspace as template.

```bash
claude-iterate template save my-task page-generator

# With metadata
claude-iterate template save my-task api-migration \
  --description "Migrate legacy API endpoints" \
  --tags api,migration \
  --estimated-iterations 30

# Save globally (shared across projects)
claude-iterate template save my-task monthly-report --global
```

**Options:**
- `-d, --description <text>` - Template description
- `-t, --tags <tags>` - Comma-separated tags
- `-e, --estimated-iterations <number>` - Estimated iterations
- `-g, --global` - Save to global templates

#### `template use <name> <workspace>`

Create workspace from template.

```bash
claude-iterate template use page-generator login-page
claude-iterate template use api-migration user-service-migration
```

**What happens:**
- Initializes new workspace
- Copies INSTRUCTIONS.md from template
- Marks setup as complete
- Ready to validate or run

#### `template list` / `tpl ls`

List all templates.

```bash
claude-iterate template list
```

**Shows:**
- Project templates (in current project)
- Global templates (shared across projects)
- Descriptions and metadata

#### `template show <name>`

Show template details.

```bash
claude-iterate template show page-generator
```

**Displays:**
- Source (project/global)
- Metadata (description, tags, author)
- Instructions preview

### Archive Management

#### `archive save <name>`

Archive a workspace for future reference.

```bash
claude-iterate archive save my-task

# Keep workspace after archiving
claude-iterate archive save my-task --keep
```

**What happens:**
- Creates timestamped archive copy
- Adds `.archived.json` metadata
- Removes original workspace (unless `--keep` specified)
- Stores in `claude-iterate/archive/`

**Options:**
- `--keep` - Keep workspace after archiving (default: remove)

#### `archive list` / `archive ls`

List all archives.

```bash
claude-iterate archive list
```

**Shows:**
- Archive name with timestamp
- Original workspace name
- Archived date and time
- Total archive count

#### `archive restore <archive> [workspace]`

Restore an archived workspace.

```bash
# Restore to original name
claude-iterate archive restore my-task-2025-10-09T14-30-22

# Restore to new name
claude-iterate archive restore my-task-2025-10-09T14-30-22 my-task-v2
```

**What happens:**
- Copies archive back to workspaces
- Removes `.archived.json` metadata
- Ready to run or modify

#### `archive show <name>`

Show archive details.

```bash
claude-iterate archive show my-task-2025-10-09T14-30-22
```

**Displays:**
- Archive name and original name
- Archived timestamp
- File location

#### `archive delete <name>` / `archive rm <name>`

Delete an archive permanently.

```bash
# Requires --force for confirmation
claude-iterate archive delete my-task-2025-10-09T14-30-22 --force
```

**Options:**
- `-f, --force` - Skip confirmation (required)

**Note:** The `clean` command automatically archives workspaces before deletion. Use `--no-archive` to skip archiving:

```bash
# Archives then deletes
claude-iterate clean my-task --force

# Deletes without archiving
claude-iterate clean my-task --force --no-archive
```

### Configuration Management

#### `config [key] [value]`

Get or set configuration values with git-style interface. Configuration is stored at two levels:
- **Project**: `.claude-iterate.json` (project-specific settings)
- **Global**: `~/.config/claude-iterate/config.json` (user-wide defaults)

**Basic usage:**

```bash
# List all configuration (project)
claude-iterate config --list

# List global configuration
claude-iterate config --global --list

# Get a value
claude-iterate config claude.args

# Set a value
claude-iterate config defaultMaxIterations 100

# Set a global value
claude-iterate config --global defaultMaxIterations 50
```

**Array operations:**

```bash
# Add to array
claude-iterate config claude.args --add --dangerously-skip-permissions

# Add to global config
claude-iterate config --global claude.args --add --dangerously-skip-permissions

# Remove from array
claude-iterate config claude.args --remove --dangerously-skip-permissions

# Unset (delete) a key
claude-iterate config claude.args --unset
```

**Options:**
- `-g, --global` - Use global user config instead of project config
- `-l, --list` - List all configuration values
- `--add <value>` - Add value to array (for array-type configs)
- `--remove <value>` - Remove value from array
- `--unset` - Remove configuration key

**Common configurations:**

```bash
# Configure Claude CLI args (enables autonomous iteration)
claude-iterate config claude.args --add --dangerously-skip-permissions

# Set default max iterations
claude-iterate config defaultMaxIterations 100

# Configure notification URL
claude-iterate config notifyUrl https://ntfy.sh/my-topic

# Set completion markers
claude-iterate config completionMarkers --add "DONE"
claude-iterate config completionMarkers --add "COMPLETE"
```

**Dot notation** is supported for nested keys:

```bash
claude-iterate config claude.command    # Get claude.command
claude-iterate config claude.args       # Get claude.args array
```

**Security note for `claude.args`:**

By default, `claude.args` is empty, meaning Claude Code will prompt for permissions during execution. This is the **safe** default but may interrupt autonomous iteration.

To enable uninterrupted autonomous execution, you can add `--dangerously-skip-permissions`:

```bash
# Per-project (safer - limited to current project)
claude-iterate config claude.args --add --dangerously-skip-permissions

# Globally (applies to all projects)
claude-iterate config --global claude.args --add --dangerously-skip-permissions

# Per-run only (doesn't save to config, highest priority)
claude-iterate run my-task --dangerously-skip-permissions
```

⚠️ **WARNING:** The `--dangerously-skip-permissions` flag disables permission prompts for Claude Code. This allows Claude to read/write files and execute commands without confirmation. Anthropic recommends using this flag "only in a container without internet access" to minimize security risks.

Learn more about the security implications:
https://docs.anthropic.com/en/docs/agents/agent-security-model#disabling-permission-prompts

### Notifications

claude-iterate can send notifications for long-running tasks via HTTP POST (compatible with ntfy.sh and similar services).

#### Setup

Configure notifications during workspace initialization:

```bash
# Set notification URL
claude-iterate init my-task --notify-url https://ntfy.sh/my-topic

# Configure specific events (default: completion,error)
claude-iterate init my-task \
  --notify-url https://ntfy.sh/my-topic \
  --notify-events all
```

Or in your configuration file (`.claude-iterate.json` or `~/.config/claude-iterate/config.json`):

```json
{
  "notifyUrl": "https://ntfy.sh/my-topic",
  "notifyEvents": ["completion", "error"]
}
```

#### Events

Available notification events:

- `setup_complete` - After guided setup finishes
- `execution_start` - When execution loop begins
- `iteration_milestone` - Every 10 iterations
- `completion` - Task completes successfully
- `error` - Execution encounters error
- `all` - All events above

**Default events:** `completion` and `error` (if no events specified)

#### Example with ntfy.sh

ntfy.sh is a free notification service that works great with claude-iterate:

1. Choose a unique topic: `https://ntfy.sh/my-unique-topic-12345`
2. Subscribe on your phone/desktop: [ntfy.sh app](https://ntfy.sh/)
3. Use in claude-iterate:

```bash
# Initialize with notifications
claude-iterate init long-task \
  --notify-url https://ntfy.sh/my-unique-topic-12345 \
  --notify-events all

# Run and receive notifications
claude-iterate run long-task
```

You'll receive push notifications as the task progresses!

#### Notification Format

Notifications include:
- **Title**: Event type (e.g., "Task Complete", "Execution Error")
- **Message**: Workspace name, iteration count, status details
- **Priority**: `high` for completion, `urgent` for errors, `default` otherwise
- **Tags**: `claude-iterate` plus event-specific tags

## Directory Structure

### Global Installation Model

```
# Project (Current Working Directory)
./my-project/
├── .claude-iterate.json       # Project config (optional)
└── claude-iterate/            # Project data
    ├── workspaces/            # Active workspaces (git hook protected)
    │   └── my-task/
    │       ├── TODO.md
    │       ├── INSTRUCTIONS.md
    │       ├── .metadata.json
    │       └── working/
    ├── templates/             # Project templates (committed)
    │   └── page-generator/
    │       ├── INSTRUCTIONS.md
    │       ├── .template.json
    │       └── README.md
    └── archive/               # Completed work (optional)

# Global (User Home)
~/.config/claude-iterate/
├── config.json                # User defaults
└── templates/                 # Shared templates
```

### Git Hook Protection

**Important:** Workspaces are NOT .gitignored (for AI agent compatibility). Instead, they're protected by a pre-commit hook.

The hook blocks commits of:
- `scratch/` (legacy)
- `claude-iterate/workspaces/` (new)

**Setup:**
```bash
# In your project root
git config core.hooksPath .githooks

# Or copy manually
cp .githooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Bypass (if needed):**
```bash
git commit --no-verify
```

## Configuration

### Project Configuration

Create `.claude-iterate.json` in your project root:

```json
{
  "workspacesDir": "./claude-iterate/workspaces",
  "templatesDir": "./claude-iterate/templates",
  "archiveDir": "./claude-iterate/archive",
  "defaultMaxIterations": 50,
  "defaultDelay": 2,
  "completionMarkers": ["Remaining: 0", "**Remaining**: 0", "TASK COMPLETE", "✅ TASK COMPLETE"],
  "notifyUrl": "https://ntfy.sh/my-project-topic",
  "notifyEvents": ["completion", "error"]
}
```

### User Configuration

Create `~/.config/claude-iterate/config.json`:

```json
{
  "globalTemplatesDir": "~/.config/claude-iterate/templates",
  "defaultMaxIterations": 50,
  "defaultDelay": 2,
  "completionMarkers": ["Remaining: 0", "**Remaining**: 0", "TASK COMPLETE", "✅ TASK COMPLETE"],
  "notifyUrl": "https://ntfy.sh/my-personal-topic",
  "claude": {
    "command": "claude",
    "args": []
  },
  "colors": true,
  "verbose": false
}
```

**Note:** The `claude.args` array is empty by default. This is the **safe** default where Claude Code will prompt for permissions. To enable autonomous iteration without prompts, you can add `--dangerously-skip-permissions` using the `config` command:

```bash
claude-iterate config --global claude.args --add --dangerously-skip-permissions
```

See the "Configuration Management" section for details on the security implications.

### Global Options

Available on all commands:

```bash
--workspaces-dir <path>    # Override workspaces directory
--templates-dir <path>     # Override templates directory
--archive-dir <path>       # Override archive directory
--no-colors                # Disable colored output
--verbose                  # Verbose output
```

## Examples

### Example 1: Generate Frontend Pages

```bash
# Initialize workspace
claude-iterate init frontend-pages

# Set up instructions
claude-iterate setup frontend-pages
# (Interactive session: describe task of generating React pages)

# Validate
claude-iterate validate frontend-pages

# Run
claude-iterate run frontend-pages

# Save as template for future use
claude-iterate template save frontend-pages page-generator

# Use template for next pages
claude-iterate template use page-generator login-pages
claude-iterate run login-pages
```

### Example 2: API Migration

```bash
# Create from template
claude-iterate template use api-migration user-service-migration

# Customize if needed
claude-iterate edit user-service-migration

# Run with higher iteration limit
claude-iterate run user-service-migration --max-iterations 100
```

### Example 3: Monthly Reports

```bash
# Create template once
claude-iterate init monthly-report
claude-iterate setup monthly-report
claude-iterate template save monthly-report monthly-report --global

# Each month
claude-iterate template use monthly-report report-october-2025
claude-iterate run report-october-2025
```

### Example 4: Iterative Mode for Complex Refactoring

```bash
# Initialize with iterative mode
claude-iterate init code-refactor --mode iterative

# Set up instructions (will use iterative-friendly prompts)
claude-iterate setup code-refactor

# Run - Claude will complete as many TODO items as possible per iteration
claude-iterate run code-refactor
```

**Iterative mode is ideal for:**
- Large refactoring tasks
- Multi-file migrations
- Complex feature implementations
- Tasks requiring sustained autonomous work

## Development

### Setup

```bash
git clone <repository>
cd claude-iterate
npm install
```

### Build

```bash
npm run build       # Compile TypeScript
npm run dev         # Watch mode
```

### Testing

```bash
npm test            # Run all tests
npm run test:watch  # Watch mode
npm run test:coverage # Coverage report
```

### Linting

```bash
npm run lint        # Check linting
npm run format      # Format code
```

## Architecture

```
┌─────────────┐
│  CLI Entry  │ (Commander.js)
└──────┬──────┘
       │
       ├─────► Commands (init, setup, run, list, config, template, archive)
       │         │
       │         └─────► Core Services
       │                  │
       │                  ├─► Workspace Manager
       │                  ├─► Metadata Manager
       │                  ├─► Completion Detector
       │                  ├─► Template Manager
       │                  ├─► Archive Manager
       │                  └─► Config Manager
       │
       └─────► Utils (Logger, FS, Paths, Errors)
```

## Project Structure

```
claude-iterate/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── cli.ts                      # CLI setup (Commander)
│   ├── commands/                   # Command implementations
│   │   ├── init.ts
│   │   ├── setup.ts
│   │   ├── edit.ts
│   │   ├── validate.ts
│   │   ├── run.ts
│   │   ├── list.ts
│   │   ├── show.ts
│   │   ├── clean.ts
│   │   ├── reset.ts
│   │   ├── config.ts
│   │   ├── template.ts
│   │   └── archive.ts
│   ├── core/                       # Core business logic
│   │   ├── workspace.ts
│   │   ├── metadata.ts
│   │   ├── completion.ts
│   │   ├── template-manager.ts
│   │   ├── archive-manager.ts
│   │   └── config-manager.ts
│   ├── services/
│   │   └── claude-client.ts        # Claude CLI wrapper
│   ├── utils/
│   │   ├── logger.ts               # Colored console output
│   │   ├── fs.ts                   # File system helpers
│   │   ├── paths.ts                # Path resolution
│   │   └── errors.ts               # Custom error classes
│   ├── types/
│   │   ├── metadata.ts             # Metadata schema (Zod)
│   │   ├── config.ts               # Config schema
│   │   ├── template.ts             # Template schema
│   │   ├── archive.ts              # Archive schema
│   │   └── mode.ts                 # Execution mode types
│   ├── utils/
│   │   └── template.ts             # Template loader with token replacement
│   └── templates/
│       ├── modes/
│       │   ├── base-mode.ts        # Mode strategy interface
│       │   ├── loop-mode.ts        # Loop mode strategy
│       │   ├── iterative-mode.ts   # Iterative mode strategy
│       │   └── mode-factory.ts     # Mode factory
│       ├── prompts/
│       │   ├── workspace-system.md # Workspace system prompt
│       │   ├── loop/               # Loop mode templates (6 files)
│       │   └── iterative/          # Iterative mode templates (6 files)
│       ├── system-prompt.ts        # Iteration prompts
│       └── validation-criteria.ts  # Validation criteria
├── tests/
│   ├── setup.ts                    # Global test setup
│   ├── mocks/
│   │   └── claude-client.mock.ts   # Mock Claude client
│   └── unit/                       # Unit tests (133 tests)
│       ├── metadata.test.ts
│       ├── workspace.test.ts
│       ├── completion.test.ts
│       ├── template-manager.test.ts
│       ├── archive-manager.test.ts
│       ├── mode-factory.test.ts
│       ├── loop-mode.test.ts
│       └── iterative-mode.test.ts
└── dist/                           # Compiled output
```

## Tech Stack

- **Language:** TypeScript 5.8+ (strict mode)
- **CLI Framework:** Commander.js
- **Validation:** Zod schemas
- **Testing:** Vitest with mocked Claude calls
- **Build:** Native TypeScript compiler
- **Runtime:** Node.js 18+

## Requirements

- Node.js >= 18.0.0
- Claude CLI installed and in PATH
- Git (for hook-based workspace protection)

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Status

✅ **Complete and tested:**
- Core implementation (Workspace, Metadata, Completion, Template, Archive, Config)
- All CLI commands (init, setup, edit, validate, run, list, show, clean, reset, config, template, archive)
- Execution modes (loop and iterative) with strategy pattern
- Template-based prompt system with token replacement
- Configuration management with git-style CLI interface
- Comprehensive test suite (131 passing tests)
- TypeScript build and ESLint checks

## Support

- Report issues: [GitHub Issues](https://github.com/your-repo/claude-iterate/issues)
- Documentation: See this README and inline code documentation
- Examples: See `examples/` directory (coming soon)
