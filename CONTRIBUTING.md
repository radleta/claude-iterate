# Contributing to claude-iterate

Thanks for your interest in contributing to claude-iterate! This document provides guidelines for contributing to the project.

## Code of Conduct

Be respectful, inclusive, and constructive. We're all here to build something great together.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm
- Claude CLI installed and accessible in PATH
- Git

### Development Setup

```bash
# Clone the repository
git clone https://github.com/radleta/claude-iterate.git
cd claude-iterate

# Install dependencies
npm install

# Build the project
npm run build

# Link for local testing
npm link

# Test the CLI
claude-iterate --version
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# Run specific test files
npm run test:unit
npm run test:integration
```

### Code Quality Checks

```bash
# Lint code
npm run lint

# Type check
npm run typecheck

# Format code
npm run format

# Run all checks (lint + typecheck + test)
npm run validate
```

## Development Workflow

### 1. Fork and Clone

Fork the repository on GitHub, then clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/claude-iterate.git
cd claude-iterate
git remote add upstream https://github.com/radleta/claude-iterate.git
```

### 2. Create a Branch

Create a feature branch from `main`:

```bash
git checkout main
git pull upstream main
git checkout -b feature/my-awesome-feature
```

Use descriptive branch names:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test improvements

### 3. Make Changes

- Write clean, readable code
- Follow existing code style and conventions
- Add tests for new functionality
- Update documentation as needed
- Keep commits focused and atomic

### 4. Test Your Changes

```bash
# Run validation suite
npm run validate

# Test the CLI locally
npm run build
npm link
claude-iterate --version
claude-iterate init test-workspace
```

### 5. Commit Your Changes

Follow [Conventional Commits](https://conventionalcommits.org/) format:

```
type(scope): brief description

Longer description if needed.

- Bullet points for details
- More information

Closes #123
```

**Types:**

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring (no functional changes)
- `test:` - Test additions or changes
- `chore:` - Build process, tooling, dependencies
- `perf:` - Performance improvements
- `style:` - Code style changes (formatting, etc.)

**Examples:**

```bash
git commit -m "feat: add template export command"

git commit -m "fix: handle missing TODO.md gracefully

- Check if TODO.md exists before reading
- Create default TODO.md if missing
- Add tests for edge case

Closes #45"

git commit -m "docs: add examples for notification configuration"
```

### 6. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/my-awesome-feature

# Create PR on GitHub
```

**PR Guidelines:**

- Fill out the PR template completely
- Reference related issues
- Ensure all CI checks pass
- Respond to review feedback promptly

## Contributing Features

When adding new features to claude-iterate, follow the Spec-Driven Development (SDD) workflow:

- **[Feature Documentation Guide](docs/features/CONTRIBUTING.md)** - SDD workflow, SPEC/PLAN/TEST/TODO process
- **[Feature Registry](docs/features/README.md)** - Browse existing features for examples

All features must include:

- SPEC.md - Technical specification
- PLAN.md - Implementation plan
- TEST.md - Testing strategy
- TODO.md - Work tracking
- README.md - Overview with metadata

See existing features in `docs/features/` for reference.

## Project Structure

```
claude-iterate/
├── src/
│   ├── commands/         # CLI command implementations
│   ├── core/             # Business logic (workspace, metadata, config)
│   ├── services/         # External integrations (claude-client, notifications)
│   ├── types/            # Zod schemas and TypeScript types
│   ├── utils/            # Utilities (logger, fs, paths, errors)
│   ├── templates/        # Prompt templates and mode strategies
│   ├── cli.ts            # CLI setup (Commander.js)
│   └── index.ts          # Entry point
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── mocks/            # Mock implementations
│   └── setup.ts          # Test configuration
├── scripts/              # Build and utility scripts
└── dist/                 # Compiled output (generated)
```

**Key files:**

- `src/cli.ts` - Register new commands here
- `src/types/*.ts` - Zod schemas for validation
- `tests/mocks/claude-client.mock.ts` - Mock for testing (no real Claude calls)

## Architecture Patterns

### Adding a New Command

1. Create command file: `src/commands/my-command.ts`
2. Export command function that returns a Commander `Command`
3. Register in `src/cli.ts`
4. Add tests in `tests/unit/` or `tests/integration/`
5. Update README.md with command documentation
6. Add to CHANGELOG.md under `[Unreleased]`

**Example:**

```typescript
// src/commands/my-command.ts
import { Command } from 'commander';
import { Logger } from '../utils/logger.js';

export function myCommand(): Command {
  return new Command('my-command')
    .description('Do something awesome')
    .argument('<name>', 'Name argument')
    .option('-f, --force', 'Force flag')
    .action(async (name, options) => {
      const logger = new Logger();
      logger.info(`Running my-command for ${name}`);
      // Implementation...
    });
}
```

```typescript
// src/cli.ts
import { myCommand } from './commands/my-command.js';

// In cli() function:
program.addCommand(myCommand());
```

### Modifying Prompt Templates

Prompt templates are located in `src/templates/prompts/` and use token replacement:

**Template files:**

- `workspace-system.md` - Used in setup/edit/validate commands
- `loop/iteration-system.md` - Loop mode iteration context
- `iterative/iteration-system.md` - Iterative mode iteration context
- `loop/status-instructions.md` - Loop mode status tracking
- `iterative/status-instructions.md` - Iterative mode status tracking

**Token replacement:**

- Use `{{tokenName}}` in templates
- Tokens replaced at runtime via `loadTemplate()` function
- Common tokens: `{{projectRoot}}`, `{{workspacePath}}`, `{{workspaceName}}`

**Example:**

```markdown
**Current Working Directory:** `{{projectRoot}}`
**Workspace Location:** `{{workspacePath}}`
```

**Important:**

- Test token replacement (see `tests/unit/loop-mode.test.ts`)
- Update both loop and iterative templates for consistency
- Consider token impact on prompt size (~1% increase acceptable)
- Verify no unreplaced tokens in generated prompts

### Adding a New Type/Schema

Use Zod for runtime validation:

```typescript
// src/types/my-type.ts
import { z } from 'zod';

export const MySchema = z.object({
  name: z.string(),
  count: z.number().default(0),
  optional: z.string().optional(),
});

export type MyType = z.infer<typeof MySchema>;
```

### Testing Guidelines

- **All new features need tests**
- Use mocked Claude client (see `tests/mocks/claude-client.mock.ts`)
- No real Claude API calls in tests
- Tests should be fast (<10 seconds for full suite)
- Tests should be deterministic (no flaky tests)

**Test structure:**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('MyFeature', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = doSomething(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

## Documentation

- Update README.md for user-facing features
- Update CLAUDE.md for developer/architecture changes
- Add JSDoc comments for public APIs
- Keep CHANGELOG.md updated under `[Unreleased]`

## Dependency Management

This project uses **manual dependency management** rather than automated tools like Dependabot.

### Rationale

While Dependabot provides automated dependency updates, we've chosen manual management for this project because:

1. **Notification Noise**: Dependabot creates weekly PRs for all dependencies, generating significant GitHub notification volume for maintainers.

2. **Small Team Scale**: As a solo/small-team maintained project, manual dependency reviews are manageable and allow for more thoughtful evaluation of updates.

3. **Deliberate Update Cycles**: Manual updates allow batching dependency changes with feature releases, reducing CI churn.

4. **Security Coverage**: Security vulnerabilities are still monitored via:
   - Manual `npm audit` runs before releases
   - GitHub security alerts (enabled in repository settings)
   - Security-conscious dependency selection

### Updating Dependencies

**Before releases**:

```bash
# Check for vulnerabilities
npm audit --audit-level=high

# Fix any high/critical issues
npm audit fix

# Check for outdated packages (informational)
npm outdated
```

**Regular maintenance** (monthly or quarterly):

```bash
# Review all outdated packages
npm outdated

# Update dependencies as needed
npm update <package-name>

# Test thoroughly
npm run validate
```

### Security Vulnerabilities

**If a security vulnerability is discovered**:

1. Fix immediately: `npm audit fix`
2. Test: `npm test`
3. Commit: `git commit -m "fix: resolve CVE-XXXX-XXXX vulnerability"`
4. Create patch release if in production

### When to Reconsider

This decision should be revisited if:

- Project has multiple active maintainers
- Dependencies fall significantly behind
- Security vulnerabilities are repeatedly missed

## Release Process

(For maintainers only)

1. Ensure all tests pass: `npm run validate`
2. Update CHANGELOG `[Unreleased]` section with changes
3. Run `npm version [patch|minor|major]` (updates CHANGELOG automatically)
4. Push to GitHub: `git push && git push --tags`
5. GitHub Actions handles npm publish automatically

## Getting Help

- **Documentation:** See [README.md](README.md) for usage docs
- **Architecture:** See [CLAUDE.md](CLAUDE.md) for developer docs
- **Issues:** [Open an issue](https://github.com/radleta/claude-iterate/issues)
- **Discussions:** [Join discussions](https://github.com/radleta/claude-iterate/discussions)

## Questions?

If something is unclear:

1. Check existing issues and discussions
2. Review the codebase (it's well-documented!)
3. Ask in a new discussion or issue

## License

By contributing to claude-iterate, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

**Thank you for contributing to claude-iterate!** 🚀
