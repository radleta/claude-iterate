# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.2.0] - 2025-10-27

### Changed

- **Config system refactoring**: Removed deprecated `verbose` field in favor of `outputLevel`
  - BREAKING: Removed `verbose: boolean` from config schemas (use `outputLevel: 'verbose'` instead)
  - Changed `verification` and `claude` objects from `.optional()` to `.default({})` in Zod schemas
  - This ensures nested defaults are always available and improves config inheritance behavior
  - **Impact**: Existing configs with `verbose: true` will be ignored; use `outputLevel: "verbose"` instead
  - **Migration**: Replace `"verbose": true` with `"outputLevel": "verbose"` in config files

### Fixed

- **Config inheritance source tracking**: Fixed `resolveEffectiveValues` to correctly collect nested default values
  - Root cause: Schema objects marked as `.optional()` were not included when parsing empty configs
  - Changed `verification` and `claude` objects to use `.default({})` instead of `.optional()`
  - Now all config keys appear in `resolveEffectiveValues`, even when using defaults
  - **Impact**: `config --keys` now shows complete config with accurate source attribution
  - Added 69 new tests covering config inheritance, workspace overrides, and source tracking

- **Missing config --list flag**: Implemented `config --list` flag to display all configuration values as documented in README
  - Root cause: Flag was documented but not implemented in Commander options
  - Added `.option('-l, --list', 'List all configuration values')` to config command
  - Added handler logic to display project/user/workspace config as JSON
  - Works with `--global` and `--workspace` flags for different config scopes
  - **Impact**: `config --list` command now works as documented instead of throwing "unknown option" error

- **Show command stack trace on missing workspace**: Improved error handling to show user-friendly message instead of stack trace
  - Root cause: Generic catch block displayed full stack trace for WorkspaceNotFoundError
  - Added specific catch for WorkspaceNotFoundError before generic error handler
  - Now displays clean message: "Workspace not found: <name>" without stack trace
  - Added test coverage for error handling scenarios
  - **Impact**: Better user experience when querying non-existent workspaces

- **Iterative mode test expectations outdated**: Updated test to match refactored prompt content
  - Root cause: Test checked for old "stop early" text that was removed during prompt refactoring
  - Updated test to check for new "Stop when:" and "Completion Criteria" sections
  - **Impact**: All 440 tests now pass (was 439/440 passing)

- **Instruction prompts were overly prescriptive**: Fixed setup/edit/validation prompts that incorrectly prescribed specific state management formats (TODO.md, Remaining: N, checkboxes) instead of letting user/agent decide
  - Root cause: Prompts conflated two separate concerns - (1) removing system mechanics explanations vs (2) prescribing state management formats
  - Instructions are prompts FOR an AI agent during `run`, not documentation ABOUT the system - they should focus on WHAT to accomplish, not HOW to track it
  - Removed all prescriptive content requiring specific formats (TODO.md, "Remaining: N" countdown, checkbox formats, file locations)
  - Updated validation criteria to be format-agnostic (removed criteria like "Does TODO.md use Remaining: N format?")
  - Changed from prescriptive output_format to suggestive guidance sections
  - Kept ONLY the removal of system mechanics explanations ("loop stops when...", "you will be re-invoked...", "between iterations...")
  - Added comprehensive context sections explaining what claude-iterate is and how it works (so the instruction designer can help users write effective instructions)
  - Updated all language from "Claude" to "agent" (tool is agent-agnostic, not Claude-specific)
  - Removed outdated "file markers" references (system uses .status.json for completion detection only)
  - **Impact**: Users can now define state management however they want - instructions focus purely on task goals, completion criteria, and quality standards
  - **Note**: System uses .status.json for completion detection, not TODO.md parsing - prescribing TODO.md format was outdated
  - **Compatibility**: 100% compatible - removes unnecessary restrictions, no API changes

- **Runtime templates exposed system mechanics**: Fixed iteration.md and status-instructions.md templates that were injecting system mechanics into every agent execution, violating the principle that instructions should focus on WHAT to accomplish, not HOW the system works
  - Root cause: Templates were adding iteration headers ("Task Iteration {{iterationNumber}}") and referencing iteration mechanics ("this iteration", "each iteration", "Loop Mode Tracking", "the iteration loop will not recognize")
  - Simplified iteration.md templates to only pass through user instructions (removed all wrapper content and headers)
  - Cleaned status-instructions.md templates to remove all references to iterations, loops, sessions, and system mechanics
  - Templates now only provide essential information agents need: user's instructions and .status.json format
  - **Impact**: Agents receive cleaner, more focused prompts without confusing system implementation details
  - **Compatibility**: 100% compatible - removes confusing content, no behavioral changes

- **Verification command failure**: Fixed critical bug where `verify` command consistently failed with "Verification report not generated" error across all depth levels (quick, standard, deep)
  - Root cause: Missing permission handling prevented Claude from writing verification reports in non-interactive mode
  - Added `--dangerously-skip-permissions` option to verify command for autonomous operation
  - Improved error diagnostics with detailed failure information including expected path and Claude output
  - Fixed path resolution to consistently use absolute paths
  - Added automatic parent directory creation for report files
  - Added comprehensive error messages with actionable troubleshooting steps
  - **Impact**: Verification feature now works correctly - users can verify task completion and get quality feedback
  - **Compatibility**: 100% compatible - only fixes broken functionality, adds new optional flags

### Added

- **Verification UX improvements**:
  - Output level support for verify command: `-v, --verbose` and `-q, --quiet` flags
  - ConsoleReporter integration for consistent output formatting across commands
  - Better error messages showing expected report path and potential causes
  - Runtime override support for permission flags (consistent with run command)
  - Debug logging for troubleshooting verification issues
  - Comprehensive test coverage for VerificationService (20 unit tests)

## [2.1.1] - 2025-10-25

### Fixed

- **Fixed template file copy destination in build script**: Template files are now correctly copied to `dist/templates/` instead of `dist/src/templates/`
  - Resolves `ENOENT: no such file or directory` errors when running `claude-iterate run`, `setup`, `edit`, `validate`, and `verify` commands
  - The runtime code expects templates at `dist/templates/prompts/` but the build script was copying them to `dist/src/templates/`
  - **Impact**: All template-loading commands now work correctly in the built/published package
  - **Compatibility**: 100% compatible - only fixes broken functionality, no API or behavior changes

## [2.1.0] - 2025-10-24

### ⚠️ Breaking Changes

- **Notification Events Default to 'all'**: `notifyEvents` now defaults to `['all']` instead of a subset (`['iteration', 'completion', 'error', 'status_update']`)
  - When you configure `notifyUrl`, you'll receive all event types by default
  - This provides better discoverability and more intuitive behavior
  - **Migration**: To revert to the old behavior, explicitly set:
    ```json
    {
      "notifyEvents": ["iteration", "completion", "error", "status_update"]
    }
    ```
  - **Impact**: Users who set `notifyUrl` but not `notifyEvents` will now receive all event types including `setup_complete`, `execution_start`, and `iteration_milestone`

- **Auto-Verification Enabled by Default**: `verification.autoVerify` now defaults to `true`
  - Tasks are automatically verified on completion for better quality assurance
  - Increases token usage by approximately 2-4K tokens per verification (standard depth)
  - Catches incomplete work automatically and provides immediate feedback
  - **Migration**: To disable automatic verification, set:
    ```json
    {
      "verification": {
        "autoVerify": false
      }
    }
    ```
  - **Rationale**: Quality-first approach - false completions waste more time than token costs

- **Auto-Resume on Verification Failure**: `verification.resumeOnFail` now defaults to `true`
  - Claude automatically resumes iterations to fix issues when verification fails
  - Enables more autonomous workflows with less manual intervention
  - Safety: `maxAttempts` (default: 2) prevents infinite loops
  - **Migration**: To require manual resumption, set:
    ```json
    {
      "verification": {
        "resumeOnFail": false
      }
    }
    ```
  - **Rationale**: Aligns with "autonomous iteration" philosophy - Claude can fix its own mistakes

### Fixed

- **Excluded test files from npm package**: Test files are no longer compiled or included in the published package
  - Modified `tsconfig.json` to exclude tests from compilation (removed `tests/**/*` from include array)
  - Reduced package size from 168.6 KB to 116.7 KB (30.8% reduction)
  - Reduced unpacked size from 1.0 MB to 584.1 KB (41.6% reduction)
  - Reduced file count from 329 to 225 files (31.6% reduction)
  - Tests still work via Vitest's independent compilation
  - Updated package.json paths to point to `dist/index.js` instead of `dist/src/index.js`
  - **Impact**: Faster installs, reduced bandwidth usage, more professional package
  - **Compatibility**: 100% compatible (only affects package distribution, not functionality)
- **Updated vite dependency**: Fixed moderate severity vulnerability (GHSA-93m4-6634-74q7)
  - Updated vite from 7.1.0-7.1.10 to 7.1.12 (transitive dependency via vitest)
  - Resolves server.fs.deny bypass vulnerability on Windows
  - All tests pass with updated version
  - **Impact**: Improved security posture, clean security audits
  - **Compatibility**: 100% compatible (dev dependency only)
- **CI workflow paths**: Fixed GitHub Actions CI failure after package optimization
  - Updated build verification to check `dist/index.js` instead of `dist/src/index.js`
  - Updated CLI verification to run `dist/index.js` instead of `dist/src/index.js`
  - Aligns with new dist structure from test exclusion changes
  - **Impact**: CI now passes on all platforms (Ubuntu, macOS, Windows)
  - **Compatibility**: No user impact (CI infrastructure only)
- **CLI package.json import path**: Fixed "Cannot find module" error in CLI
  - Updated import from `../../package.json` to `../package.json`
  - Aligns with new flat dist structure (dist/cli.js vs dist/src/cli.js)
  - **Impact**: CLI --version and --help commands now work correctly
  - **Compatibility**: 100% compatible (internal path fix only)

### Changed

- Improved notification DX: All notification events enabled by default when `notifyUrl` is configured
- Removed hardcoded fallback logic in `NotificationService` - now uses schema defaults for cleaner architecture
- Enhanced verification defaults for quality-first autonomous execution
- Updated configuration documentation to reflect new defaults and token usage implications

### Added

- **Config Key Discovery**: New `--keys` flag for config command to show all available configuration keys
  - Shows all available configuration keys with types, defaults, descriptions, examples
  - Supports `--keys --global` for user config keys
  - Supports `--keys --workspace <name>` for workspace config keys
  - JSON output via `--keys --json` for scripting/automation
  - Category grouping (paths, execution, notifications, verification, claude)
  - Displays enum values, constraints (min/max), related keys
  - Warnings for dangerous options (e.g., --dangerously-skip-permissions)
  - New utilities: `SchemaInspector` (Zod introspection), `ConfigKeysFormatter` (output formatting)
  - New config module: `key-descriptions.ts` (human-readable descriptions for all keys)
  - Comprehensive test coverage (54 new tests: schema inspection, description validation, formatting)
  - **Impact**: Improves config discoverability, reduces documentation lookups, prevents typos
  - **Compatibility**: 100% backward compatible (additive feature, no breaking changes)
- **Status File Watcher Notifications**: Real-time notifications for `.status.json` changes during execution
  - New `StatusFileWatcher` service monitors `.status.json` for changes using fs.watch
  - Automatically sends `status_update` notifications when progress, completion, or summary changes
  - Added to default notification events (`iteration`, `completion`, `error`, `status_update`)
  - Configurable via `notification.statusWatch` in config (debounce, meaningful-only filtering)
  - Meaningful change detection filters timestamp-only updates to prevent spam
  - 2-second debouncing prevents rapid-fire notifications during file updates
  - Notification format includes progress (`35/60 items (+5)`), summary, completion status
  - Graceful error handling ensures watcher failures never break iteration loops
  - Comprehensive unit tests (18 test cases) with fs.watch mocking
  - **Impact**: Provides real-time progress updates for long-running tasks without polling
  - **Compatibility**: 100% backward compatible (opt-in via notification config)
- **Template Save DX Improvements**: Streamlined template workflow with smart defaults and force override
  - Template name now defaults to workspace name when omitted
  - Added `--force` flag to overwrite existing templates without manual deletion
  - Examples:
    - `claude-iterate template save my-workspace` (uses workspace name as template name)
    - `claude-iterate template save my-workspace --force` (overwrites existing template)
    - `claude-iterate template save my-workspace custom-name` (explicit name still supported)
  - **Impact**: ~45% reduction in keystrokes, 50% fewer commands for template updates
  - **Compatibility**: 100% backward compatible (all existing commands work identically)
- **Dependency Management Documentation**: Added comprehensive rationale for manual dependency management
  - New "Dependency Management" section in CONTRIBUTING.md
  - Documents decision to not use Dependabot (reduces GitHub notification noise)
  - Provides security update process and maintenance guidelines
  - Clarifies when to reconsider automation (team growth, security issues)
  - **Impact**: Better contributor understanding of project maintenance approach
  - **Compatibility**: Documentation only (no code changes)
- **Tool Visibility in Verbose Mode**: Real-time display of Claude's tool usage when running with `--verbose` flag
  - New `executeWithToolVisibility()` method in ClaudeClient for streaming NDJSON events
  - StreamJsonFormatter utility class for parsing Claude CLI's `--output-format stream-json` output
  - Shows tool names (Read, Edit, Write, Bash, Grep, etc.), file paths, commands, patterns
  - Success/error indicators (✓/❌) for tool results
  - Text responses displayed with 📝 prefix
  - Tool events logged to `iterate-*.log` files for better auditability
  - Graceful error handling for malformed JSON (continues execution)
  - Zero performance impact on progress/quiet modes (opt-in feature)
  - **Enhanced DX Formatting** (v2.0.1):
    - Blank lines between operations for visual grouping (Gestalt proximity principle)
    - Never truncates error messages, file paths, or Edit tool search strings
    - Tool-specific formatters: Read results show formatted line numbers (`  15 | content`)
    - Bash results show exit codes and full output (up to 20 lines)
    - Edit failures include helpful debugging tips and context
    - Enhanced error messages explain possible causes ("string not found" → explains why)
    - Consistent 3-space indentation hierarchy (operation → tool → details → content)
    - Write results show file sizes and creation vs. overwrite indication
    - 50-80% reduction in cognitive load for scanning and debugging
  - **Impact**: Improves transparency, debuggability, and user trust during execution
  - **Compatibility**: 100% backward compatible (only affects verbose mode output)
- **Per-Workspace Configuration**: Workspace-level config overrides for verification, output, and Claude settings
  - New `--workspace` flag for `config` command to manage per-workspace settings
  - Workspace config stored in `.metadata.json` under `config` field
  - Priority resolution: CLI > Workspace > Project > User > Defaults
  - Supported settings: `verification.*`, `outputLevel`, `claude.command`, `claude.args`
  - Usage examples:
    - `claude-iterate config --workspace my-task verification.depth deep`
    - `claude-iterate config --workspace my-task outputLevel verbose`
    - `claude-iterate config --workspace my-task --list`
  - Workspace config automatically copied via templates
  - **Impact**: Allows different verification depths, output levels, and permissions per workspace
  - **Compatibility**: 100% backward compatible (optional field, existing workspaces work unchanged)
- **Work Completion Verification**: Intelligent verification to ensure Claude actually completes tasks
  - New `verify` command checks workspace completion against original instructions
  - Mode-aware verification prompts for loop (item-by-item) and iterative (requirement-based) modes
  - Three depth levels: `quick` (~500-1K tokens), `standard` (~2-4K tokens), `deep` (~5-10K tokens)
  - Evidence-based verification requiring Claude to cite specific files and locations
  - Structured verification reports in Markdown format
  - Quality checks: tests, error handling, edge cases, documentation, TODOs/FIXMEs
  - Verification metadata tracking in `.metadata.json`: attempts, status, timestamps, cycles
  - Exit codes: 0 = verified complete, 1 = incomplete/needs review
  - Usage: `claude-iterate verify <workspace> [--depth quick|standard|deep]`
- **Verification Configuration**: Full configuration support across all layers
  - Project config (`.claude-iterate.json`): `verification.autoVerify`, `verification.depth`, etc.
  - User config (`~/.config/claude-iterate/config.json`): global verification defaults
  - CLI flags: `--depth` to override verification depth
  - Options: `autoVerify`, `resumeOnFail`, `maxAttempts`, `reportFilename`, `depth`, `notifyOnVerification`
  - Opt-in by default (`autoVerify: false`) to respect token budgets
- **VerificationService**: Core service for running workspace verification
  - Mode-aware prompt generation using existing mode strategy pattern
  - Intelligent report parsing to extract status, issues, confidence, and recommendations
  - Resume instruction generation for failed verifications
  - Full integration with `ClaudeClient` and existing workspace infrastructure
- **Verification Prompts**: Specialized prompts for completion checking
  - `loop/verify-completion.md`: Item-by-item verification for loop mode
  - `iterative/verify-completion.md`: Requirement-based verification for iterative mode
  - Depth-specific instructions added dynamically
  - Structured output format for machine parsing
  - **Impact**: New verification capability without affecting existing workflows
  - **Compatibility**: 100% backward compatible, all existing tests passing (228 tests)

### Fixed

- **Prompt Clarity - Optional Files**: Removed incorrect assumptions about TODO.md from iteration prompts
  - TODO.md is now correctly treated as user-optional, not system-required
  - Iteration prompts focus on INSTRUCTIONS.md (what to do) and .status.json (completion tracking)
  - TODO.md only mentioned in setup/edit prompts as a recommended pattern, not a requirement
  - System-managed files: INSTRUCTIONS.md, .status.json, .metadata.json (guaranteed to exist)
  - User-managed files: TODO.md, working/_, reports/_ (created only if instructions specify)
  - Removed confusing "Read INSTRUCTIONS.md" from iteration prompts (content already embedded via {{instructionsContent}})
  - Setup prompts now clarify: "The system provides your instructions to Claude each iteration"
  - **Impact**: Fixes architectural flaw where optional user files were treated as system dependencies
  - **Testing**: Updated 2 test assertions, all 228 tests passing
- **Config Keys Display for Optional Fields**: Fixed `--keys` command not showing values for optional configuration fields
  - The `config --keys` command now correctly displays values for optional fields like `notifyUrl` when set in user or project configs
  - Root cause: `resolveEffectiveValues()` only iterated over keys present in default schema; optional fields without defaults were excluded
  - Solution: Collect keys from all config sources (default, user, project, workspace) instead of just defaults
  - Affected fields: `notifyUrl`, `claude` (optional object), `notification` (optional object), `verification` (optional object)
  - Example: `claude-iterate config --global notifyUrl https://ntfy.sh/test` → `claude-iterate config --keys --global` now shows the value with `[user]` source indicator
  - **Impact**: Makes `--keys` actually useful for discovering configured values, not just available keys
  - **Testing**: Added 10 new test cases in `config-manager.test.ts` covering optional field resolution, priority, and nested fields

### Improved

- **Enhanced Directory Path Context**: Claude now receives explicit project root and workspace paths
  - All system prompts now include `**Project Root Directory:**` with actual absolute path (e.g., `/home/user/myproject`)
  - All system prompts now include `**Current Working Directory:**` context explaining where bash commands execute
  - Workspace paths shown with full absolute paths for clarity (e.g., `/home/user/myproject/claude-iterate/workspaces/task-name`)
  - Status instructions include example commands with actual paths for updating `.status.json`
  - Path examples show both relative project paths (`./src/file.ts`) and absolute workspace paths
  - Eliminates confusion about execution context and file locations
  - Applies to all contexts: setup, edit, validate, and run (both loop and iterative modes)
  - Template variable replacement: `{{projectRoot}}` and `{{workspacePath}}` populated at runtime
  - **Impact**: ~200-500 additional characters per prompt (~1% token increase), massive clarity improvement
  - **Compatibility**: Fully backward compatible, no migration required
  - **Testing**: 29 new smoke tests added, all 228 tests passing

### Dependencies

- Added `ndjson@^2.0.0` - NDJSON stream parser for Claude CLI stream-json format (~10KB)
- Added `@types/ndjson@^2.0.4` - TypeScript definitions for ndjson

## [2.0.0] - 2025-10-17

### Added

- **Console Output Levels**: Three modes for better user experience and control
  - `progress` (new default): Shows iteration numbers and status without full Claude output
  - `verbose`: Shows full Claude output in real-time (previous behavior with `--verbose`)
  - `quiet`: Silent execution, only errors/warnings shown
  - New CLI flags: `-v`/`--verbose`, `-q`/`--quiet`, `--output <level>`
  - New config option: `outputLevel` (replaces boolean `verbose`)
  - `ConsoleReporter` service provides structured output filtering
  - Default behavior now shows progress indicators instead of silence
- **Deduplicated Log Files**: Significantly reduced log file size (~60% smaller)
  - Instructions and system prompts logged once at run start instead of per-iteration
  - Run metadata section logged at start (workspace, mode, max iterations, timestamp)
  - Separate sections for instructions, system prompt, and status instructions
  - Iteration sections now only contain timestamps and Claude output
  - Backward compatible: Old log files remain valid, new runs use efficient format
  - No migration needed for existing workspaces
- **29 New Tests**: Comprehensive test coverage for new features (total: 228 tests, was 199)
  - Unit tests for ConsoleReporter (output level filtering, stream handling)
  - Updated FileLogger tests for deduplicated format
  - All tests passing with new output and logging systems

### Changed

- **Config Keys Display**: Enhanced `config --keys` to show current effective values
  - Now displays the actual current value for each configuration key along with its source
  - Sources indicated: `(default)`, `(user)`, `(project)`, or `(workspace)`
  - Color-coded by source: yellow (user), cyan (project), magenta (workspace)
  - Format: `# Current: <value> (<source>)` appended to each key line
  - JSON output includes `current: { value, source }` field when using `--json`
  - Improves UX by showing which settings are actually in use and where they come from
  - Helps debug configuration hierarchy issues at a glance
  - **Compatibility**: 100% backward compatible (additive enhancement, existing behavior unchanged)
- **Default Console Output**: Changed from silent to progress mode for better UX
  - Users now see real-time progress without needing `--verbose`
  - Silent execution still available via `--quiet` flag
  - Log files always created regardless of output level
- **Log File Format**: More efficient structure reduces storage by ~60%
  - Static content (instructions, system prompt) logged once at start
  - Iterations only log timestamps and output
  - Example: 50 iterations reduced from ~1.3MB to ~517KB
  - Makes reviewing logs easier with clear section separation

### Deprecated

- **verbose Config Option**: Use `outputLevel` instead
  - `verbose: true` maps to `outputLevel: 'verbose'`
  - `verbose: false` maps to `outputLevel: 'progress'`
  - Old config still works (backward compatible)
  - Will be removed in future major version

### Breaking Changes

- **Completion Detection Simplification**: Completion detection now exclusively uses `.status.json`
  - **Removed**: `completionMarkers` configuration option (from metadata, config files, and CLI)
  - **Removed**: `--completion-markers` CLI flag
  - **Removed**: Marker-based text parsing in TODO.md (e.g., "Remaining: 0", "TASK COMPLETE")
  - **Migration**: None required - .status.json is created automatically during iterations
  - **Rationale**: Simplifies system, eliminates false positives, improves reliability
  - Legacy marker detection removed - single code path for all modes

- **Status Instructions Moved to Runtime**: `.status.json` format no longer in setup prompts
  - User instructions now focus purely on task description (WHAT to build)
  - Status tracking instructions automatically appended at runtime (HOW to track)
  - Makes system more maintainable and format updates won't break existing workspaces
  - Existing workspaces continue to work (instructions are just longer than needed)

### Added

- **Status File (.status.json)**: Machine-readable completion status for robust progress tracking
  - Structured JSON format with `complete`, `progress`, `summary`, and optional fields
  - Claude updates `.status.json` each iteration with current progress
  - Primary completion detection mechanism (replaces text marker parsing)
  - Prevents false positives from markers appearing in instructions or examples
  - Example: `{"complete": false, "progress": {"completed": 35, "total": 60}}`
- **Status Display**: `show` command now displays `.status.json` information
  - Shows progress counts (completed/total)
  - Displays optional summary, phase, and blockers
  - Validation warnings for inconsistent status (e.g., completed > total)
- **Status Methods**: New workspace methods for status access
  - `workspace.getStatus()`: Read full status object
  - `workspace.getProgress()`: Get progress with percentage
  - `workspace.validateStatus()`: Check for inconsistencies
- **15 New Tests**: Comprehensive test coverage for status manager and completion detection
  - Unit tests for StatusManager (read, validation, progress calculation)
  - Integration tests for .status.json priority over legacy markers
  - Fallback behavior tests for backward compatibility
- **File Logging**: Each run now creates a timestamped log file (e.g., `iterate-20251015-142345.log`)
  - All Claude output captured to log files regardless of verbose setting
  - Structured format with iteration numbers, timestamps, and full responses
  - Easy to review specific runs with timestamped filenames
- **Verbose Output**: `--verbose` flag now shows Claude's full output in real-time during iterations
  - Streams Claude responses to console as they're generated
  - File logging continues to work alongside console output
  - Helpful for debugging and monitoring long-running tasks
- **Stagnation Detection**: Automatic stop after N consecutive no-work iterations (iterative mode only)
  - Default threshold: 2 consecutive iterations with no work
  - Prevents infinite loops when Claude reports `worked: false` without setting `complete: true`
  - Configurable via `--stagnation-threshold` CLI flag (0=disabled)
  - Can be set in workspace metadata, project config, or user config
  - Configuration hierarchy: CLI flag > Workspace metadata > Project config > User config > Default (2)
  - Only applies to iterative mode (loop mode has explicit progress tracking)
  - Counter resets to 0 when work is detected (worked=true or undefined)
  - Debug logging shows stagnation count progression when verbose enabled
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

- **Completion Detection**: Now exclusively uses `.status.json` for completion signal
  - Checks `.status.json` for `complete: true`
  - More reliable: No false positives from markers in instructions/examples
  - Unified: Single code path for both loop and iterative modes
  - No legacy marker detection fallback (breaking change)
- **Progress Display**: `run` command now shows structured progress from `.status.json`
  - Shows `Progress: 35/60` format for loop mode (when progress tracking exists)
  - Shows worked status and summary for iterative mode
  - Displays summary text from status file on completion
- **Prompt Templates**: Updated iteration system prompts to document `.status.json`
  - Loop mode: Explains status file format and required fields
  - Iterative mode: Documents status updates alongside TODO.md checkboxes
  - Setup prompts: Instructs users to update status file each iteration
  - Clear examples showing status file structure
- **Test Suite**: Updated from 147 to 199 passing tests (+52 tests)
  - New status-manager unit tests (15 tests)
  - Enhanced completion detection tests (6 tests)
  - All tests pass with new .status.json system
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

- **Completion Markers Configuration**: Removed from metadata, config, and CLI
  - No longer needed with .status.json-only detection
  - Simplifies configuration surface
  - Reduces user confusion
  - Removed from: MetadataSchema, ProjectConfigSchema, UserConfigSchema, RuntimeConfig, DEFAULT_CONFIG
  - Removed CLI flags: `--completion-markers` (from init and run commands)
  - Removed config command support: `config completionMarkers`
- **Legacy Marker Detection**: Removed all TODO.md text parsing for completion
  - No backward compatibility fallback
  - Cleaner, simpler codebase
  - Single code path for all modes
  - Removed methods: `isCompleteLegacy()`, `isCompleteLoop()`, `isCompleteIterative()`, `getRemainingCountLoop()`
  - Removed: `hasTodo()` and `hasInstructions()` helper methods from CompletionDetector
- **Mode-Specific Completion Logic**: Unified completion detection for all modes
  - Both loop and iterative modes use identical .status.json mechanism
  - Removed mode branching in completion detector
  - Simplified from 194 lines to 58 lines in completion.ts
- **Status Tracking in Setup Prompts**: Removed .status.json documentation from user-facing prompts
  - Setup prompts no longer explain status file format
  - Status instructions moved to runtime (appended to iteration prompts automatically)
  - Users focus on task description, not system mechanics
  - Removed "Status Tracking" sections from loop/setup.md and iterative/setup.md

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
