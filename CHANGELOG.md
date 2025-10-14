# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Execution Modes

- **Mode System**: Two distinct execution modes for different workflows
  - **Loop Mode** (default): Incremental iterations with explicit loop awareness
    - Uses "Remaining: N" count tracking
    - Completes one step at a time per iteration
    - Default max iterations: 50
    - Best for tasks with explicit progress tracking
  - **Iterative Mode**: Autonomous work sessions completing as much as possible
    - Uses checkbox format (- [ ] / - [x]) for TODO items
    - Completes multiple TODO items per iteration
    - Default max iterations: 20 (fewer needed per iteration)
    - Best for complex multi-step tasks requiring sustained focus
- **Mode Configuration**:
  - `--mode <mode>` flag on `init` command
  - Mode stored in workspace `.metadata.json`
- **Strategy Pattern**: Extensible architecture for adding new modes
  - Mode-specific prompt generation
  - Mode-specific completion detection
  - Template-based prompts with token replacement
- **Template System**:
  - Prompts stored in markdown files with `{{token}}` replacement
  - Separate template directories for each mode
  - Easy to edit and add new modes
- **Mode-Aware Commands**:
  - Setup, edit, and validate use mode-specific prompts
  - Run command displays current mode
  - Show command displays workspace mode

#### Completion Markers Customization

- **Three-Tier Customization** (loop mode only):
  - Config file defaults (project: `.claude-iterate.json`, user: `~/.config/claude-iterate/config.json`)
  - Workspace-specific markers via `--completion-markers` flag on `init` command
  - Runtime overrides via `--completion-markers` flag on `run` command
- **Clear Priority Hierarchy**: Runtime CLI flag > Workspace init flag > Config file > Built-in defaults
- **Flexible Configuration**: Comma-separated marker strings (e.g., `"DONE,COMPLETE,Task finished"`)
- **Backward Compatible**: Default markers unchanged (`Remaining: 0`, `**Remaining**: 0`, `TASK COMPLETE`, `✅ TASK COMPLETE`)

#### Infrastructure

- Release automation with GitHub Actions CI/CD
- Automated CHANGELOG updates on version bump
- Package optimization with .npmignore
- New npm scripts for validation, release preparation, and size checking

### Changed

- **Prompt System**: Converted from hardcoded strings to async template loading
- **Completion Detection**: Now mode-aware (markers for loop, checkboxes for iterative)
- **Test Suite**: Expanded from 105 to 133 tests (+28 tests, 27% increase)
  - New tests for mode factory, loop mode strategy, iterative mode strategy
  - Updated tests for mode-aware completion and workspace
- **TypeScript Types**: Added `ExecutionMode` enum and `ModeDefinition` type
- **Workspace Instructions**: Instructions file name now hardcoded to `INSTRUCTIONS.md` (removed configurable `instructionsFile` field)

### Removed

#### Code Cleanup

- **Unused Enums**: Removed `WorkspaceStatus` and `NotifyEvent` enums from `src/types/metadata.ts` (never used, string literals used instead)
- **Singleton Logger Export**: Removed unused `logger` singleton export from `src/utils/logger.ts` (all code creates new instances)
- **Unused Config Fields**: Removed `defaultMode` from config schemas (mode determined at workspace init, not from config)
- **Config Command**: Removed undocumented `config` command (100 lines, no tests, limited value)
- **Instructions File Field**: Removed `instructionsFile` metadata field (always `INSTRUCTIONS.md`, convention not configuration)
- **Total Impact**: ~150 lines of dead code removed, improved maintainability and type system clarity

### Technical Details

**New Files:**
- `src/types/mode.ts` - Execution mode types and definitions
- `src/utils/template.ts` - Template loader with token replacement
- `src/templates/modes/base-mode.ts` - Mode strategy interface
- `src/templates/modes/loop-mode.ts` - Loop mode strategy
- `src/templates/modes/iterative-mode.ts` - Iterative mode strategy
- `src/templates/modes/mode-factory.ts` - Mode factory
- `src/templates/prompts/workspace-system.md` - Workspace system prompt template
- `src/templates/prompts/loop/*.md` - 6 loop mode prompt templates
- `src/templates/prompts/iterative/*.md` - 6 iterative mode prompt templates
- `tests/unit/mode-factory.test.ts` - Mode factory tests
- `tests/unit/loop-mode.test.ts` - Loop mode strategy tests
- `tests/unit/iterative-mode.test.ts` - Iterative mode strategy tests

**Modified Files:**
- `src/types/metadata.ts` - Added `mode` field, removed unused enums and `instructionsFile` field
- `src/types/config.ts` - Added `completionMarkers` field, removed `defaultMode` field
- `src/templates/system-prompt.ts` - Converted to async template loading
- `src/core/completion.ts` - Added mode-aware completion detection
- `src/core/config-manager.ts` - Added completion markers merging logic
- `src/core/workspace.ts` - Added mode support and completion markers to init, simplified instructions methods
- `src/commands/init.ts` - Added `--mode` and `--completion-markers` flags
- `src/commands/setup.ts` - Use mode-specific prompts
- `src/commands/edit.ts` - Use mode-specific prompts
- `src/commands/validate.ts` - Use mode-specific prompts
- `src/commands/run.ts` - Display mode, use mode-specific prompts, support `--completion-markers` override
- `src/commands/show.ts` - Display workspace mode
- `src/utils/logger.ts` - Removed singleton export
- `tests/unit/completion.test.ts` - Added iterative mode tests
- `tests/unit/workspace.test.ts` - Added mode-specific tests

**Removed Files:**
- `src/commands/config.ts` - Undocumented command with no tests

---

## [1.0.0] - 2025-10-09

### Added

#### Archive System
- **Archive Manager**: Full workspace archiving functionality
  - `archive save` - Archive workspace with timestamped name
  - `archive list` - List all archived workspaces
  - `archive restore` - Restore archive to workspace
  - `archive show` - Display archive details
  - `archive delete` - Permanently delete archive
- **Smart Archiving**: `clean` command now archives by default before deletion
  - Use `--no-archive` to skip archiving
  - Configurable archive directory

#### Notification System
- **HTTP Notifications**: Send notifications via HTTP POST (ntfy.sh compatible)
  - `setup_complete` - After guided setup finishes
  - `execution_start` - When execution loop begins
  - `iteration_milestone` - Every 10 iterations
  - `completion` - Task completes successfully
  - `error` - Execution encounters error
- **Flexible Configuration**:
  - Configure via `--notify-url` and `--notify-events`
  - Default events: `completion` and `error`
  - Support for `all` to enable all events
- **Priority Levels**: High priority for completion, urgent for errors

#### Configuration Management
- **Config Command**: New `config` command for configuration management
  - `config show` - Display current configuration
  - `config get <key>` - Get specific configuration value
  - `--json` flag for JSON output

#### Template Management
- **Template Delete**: New `template delete` command
  - Delete project or global templates
  - Confirmation required (use `--force` to skip)
  - Support for `-g/--global` flag

### Changed
- **Clean Command**: Now archives workspaces by default before deletion
- **Test Suite**: Expanded from 50 to 87 tests (74% increase)
- **TypeScript**: Full type safety for notification events and archive metadata

### Fixed
- **Documentation**: README now accurately reflects all implemented features
- **Build Process**: All TypeScript compilation errors resolved
- **Test Coverage**: Comprehensive test coverage for new features

### Technical Details

**New Files:**
- `src/core/archive-manager.ts` - Archive management logic
- `src/services/notification-service.ts` - HTTP notification service
- `src/types/archive.ts` - Archive type definitions
- `src/commands/archive.ts` - Archive CLI commands
- `src/commands/config.ts` - Configuration CLI commands
- `tests/unit/archive-manager.test.ts` - 19 archive tests
- `tests/unit/notification-service.test.ts` - 18 notification tests

**Modified Files:**
- `src/commands/clean.ts` - Added archive-before-delete functionality
- `src/commands/setup.ts` - Integrated setup_complete notifications
- `src/commands/run.ts` - Added execution notifications (start, milestone, completion, error)
- `src/commands/init.ts` - Added `--notify-events` option
- `src/commands/template.ts` - Added delete subcommand
- `src/core/template-manager.ts` - Added delete() method
- `src/core/workspace.ts` - Added notifyEvents parameter support
- `src/types/metadata.ts` - Expanded notification event types
- `README.md` - Comprehensive documentation updates

## [0.8.0] - 2025-10-09 (Initial Implementation)

### Added
- **Core Workspace Management**: Initialize, load, and manage task workspaces
- **Guided Setup**: Interactive instruction creation with Claude
- **Iteration Loop**: Autonomous task execution with completion detection
- **Template System**: Save and reuse workspace patterns
  - Project templates (committed to repo)
  - Global templates (user-level)
- **Configuration**: Layered config system (CLI > Project > User > Defaults)
- **Commands**: Full CLI interface
  - `init` - Initialize new workspace
  - `setup` - Guided instruction creation
  - `edit` - Edit instructions
  - `validate` - Validate instructions
  - `run` - Execute iteration loop
  - `list` - List all workspaces
  - `show` - Display workspace details
  - `clean` - Delete workspace
  - `reset` - Reset iteration counts
  - `template save` - Save workspace as template
  - `template use` - Create workspace from template
  - `template list` - List available templates
  - `template show` - Display template details
- **Testing**: 50 comprehensive unit tests with mocked Claude calls
- **TypeScript**: Full type safety with Zod schemas
- **Cross-Platform**: Windows, macOS, Linux support

### Technical Stack
- TypeScript 5.8+ (strict mode)
- Commander.js for CLI
- Zod for validation
- Vitest for testing
- Node.js 18+ required

---

## Release Notes

### v1.0.0 - Production Ready

This release marks claude-iterate as production-ready with critical features for professional use:

**Key Improvements:**
1. **Archive System** - Never lose completed work
2. **Notifications** - Stay informed about long-running tasks
3. **Enhanced UX** - Better configuration management and template handling
4. **Test Coverage** - 87 passing tests ensure reliability

**Breaking Changes:** None - fully backward compatible with v0.8.0

**Migration Guide:** No migration required. New features are opt-in via CLI flags and configuration.

### v0.8.0 - Initial Release

First public release with core functionality for managing automated task iterations with Claude Code.

---

## Unreleased

Nothing currently in development. See [GitHub Issues](https://github.com/your-repo/claude-iterate/issues) for upcoming features.

---

## Version History

- **1.0.0** (2025-10-09) - Archive system, notifications, config command, template delete
- **0.8.0** (2025-10-09) - Initial implementation

---

**Note:** This project follows [Semantic Versioning](https://semver.org/). For details on any version, see the corresponding tag in the Git repository.
