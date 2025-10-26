# claude-iterate

Automate multi-step tasks with Claude Code through managed workspaces, reusable templates, and autonomous iteration loops.

[![Tests](https://img.shields.io/badge/tests-228%20passing-brightgreen)](https://github.com/radleta/claude-iterate)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## Features

- 🎯 **Workspace Management** - Isolated environments for complex tasks
- 🔄 **Autonomous Execution** - Iteration loops that run until completion
- 🎭 **Dual Modes** - Loop (incremental) or iterative (autonomous) execution
- 🛡️ **Stagnation Detection** - Automatic stop after N consecutive no-work iterations (iterative mode)
- 📦 **Templates** - Reusable patterns for common workflows
- ⚙️ **Git-Style Config** - Layered configuration (project, user, runtime)
- 📁 **Archives** - Preserve and restore completed work
- 🔔 **Notifications** - HTTP notifications for long-running tasks (ntfy.sh compatible)

## Quick Start

```bash
# Install globally
npm install -g claude-iterate

# Create a workspace
claude-iterate init my-feature

# Set up instructions interactively
claude-iterate setup my-feature

# Run the autonomous loop
claude-iterate run my-feature
```

Claude will read your instructions, track progress in `TODO.md`, and iterate until complete.

## Installation

### Global (Recommended)

```bash
npm install -g claude-iterate
```

### Local

```bash
npm install claude-iterate
npx claude-iterate init my-task
```

### Requirements

- Node.js >= 18.0.0
- Claude CLI installed and in PATH

## Core Concepts

### Workspaces

Isolated task environments with:

- `INSTRUCTIONS.md` - What Claude should do
- `TODO.md` - Progress tracking (human-readable)
- `.status.json` - Completion status (machine-readable)
- `.metadata.json` - Iteration state
- `iterate-*.log` - Timestamped execution logs
- `working/` - Scratch space

#### Status Tracking

Claude tracks progress in two complementary files:

**TODO.md** - Human-readable task list and notes for Claude's working context

**.status.json** - Machine-readable progress signals for reliable completion detection:

```json
{
  "complete": false,
  "progress": {
    "completed": 35,
    "total": 60
  },
  "summary": "Migrated 35/60 API endpoints",
  "lastUpdated": "2025-10-16T14:30:00Z"
}
```

Claude updates `.status.json` each iteration. When `complete: true`, the task is finished. This prevents false positives from completion markers appearing in instructions or examples.

### Execution Modes

**Loop Mode (Default)**

- Incremental progress with explicit step tracking
- Complete one item per iteration
- Best for tasks with discrete steps
- Default max: 50 iterations

**Iterative Mode**

- Autonomous work sessions completing multiple items
- Complete as many items as possible per iteration
- Best for complex tasks requiring sustained focus
- Default max: 20 iterations (does more per iteration)
- **Stagnation detection**: Automatically stops after N consecutive iterations with no work (default: 2, prevents infinite loops)

```bash
# Use iterative mode
claude-iterate init my-task --mode iterative

# Customize stagnation threshold
claude-iterate init my-task --mode iterative --stagnation-threshold 5

# Disable stagnation detection (trust Claude completely)
claude-iterate init my-task --mode iterative --stagnation-threshold 0
```

### Templates

Save successful workflows as reusable templates:

```bash
# Save workspace as template (uses workspace name)
claude-iterate template save my-task

# Save with custom template name
claude-iterate template save my-task api-migration

# Save to global templates
claude-iterate template save my-task --global

# Update existing template
claude-iterate template save my-task --force

# Use a template
claude-iterate template use api-migration new-service
```

Templates can be project-specific (`./claude-iterate/templates/`) or global (`~/.config/claude-iterate/templates/`).

### Configuration

Layered configuration with priority: CLI flags → Project config → User config → Defaults

```bash
# Project: .claude-iterate.json
# User: ~/.config/claude-iterate/config.json

# View configuration
claude-iterate config --list

# Set values
claude-iterate config defaultMaxIterations 100
claude-iterate config --global notifyUrl https://ntfy.sh/my-topic
```

## Commands Reference

### Workspace Operations

| Command                | Description                     |
| ---------------------- | ------------------------------- |
| `init <name>`          | Initialize a new workspace      |
| `list`                 | List all workspaces with status |
| `show <name>`          | Show workspace details          |
| `clean <name> --force` | Archive and delete workspace    |
| `reset <name>`         | Reset iteration counts          |

### Instructions

| Command           | Description                       |
| ----------------- | --------------------------------- |
| `setup <name>`    | Create instructions interactively |
| `edit <name>`     | Modify instructions interactively |
| `validate <name>` | Validate instruction quality      |

### Verification

| Command         | Description                      |
| --------------- | -------------------------------- |
| `verify <name>` | Verify workspace work completion |

**Options:**

- `--depth <level>` - Verification depth: quick, standard, deep
- `--report-path <path>` - Custom report path
- `--json` - Output JSON results
- `--show-report` - Show full report in console
- `-v, --verbose` - Show full Claude output
- `-q, --quiet` - Silent execution, errors only
- `--dangerously-skip-permissions` - Skip permission prompts (runtime only)

**Depth Levels:**

- `quick` (~500-1K tokens): File existence and basic count verification
- `standard` (~2-4K tokens): Balanced deliverable review with quality checks (default)
- `deep` (~5-10K tokens): Comprehensive code quality, edge cases, and documentation analysis

**Exit codes:** 0 = verified complete, 1 = incomplete/needs review

**Usage Examples:**

```bash
# Basic verification (may prompt for permissions)
claude-iterate verify my-workspace

# Autonomous verification (no prompts)
claude-iterate verify my-workspace --dangerously-skip-permissions

# Deep verification with verbose output
claude-iterate verify my-workspace --depth deep --verbose --dangerously-skip-permissions

# Quick verification with custom report location
claude-iterate verify my-workspace --depth quick --report-path ./reports/verify.md
```

**Note:** Verification requires Claude CLI to read workspace files and write reports. For autonomous operation without permission prompts, use `--dangerously-skip-permissions` or configure `claude.args` in your project/user config. See [Security: Permission Prompts](#security-permission-prompts) for details.

### Execution

| Command      | Description                       |
| ------------ | --------------------------------- |
| `run <name>` | Run the autonomous iteration loop |

**Options:**

- `-m, --max-iterations <n>` - Override iteration limit
- `-d, --delay <seconds>` - Delay between iterations
- `--no-delay` - Skip delays
- `--stagnation-threshold <n>` - Stop after N consecutive no-work iterations (iterative mode only, 0=never)
- `-v, --verbose` - Show full Claude output (equivalent to --output verbose)
- `-q, --quiet` - Silent execution, errors only (equivalent to --output quiet)
- `--output <level>` - Output level: quiet, progress, verbose
- `--dangerously-skip-permissions` - Disable permission prompts (see security note)

### Templates

| Command                            | Description                    |
| ---------------------------------- | ------------------------------ |
| `template save <workspace> [name]` | Save workspace as template     |
| `template use <name> <workspace>`  | Create workspace from template |
| `template list`                    | List available templates       |
| `template show <name>`             | Show template details          |

**Options for `save`:**

- `[name]` - Template name (defaults to workspace name if omitted)
- `-d, --description <text>` - Template description
- `-t, --tags <tags>` - Comma-separated tags
- `-g, --global` - Save to global templates
- `-f, --force` - Overwrite existing template

### Archives

| Command                            | Description          |
| ---------------------------------- | -------------------- |
| `archive save <name>`              | Archive a workspace  |
| `archive list`                     | List all archives    |
| `archive restore <archive> [name]` | Restore an archive   |
| `archive show <name>`              | Show archive details |
| `archive delete <name> --force`    | Delete an archive    |

### Configuration

| Command                         | Description                |
| ------------------------------- | -------------------------- |
| `config [key] [value]`          | Get or set configuration   |
| `config --list`                 | List all configuration     |
| `config --keys`                 | Show available config keys |
| `config --global [key] [value]` | Manage user config         |

**Array operations:**

```bash
claude-iterate config claude.args --add --dangerously-skip-permissions
claude-iterate config claude.args --remove --dangerously-skip-permissions
claude-iterate config claude.args --unset
```

### Discovering Configuration Keys

To see all available configuration keys with descriptions, types, defaults, and current values:

```bash
# Show project config keys
claude-iterate config --keys

# Show user config keys
claude-iterate config --keys --global

# Show workspace config keys
claude-iterate config --keys --workspace my-task

# Get JSON output for scripting
claude-iterate config --keys --json
```

Output includes:

- Key name (with dot notation)
- Type (string, number, boolean, array, enum, object)
- Default value
- **Current effective value and source** (user, project, or workspace) - color-coded for easy identification
- Description and examples
- Related keys and notes

The `--keys` command shows the current effective value for each setting along with its source, making it easy to understand which configuration is actually being used and where it comes from in the hierarchy (User → Project → Workspace).

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
  "defaultStagnationThreshold": 2,
  "outputLevel": "progress",
  "notifyUrl": "https://ntfy.sh/my-project",
  "notifyEvents": ["all"],
  "notification": {
    "statusWatch": {
      "enabled": true,
      "debounceMs": 2000,
      "notifyOnlyMeaningful": true
    }
  },
  "verification": {
    "autoVerify": true,
    "resumeOnFail": true,
    "maxAttempts": 2,
    "reportFilename": "verification-report.md",
    "depth": "standard",
    "notifyOnVerification": true
  }
}
```

### User Configuration

Create `~/.config/claude-iterate/config.json`:

```json
{
  "globalTemplatesDir": "~/.config/claude-iterate/templates",
  "defaultMaxIterations": 50,
  "defaultDelay": 2,
  "defaultStagnationThreshold": 2,
  "outputLevel": "progress",
  "claude": {
    "command": "claude",
    "args": []
  },
  "colors": true,
  "verification": {
    "autoVerify": true,
    "resumeOnFail": true,
    "maxAttempts": 2,
    "depth": "standard"
  }
}
```

### Per-Workspace Configuration

Configure workspace-specific settings that override project and user defaults. This allows different workspaces to have different verification depths, output levels, or Claude settings.

**Priority order**: CLI flags > Workspace config > Project config > User config > Defaults

```bash
# Set verification depth for a specific workspace
claude-iterate config --workspace my-task verification.depth deep

# Set output level for a workspace
claude-iterate config --workspace my-task outputLevel verbose

# Set Claude args for a workspace
claude-iterate config --workspace my-task claude.args --add --dangerously-skip-permissions

# View workspace config
claude-iterate config --workspace my-task --list

# Remove override (fall back to project/user config)
claude-iterate config --workspace my-task verification.depth --unset
```

**Available workspace config settings**:

- `verification.depth` - Verification depth (quick, standard, deep) - default: standard
- `verification.autoVerify` - Auto-verify on completion (default: true, ~2-4K tokens per verification)
- `verification.resumeOnFail` - Resume iterations on failed verification (default: true)
- `verification.maxAttempts` - Max verification attempts (1-10) - default: 2
- `verification.reportFilename` - Custom report filename
- `verification.notifyOnVerification` - Send verification notifications (true/false)
- `outputLevel` - Console output level (quiet, progress, verbose)
- `claude.command` - Override Claude CLI command
- `claude.args` - Override Claude CLI arguments (use --add/--remove for arrays)

**Example use cases**:

```bash
# Critical task - use deep verification
claude-iterate init api-migration
claude-iterate config --workspace api-migration verification.depth deep

# Debug task - verbose output
claude-iterate init debug-task
claude-iterate config --workspace debug-task outputLevel verbose

# Simple task - quick verification
claude-iterate init docs-update
claude-iterate config --workspace docs-update verification.depth quick

# Now run without CLI flags (uses workspace config)
claude-iterate verify api-migration  # Uses deep
claude-iterate run debug-task        # Uses verbose output
claude-iterate verify docs-update    # Uses quick
```

Workspace configuration is stored in `.metadata.json` under the `config` field and can be copied via templates:

```bash
# Create template with workspace config
claude-iterate config --workspace my-task verification.depth deep
claude-iterate template save my-task my-template

# New workspaces from template inherit config
claude-iterate template use my-template new-task
```

### Security: Permission Prompts

By default, `claude.args` is empty, meaning Claude Code will prompt for permissions during execution. This is the **safe default**.

To enable autonomous iteration without interruptions:

```bash
# Per-project (recommended)
claude-iterate config claude.args --add --dangerously-skip-permissions

# Globally (all projects)
claude-iterate config --global claude.args --add --dangerously-skip-permissions

# Per-run only (not saved)
claude-iterate run my-task --dangerously-skip-permissions
```

⚠️ **WARNING:** The `--dangerously-skip-permissions` flag allows Claude to read/write files and execute commands without confirmation. Anthropic recommends using this "only in a container without internet access." [Learn more](https://docs.anthropic.com/en/docs/agents/agent-security-model#disabling-permission-prompts)

### Notifications

Send HTTP POST notifications for long-running tasks (compatible with ntfy.sh):

```bash
# Configure during init
claude-iterate init my-task \
  --notify-url https://ntfy.sh/my-topic \
  --notify-events all

# Or in config
claude-iterate config notifyUrl https://ntfy.sh/my-topic
```

**Available events:** `setup_complete`, `execution_start`, `iteration`, `iteration_milestone`, `completion`, `error`, `status_update`, `all`

**Default events:** `all` (all event types)

**Status Update Events:** The `status_update` event is triggered automatically when Claude updates the `.status.json` file during execution. This provides real-time progress notifications without polling. The watcher uses 2-second debouncing and filters out timestamp-only changes to prevent notification spam. Status updates include progress deltas (e.g., "35/60 items (+5)"), summary text, and completion status.

## Viewing Claude Output

Claude-iterate provides three output levels for console feedback, plus comprehensive log files:

### Output Levels

**Progress (Default)** - Shows iteration progress and completion status without full output:

```bash
claude-iterate run my-task

# Output:
# Starting claude-iterate run for workspace: my-task
# Mode: loop | Max iterations: 50 | Delay: 2s
#
# Running iteration 1...
# ✓ Iteration 1 complete (4 items remaining)
#
# Running iteration 2...
# ✓ Iteration 2 complete (3 items remaining)
# ...
# ✓ Task completed successfully after 5 iterations
```

**Verbose** - Shows full Claude output with real-time tool visibility:

```bash
claude-iterate run my-task --verbose
# or
claude-iterate run my-task --output verbose
```

Verbose mode displays Claude's tool usage as it happens:

```bash
Running iteration 1...

🔧 Using Read tool
   File: /workspace/repo/TODO.md
✓ File read successfully (45 lines)

🔧 Using Edit tool
   File: TODO.md
   Replacing: "- [ ] Task 1"
✓ Edit successful

🔧 Using Write tool
   File: /workspace/repo/.status.json
✓ File created successfully

📝 Claude's response:
✅ Iteration 1 Complete

I've successfully completed one task as instructed:

**Changes made:**
- ✓ Checked Task 1 in TODO.md
- ✓ Updated .status.json

✓ Iteration 1 complete (4 items remaining)
```

**Tool visibility features:**

- 🔧 Tool name displayed (Read, Edit, Write, Bash, Grep, etc.)
- 📄 File paths shown for file operations
- 💻 Commands shown for Bash tool
- 🔍 Patterns shown for Grep tool
- ✓/❌ Success/error indicators for tool results
- 📝 Claude's text responses and reasoning

Helpful for:

- Debugging issues - See which tool failed and why
- Monitoring Claude's reasoning - Watch the step-by-step process
- Understanding detailed progress - Know exactly what files are being modified
- Building trust - Full transparency into Claude's actions

**Quiet** - Silent execution, only errors/warnings:

```bash
claude-iterate run my-task --quiet
# or
claude-iterate run my-task --output quiet
```

Ideal for:

- CI/CD pipelines
- Background tasks
- Minimal logging

You can also configure the default output level in your config:

```json
{
  "outputLevel": "progress"
}
```

### Log Files

Every run automatically creates a timestamped log file in the workspace directory:

```bash
# List all log files for a workspace (sorted by time)
ls -lt claude-iterate/workspaces/my-task/iterate-*.log

# View the latest log file
ls -t claude-iterate/workspaces/my-task/iterate-*.log | head -1 | xargs cat

# Search for specific content across all logs
grep "error" claude-iterate/workspaces/my-task/iterate-*.log
```

**Log file naming:** `iterate-YYYYMMDD-HHMMSS.log` (e.g., `iterate-20251015-142345.log`)

Each log file contains:

- Run metadata (workspace, mode, max iterations) - logged once
- Instructions and system prompts - logged once at start for efficiency
- Iteration timestamps and Claude output
- Tool usage events (when running with --verbose)
- Completion status and remaining counts

**Note:** Log files use a deduplicated format that logs static content (instructions, system prompts) once at the start instead of repeating them for each iteration. This reduces log file size by ~60% while maintaining full auditability. Log files are created regardless of the output level. Tool events are logged when using verbose mode for better debugging and auditability.

## Examples

### Basic Workflow

```bash
# 1. Initialize workspace
claude-iterate init frontend-pages

# 2. Create instructions interactively
claude-iterate setup frontend-pages

# 3. Validate instructions
claude-iterate validate frontend-pages

# 4. Run
claude-iterate run frontend-pages

# 5. Verify completion
claude-iterate verify frontend-pages

# 6. Save as template for reuse
claude-iterate template save frontend-pages
```

### Verification Workflow

```bash
# Run a task
claude-iterate run api-migration

# Task claims completion - verify it's actually done
claude-iterate verify api-migration

# If verification passes:
# ✅ VERIFICATION PASSED

# If verification fails:
# ❌ VERIFICATION FAILED
# Issues found: 5
# Full report: claude-iterate/workspaces/api-migration/verification-report.md

# Use different depth levels
claude-iterate verify api-migration --depth quick    # Fast check
claude-iterate verify api-migration --depth deep     # Thorough review

# Get JSON output for automation
claude-iterate verify api-migration --json
```

### Using Templates

```bash
# Save workspace as template (defaults to workspace name)
claude-iterate template save frontend-pages

# Save with custom name
claude-iterate template save frontend-pages page-generator

# Update existing template
claude-iterate template save frontend-pages --force

# Use existing template
claude-iterate template use page-generator user-service

# Customize if needed
claude-iterate edit user-service

# Run with custom settings
claude-iterate run user-service --max-iterations 100 --delay 5
```

### Iterative Mode for Large Tasks

```bash
# Initialize with iterative mode
claude-iterate init refactor-codebase --mode iterative

# Set up instructions
claude-iterate setup refactor-codebase

# Run - Claude completes as many items as possible per iteration
claude-iterate run refactor-codebase
```

### Monthly Reports

```bash
# Create global template once
claude-iterate init monthly-report
claude-iterate setup monthly-report
claude-iterate template save monthly-report monthly-report --global

# Use each month
claude-iterate template use monthly-report report-january-2025
claude-iterate run report-january-2025
```

## Directory Structure

```
# Project
./my-project/
├── .claude-iterate.json       # Optional project config
└── claude-iterate/
    ├── workspaces/            # Active workspaces
    │   └── my-task/
    │       ├── INSTRUCTIONS.md
    │       ├── TODO.md
    │       ├── .status.json         # Machine-readable completion status
    │       ├── .metadata.json
    │       ├── iterate-20251015-142345.log  # Run logs (timestamped)
    │       ├── iterate-20251015-153021.log
    │       └── working/
    ├── templates/             # Project templates
    └── archive/               # Completed workspaces

# User home
~/.config/claude-iterate/
├── config.json                # User defaults
└── templates/                 # Shared templates
```

### Git Integration

Workspaces are **not** .gitignored for AI agent compatibility. Use the pre-commit hook to prevent accidental commits:

```bash
# Setup hook
git config core.hooksPath .githooks

# Or copy manually
cp .githooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

The hook blocks commits of `claude-iterate/workspaces/` and `scratch/` directories.

## Documentation

- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development guide
- **[CHANGELOG.md](CHANGELOG.md)** - Version history
- **[GitHub Issues](https://github.com/radleta/claude-iterate/issues)** - Report bugs or request features
- **[GitHub Discussions](https://github.com/radleta/claude-iterate/discussions)** - Ask questions

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development setup
- Code quality guidelines
- Testing requirements
- Commit conventions
- Pull request process

Quick start for contributors:

```bash
git clone https://github.com/radleta/claude-iterate.git
cd claude-iterate
npm install
npm run build
npm test
npm run validate  # Run all checks
```

## License

[MIT](LICENSE) © 2025 Richard Adleta

## Acknowledgments

Built with TypeScript, Commander.js, and Zod. Tested with Vitest (228 passing tests).

Requires [Claude CLI](https://docs.anthropic.com/en/docs/claude-code) by Anthropic.
