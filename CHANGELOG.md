# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Breaking Changes

- **Iterative Mode Completion Detection**: Iterative mode now uses completion markers instead of checkbox counting
  - Previously: Detected completion by counting unchecked (`- [ ]`) vs checked (`- [x]`) items
  - Now: Uses same marker-based detection as loop mode (searches for marker strings in TODO.md)
  - **Migration**: Add a completion marker (e.g., `TASK COMPLETE` or `Remaining: 0`) to iterative workspace TODO.md files
  - **Reason**: Simplifies completion logic, unifies both modes, allows custom completion criteria
  - This affects existing iterative mode workspaces - they will need explicit completion markers to complete

### Added

- **File Logging**: Each run now creates a timestamped log file (e.g., `iterate-20251015-142345.log`)
  - All Claude output captured to log files regardless of verbose setting
  - Structured format with iteration numbers, timestamps, and full responses
  - Easy to review specific runs with timestamped filenames
- **Verbose Output**: `--verbose` flag now shows Claude's full output in real-time during iterations
  - Streams Claude responses to console as they're generated
  - File logging continues to work alongside console output
  - Helpful for debugging and monitoring long-running tasks
- **Smoke Test Templates**: Two templates for testing execution modes
  - `test-loop-mode`: Tests loop mode with "Remaining: N" countdown (5→4→3→2→1→0)
  - `test-iterative-mode`: Tests iterative mode with "COUNT: N" count-up (0→1→2→3→4→5)
  - Information asymmetry design: Claude doesn't know when task completes
  - Forces multiple iterations for proper testing
  - See `claude-iterate/templates/README.md` for usage
- **Developer Utility Scripts**:
  - `scripts/analyze-iterations.sh <workspace>`: Analyze iteration logs for patterns
    - Shows remaining count progression, checkbox changes, iteration markers
    - Helpful for debugging completion detection
  - `scripts/verify-example.sh <workspace> <mode>`: Verify workspace completion
    - Mode-specific checks (markers for loop, checkboxes for old behavior)
    - Validates metadata status, working directory content
    - Warnings for insufficient iterations (may indicate batching)
- **Template README**: Documentation for smoke test templates at `claude-iterate/templates/README.md`
  - Explains purpose and usage of both test templates
  - Documents information asymmetry design principle
  - Includes expected iteration counts and test instructions

### Changed

- **Log File Format**: Workspace log files now timestamped per run instead of single append-only file
  - Format: `iterate-YYYYMMDD-HHMMSS.log` (e.g., `iterate-20251015-142345.log`)
  - Makes it easy to identify and review specific execution runs
  - No manual log rotation needed - each run creates its own file
- **Unified Completion Detection**: Both loop and iterative modes now use the same marker-based completion detection
  - Simplified internal logic - single code path for both modes
  - Custom completion markers work in both modes
  - `getRemainingCount()` unified - both modes parse "Remaining: N" format
  - Removed mode-specific checkbox counting logic
- **Template Configuration Preservation**: Templates now save and restore full workspace configuration
  - Saved: `mode`, `maxIterations`, `delay`, `completionMarkers`
  - Workspaces created from templates inherit original execution settings
  - Templates are now true snapshots of working configurations
  - Makes templates more powerful and reusable
- **Enhanced Prompt Templates**: Restructured all prompt templates with XML-style tags for better Claude comprehension
  - Added `<role>`, `<task>`, `<critical_principle>`, `<approach>` structure
  - **Critical Principle**: Instructions describe WHAT (the task), NOT HOW (system mechanics)
  - Removed references to "work sessions", "iteration loops", "system architecture" from user instructions
  - Better separation between task description and system implementation
  - Improved instruction quality and clarity
- **Instruction Quality Guidance**: Setup and edit prompts now enforce WHAT vs HOW principle
  - Users create task-focused instructions without system details
  - Claude removes iteration mechanics from instructions automatically
  - Results in cleaner, more maintainable task descriptions

### Fixed

- **Completion Logic Simplification**: Removed redundant mode-specific completion detection code
  - Single unified implementation reduces bugs
  - Easier to maintain and extend
  - Consistent behavior across modes

### Removed

- **Empty Placeholder Logs**: Removed creation of empty `setup.log` and `iterate.log` files
  - These were never populated and served no purpose
  - Replaced with timestamped logs that contain actual execution history
- **Mode-Specific Completion Logic**: Removed `getRemainingCountIterative()` method
  - No longer needed with unified completion detection
  - Reduces code complexity
- **Checkbox Counting for Iterative Mode**: Removed checkbox-based completion detection
  - Replaced with marker-based detection
  - More flexible and consistent

## [1.0.1] - 2025-10-14

### Fixed
- **Notification System**: Fixed critical bugs preventing notifications from working properly
  - Fixed stale metadata during iterations: metadata now refreshes after each iteration
  - Fixed missing config fallback: global `notifyUrl` and `notifyEvents` now properly fall back from config
  - Notifications now use fresh metadata ensuring settings changes take effect immediately

### Changed
- **Notification Defaults**: Per-iteration notifications now enabled by default for better visibility
  - Default events changed from `[completion, error]` to `[iteration, completion, error]`
  - Users receive real-time progress updates during long-running tasks
  - Can opt-out with: `config notifyEvents completion,error`

### Added
- **Iteration Notifications**: New `iteration` event type for per-iteration progress updates
  - Sends notification after each iteration with current progress
  - Includes iteration count, remaining items, and status
  - Enabled by default (can be disabled per-workspace or globally)

---

Initial release of claude-iterate - a professional CLI tool for managing automated task iterations with Claude Code.

### Core Features

#### Workspace Management
- **Initialize Workspaces**: Create isolated task environments with `init` command
- **Workspace Operations**: List, show details, clean up, and reset workspaces
- **Metadata Tracking**: Automatic tracking of iterations, status, and timestamps
- **Working Directory**: Dedicated scratch space for task files

#### Instructions & Validation
- **Guided Setup**: Interactive instruction creation with Claude (`setup` command)
- **Instruction Editing**: Modify instructions interactively (`edit` command)
- **Validation**: Comprehensive validation against quality criteria (`validate` command)
  - Autonomous execution capability
  - State awareness (TODO.md handling)
  - Re-runnability (dynamic counting)
  - Error handling
  - Completion detection

#### Execution System
- **Autonomous Iteration**: Run tasks with automatic iteration loops (`run` command)
- **Completion Detection**: Automatic detection when tasks are complete
- **Configurable Limits**: Set max iterations and delay between runs
- **Progress Tracking**: Real-time iteration counts and status updates

#### Execution Modes
- **Loop Mode** (default): Incremental iterations with explicit progress tracking
  - Uses "Remaining: N" count tracking
  - Completes one step at a time per iteration
  - Default max iterations: 50
  - Best for tasks with explicit step-by-step progress
- **Iterative Mode**: Autonomous work sessions completing as much as possible
  - Uses checkbox format (- [ ] / - [x]) for TODO items
  - Completes multiple items per iteration
  - Default max iterations: 20
  - Best for complex multi-step tasks requiring sustained focus
- **Mode Configuration**: Set via `--mode` flag on `init` command
- **Strategy Pattern**: Extensible architecture for adding new modes

#### Template System
- **Save Templates**: Create reusable task patterns from successful workspaces
- **Use Templates**: Initialize new workspaces from templates
- **Template Scopes**: Project-level and global (user-level) templates
- **Template Management**: List, show details, and delete templates
- **Metadata**: Descriptions, tags, estimated iterations, and author info

#### Archive System
- **Archive Workspaces**: Preserve completed work with timestamped archives
- **Archive Management**: List, show, restore, and delete archives
- **Smart Archiving**: Automatic archiving before workspace deletion (optional)
- **Archive Restore**: Restore archived workspaces to continue work

#### Configuration Management
- **Git-Style Config**: Familiar `config` command interface
  - `config --list` - List all configuration
  - `config <key>` - Get specific value
  - `config <key> <value>` - Set value
  - `config <key> --add <value>` - Add to array
  - `config <key> --remove <value>` - Remove from array
  - `config <key> --unset` - Delete key
- **Dot Notation**: Access nested config keys (e.g., `claude.args`, `claude.command`)
- **Scope Levels**: Project (`.claude-iterate.json`) and global (`~/.config/claude-iterate/config.json`)
- **Layered Configuration**: CLI flags > Project config > User config > Built-in defaults

#### Completion Markers
- **Customizable Markers**: Define custom completion detection strings (loop mode)
- **Three-Tier Configuration**: Runtime flag > Workspace init > Config file > Defaults
- **Default Markers**: `Remaining: 0`, `**Remaining**: 0`, `TASK COMPLETE`, `✅ TASK COMPLETE`
- **Flexible Format**: Comma-separated marker strings

#### Notification System
- **HTTP Notifications**: Send notifications via HTTP POST (ntfy.sh compatible)
- **Event Types**:
  - `setup_complete` - After guided setup finishes
  - `execution_start` - When execution loop begins
  - `iteration` - After each iteration (NEW - enabled by default)
  - `iteration_milestone` - Every 10 iterations
  - `completion` - Task completes successfully
  - `error` - Execution encounters error
  - `all` - All events above
- **Default Events**: `iteration`, `completion`, `error` (real-time progress updates)
- **Flexible Configuration**: Configure per workspace or globally
- **Config Fallback**: Global notifyUrl/notifyEvents used when workspace has none
- **Priority Levels**: High priority for completion, urgent for errors

### Security Features

#### Safe Default Configuration
- **Permission Prompts**: Claude Code prompts for permissions by default
- **Empty Args**: `claude.args` defaults to `[]` (empty array)
- **Explicit Opt-In**: `--dangerously-skip-permissions` requires explicit configuration
- **Security Guidance**: `init` command displays permission model information
  - Explains safe default behavior
  - Shows configuration options (per-run, per-project, global)
  - Links to official Anthropic documentation
- **Configuration Visibility**: `list` and `show` commands display current security settings
- **Warnings**: Automatic warnings when dangerous flag is configured

#### Runtime Permission Override
- **Per-Run Flag**: `--dangerously-skip-permissions` flag on `run` command
- **Temporary Override**: Runtime-only, not saved to configuration
- **Highest Priority**: Overrides all other configuration levels
- **Security Warning**: Displays warning when used

### Technical Implementation

#### Architecture
- **TypeScript 5.8+**: Strict mode with full type safety
- **Commander.js**: Professional CLI framework
- **Zod Schemas**: Runtime validation for all configurations
- **Strategy Pattern**: Extensible mode system
- **Template-Based Prompts**: Markdown files with token replacement

#### Testing
- **147 Passing Tests**: Comprehensive test coverage
- **Mocked Claude Calls**: Fast, deterministic tests without real API calls
- **Vitest Framework**: Modern testing with great developer experience
- **Integration Tests**: Real process lifecycle testing
- **Notification Tests**: 16 integration tests for notification flow with mocked fetch

#### Code Quality
- **ESLint**: Strict linting rules enforced
- **TypeScript Compiler**: No type errors
- **Clean Architecture**: Separation of concerns (commands, core, services, utils)
- **Error Handling**: Custom error classes for clear error messages

#### Cross-Platform Support
- **Windows, macOS, Linux**: Full support on all platforms
- **Node.js 18+**: Modern JavaScript features
- **Path Handling**: Proper cross-platform path resolution
- **Process Management**: Clean child process lifecycle handling

#### Developer Experience
- **Build System**: Native TypeScript compiler
- **Watch Mode**: Development with hot reload
- **Debug Logging**: Verbose mode for troubleshooting
- **Colored Output**: Beautiful terminal UI (optional)

### Documentation

- **Comprehensive README**: Full documentation with examples
- **Inline Documentation**: JSDoc comments throughout codebase
- **Type Definitions**: Full TypeScript types for all public APIs
- **Example Workflows**: Common usage patterns documented
- **Security Documentation**: Links to official Anthropic guidance

### Infrastructure

- **Release Automation**: GitHub Actions CI/CD pipeline
- **Automated CHANGELOG**: Updates on version bump
- **Package Optimization**: Minimal package size with .npmignore
- **Git Hooks**: Pre-commit protection for workspace directories
- **npm Scripts**: Validation, release preparation, and size checking

### Commands Reference

All commands are fully implemented and tested:

- `init <name>` - Initialize a new workspace
- `setup <name>` - Create instructions interactively
- `edit <name>` - Edit instructions interactively
- `validate <name>` - Validate instructions non-interactively
- `run <name>` - Run the iteration loop
- `list` / `ls` - List all workspaces
- `show <name>` - Show detailed workspace information
- `clean <name>` - Archive and delete a workspace
- `reset <name>` - Reset iteration counts
- `config [key] [value]` - Get or set configuration values
- `template save <workspace> <name>` - Save workspace as template
- `template use <name> <workspace>` - Create workspace from template
- `template list` / `tpl ls` - List all templates
- `template show <name>` - Show template details
- `template delete <name>` - Delete a template
- `archive save <name>` - Archive a workspace
- `archive list` / `archive ls` - List all archives
- `archive restore <archive> [workspace]` - Restore an archive
- `archive show <name>` - Show archive details
- `archive delete <name>` - Delete an archive

---

## Version History

This is the initial release of claude-iterate.

---

**Note:** This project follows [Semantic Versioning](https://semver.org/). Future releases will be documented in this file following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

