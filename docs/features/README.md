# claude-iterate Feature Registry

This directory contains comprehensive Spec-Driven Development (SDD) documentation for all features in the claude-iterate CLI application.

## Quick Links

**For Users:**

- [Installation & Quick Start](../../README.md#quick-start)
- [Commands Reference](../../README.md#commands-reference)
- [Configuration Guide](../../README.md#configuration)

**For Contributors:**

- [Development Setup](../../CONTRIBUTING.md#development-workflow)
- [Code Quality Guidelines](../../CONTRIBUTING.md#code-quality-checks)
- [Testing Requirements](../../CONTRIBUTING.md#running-tests)

**For Developers/Agents:**

- [Architecture Quick Reference](../../CLAUDE.md#architecture-quick-reference)
- [Iteration Loop Design](../../CLAUDE.md#iteration-loop-design)
- [Prompt Templates](../../CLAUDE.md#prompt-templates)

## Application Type

**CLI Application** - Command-line tool for managing automated task iterations with Claude Code

## Feature Overview

claude-iterate provides 8 core features for managing workspace-based task iteration with Claude:

### Core Features

1. **[Workspace Management](./workspace-management/README.md)** - Create, list, show, clean, and reset workspaces
2. **[Instructions Management](./instructions-management/README.md)** - Create, edit, and validate workspace instructions interactively
3. **[Execution](./execution/README.md)** - Run autonomous iteration loops with Claude in loop or iterative mode
4. **[Templates](./templates/README.md)** - Save, use, list, and show reusable workspace templates
5. **[Archives](./archives/README.md)** - Save, restore, list, show, and delete workspace archives
6. **[Configuration](./configuration/README.md)** - Get and set configuration at project, user, and workspace levels
7. **[Verification](./verification/README.md)** - Verify workspace work completion with quick, standard, or deep analysis
8. **[Notifications](./notifications/README.md)** - HTTP POST notifications for long-running tasks (ntfy.sh compatible)

## Feature Status

| Feature                                                        | Status   | Description                                                    |
| -------------------------------------------------------------- | -------- | -------------------------------------------------------------- |
| [Workspace Management](./workspace-management/README.md)       | Complete | Isolated task iteration environments with lifecycle operations |
| [Instructions Management](./instructions-management/README.md) | Complete | Interactive instruction creation and validation system         |
| [Execution](./execution/README.md)                             | Complete | Autonomous task iteration with dual execution modes            |
| [Templates](./templates/README.md)                             | Complete | Reusable workspace patterns with metadata                      |
| [Archives](./archives/README.md)                               | Complete | Workspace preservation and restoration system                  |
| [Configuration](./configuration/README.md)                     | Complete | Git-style layered configuration management                     |
| [Verification](./verification/README.md)                       | Complete | AI-powered work completion verification                        |
| [Notifications](./notifications/README.md)                     | Complete | Event-driven HTTP notification system                          |

## Documentation Structure

Each feature follows the SDD pattern with 5 required files:

- **README.md** - Feature overview with purpose, user stories, and business logic
- **SPEC.md** - Technical specification with public contract, dependencies, and architecture
- **PLAN.md** - Implementation plan (checklist for leaf features, roadmap for parent features)
- **TEST.md** - Testing specification with coverage targets, scenarios, and benchmarks
- **TODO.md** - Implementation tracking with validation checklists and progress

## Contributing

For guidelines on creating new features or updating existing ones:

- See [CONTRIBUTING.md](./CONTRIBUTING.md) for the complete SDD workflow
- See [CLAUDE.md](./CLAUDE.md) for agent-specific workflow guidance

## Tech Stack

- **Language:** TypeScript 5.8+
- **CLI Framework:** Commander.js
- **Validation:** Zod
- **Testing:** Vitest (228 passing tests)
- **Node.js:** >= 18.0.0

## Project Information

- **Repository:** https://github.com/radleta/claude-iterate
- **Author:** Richard Adleta (radleta@gmail.com)
- **License:** MIT
- **Version:** 2.2.0
