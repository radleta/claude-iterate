# claude-iterate - Developer Guide for Claude

## CLAUDE.md Documentation Standards

These standards apply to this file and any other CLAUDE\*.md files in the repository.

**Critical: Token-Conscious Documentation**

- Be concise and instructional, not exhaustive
- No duplicate content across sections
- Minimal examples, only when essential
- CLAUDE.md is for instructions, not code dumps
- Remove outdated content immediately

**When adding to CLAUDE.md:**

1. Does this content exist elsewhere?
2. Can this be a 1-line reference?
3. Will this age well or become stale quickly?

## Documentation Organization

@README.md - User documentation
CHANGELOG.md - Version history

**This file is for developers working ON claude-iterate, not users of the tool.**

## Project Purpose

CLI tool for managing automated task iterations with Claude Code. TypeScript 5.8+, Commander.js, Zod validation, Vitest (228 mocked tests), Node 18+.

## Architecture Quick Reference

**Core modules** (see `src/` for implementation):

- `commands/` - CLI command handlers (init, setup, run, template, archive, etc.)
- `core/` - Business logic (workspace, metadata, completion, template-manager, archive-manager, config-manager)
- `services/` - External integrations (claude-client spawns `claude` CLI, notification-service for HTTP POST, console-reporter for output, file-logger for logs)
- `types/` - Zod schemas (metadata, config, template, archive)

**Key files:**

- `src/index.ts` - Entry point
- `src/cli.ts` - Commander setup, register all commands here
- `tests/mocks/claude-client.mock.ts` - Mock for all tests (no real Claude calls, 228 tests passing)

## Critical Concepts

### scratch/ Directory

YOUR working directory for development tasks on claude-iterate itself:

- NOT .gitignored (so you can access it)
- Protected by pre-commit hook (won't be committed)
- Separate from `claude-iterate/workspaces/` (user workspaces, part of tool output)
- For planning, experiments, analysis only

### Workspaces NOT .gitignored (Design Decision)

User workspaces (`claude-iterate/workspaces/`) are NOT in .gitignore because AI agents treat ignored content differently (may skip/hide). Pre-commit hook provides protection instead. User must run: `git config core.hooksPath .githooks`

### Iteration Loop Design

Spawns `claude` CLI (not API) to reuse installation, avoid key management, leverage project awareness. See `src/services/claude-client.ts`.

### All Tests Mocked

No real Claude calls. Fast, deterministic, CI-friendly. See `tests/mocks/claude-client.mock.ts`.

### Tool Visibility (Verbose Mode)

Verbose mode uses Claude CLI's `--output-format stream-json --verbose` to show real-time tool usage. `StreamJsonFormatter` (`src/utils/stream-json-formatter.ts`) parses NDJSON events from stdout, formats tool_use/tool_result events with emojis (🔧, ✓, ❌, 📝). `ClaudeClient.executeWithToolVisibility()` attaches formatter, provides callbacks. Progress/quiet modes use `executeNonInteractive()` (no overhead). Deps: `ndjson` (~10KB) for robust parsing. Graceful error handling via `strict: false`.

### Prompt Templates

Prompts are `.md` files in `src/templates/prompts/` using `{{token}}` replacement (see `src/utils/template.ts`). Key tokens: `{{projectRoot}}` (process.cwd()), `{{workspacePath}}` (absolute). Templates are mode-specific (loop vs iterative). When modifying: update both modes, add tests, verify token replacement. See `src/templates/modes/` for strategy pattern.

## Development Workflow

**Setup:** `git clone → npm install → npm run build`

**Change cycle:** Edit `src/` → `npm test` → `npm run typecheck` → `npm run lint` → `npm run build` → `npm link` to test locally

**Add command:** Create `src/commands/X.ts` → register in `src/cli.ts` → add tests → update README.md → add to CHANGELOG [Unreleased]

**Modify schema:** Update `src/types/*.ts` Zod schema → update core logic → update tests → consider migration

**Modify prompts:** Edit templates in `src/templates/prompts/` → update both modes (loop + iterative) → add tokens to mode strategies → add tests → verify no unreplaced tokens

## Release Workflow

**Pre-release:** Update CHANGELOG [Unreleased] section → `npm run validate` → `npm run pack:dry`

**Release:** `npm version [patch|minor|major]` (auto-updates CHANGELOG via `scripts/update-changelog.js`, creates tag) → `git push && git push --tags` (triggers GitHub Actions CI/CD → npm publish with OIDC)

**No auto-push** - Manual push required (container permissions)

## Common Issues

- **TypeScript errors in tests**: Check `tests/setup.ts` imports vitest globals
- **Tests fail after schema change**: Update test fixtures to match Zod schema
- **npm link broken**: Run `npm run build` first
- **Git hook not working**: Run `git config core.hooksPath .githooks`

## Key Metadata

- **Repo:** github.com/radleta/claude-iterate
- **Author:** Richard Adleta (radleta@gmail.com)
- **Package:** `claude-iterate` (not yet published)
- **CI/CD:** `.github/workflows/ci.yml` (multi-platform testing), `.github/workflows/release.yml` (npm publish)

## Related Docs

See @README.md for user guide, CHANGELOG.md for history, `scratch/release-ready/` for release planning.

---

**Remember:** This is developer context for building claude-iterate. For usage docs, see README.md.
