# Testing Specification: Configuration

## Test Coverage Targets

- **Unit Test Coverage**: ≥80% line coverage for all config modules
- **Integration Test Coverage**: All config scope combinations (project, user, workspace)
- **Edge Case Coverage**: All error conditions and boundary scenarios
- **Performance Test Coverage**: Config resolution <30ms

## Testing Layers

### Layer 1: Unit Tests

**Scope:**

- ConfigManager layered merging logic
- Dot notation helpers (getNestedValue, setNestedValue, unsetNestedValue)
- Schema inspection and field extraction
- Config keys formatting
- Config value flattening

**Key Test Scenarios:**

1. **ConfigManager.load()**
   - Load with no config files: Should use schema defaults
   - Load with user config only: Should merge user config with defaults
   - Load with project config only: Should merge project config with defaults
   - Load with both user and project: Should apply correct priority (project > user > defaults)
   - Load with workspace metadata: Should apply correct priority (workspace > project > user > defaults)
   - Load with CLI options: Should apply correct priority (CLI > workspace > project > user > defaults)
   - Tilde expansion: Should resolve `~` in all path fields

2. **Dot Notation Helpers**
   - getNestedValue with valid path: Should return nested value
   - getNestedValue with invalid path: Should return undefined
   - setNestedValue creating new structure: Should create intermediate objects
   - setNestedValue updating existing: Should update leaf value only
   - unsetNestedValue with existing key: Should delete and return true
   - unsetNestedValue with missing key: Should return false

3. **Schema Inspector**
   - Inspect flat schema: Should extract all fields with types and defaults
   - Inspect nested schema: Should flatten nested objects with dot notation keys
   - Extract enum values: Should return all valid enum options
   - Extract constraints: Should return min/max/length constraints
   - Unwrap optional/default modifiers: Should get to core type

4. **Config Value Flattener**
   - Flatten simple object: Should convert to dot notation
   - Flatten nested object: Should handle multiple levels
   - Flatten with arrays: Should preserve arrays as values (no flattening)
   - Get nested value: Should retrieve using dot path

5. **Config Keys Formatter**
   - Display keys: Should group by category and format with colors
   - Display with current values: Should show value and source
   - Format as JSON: Should output valid JSON structure
   - Format constraints: Should display min/max ranges

**Example Test:**

```typescript
describe('ConfigManager.load', () => {
  it('should merge configs in correct priority order', async () => {
    // Setup: Create user config with maxIterations=100
    // Setup: Create project config with maxIterations=50
    // Setup: Pass CLI options with maxIterations=75

    const manager = await ConfigManager.load({ maxIterations: 75 });
    const config = manager.getConfig();

    expect(config.maxIterations).toBe(75); // CLI wins
  });
});
```

### Layer 2: Integration Tests

**Scope:**

- Full config command workflow
- Config file read/write operations
- Config inheritance across scopes
- Array operations end-to-end
- Workspace config integration

**Key Test Scenarios:**

1. **Config File Operations**
   - Read non-existent config: Should use defaults
   - Read existing project config: Should load and merge values
   - Write project config: Should save valid JSON
   - Write with invalid values: Should fail validation

2. **Config Inheritance**
   - User + Project: Project should override user
   - User + Project + Workspace: Workspace should override all
   - User + Project + Workspace + CLI: CLI should override all
   - Partial overrides: Should merge objects correctly

3. **Array Operations**
   - Add to empty array: Should create array with one item
   - Add to existing array: Should append item
   - Add duplicate: Should warn and not duplicate
   - Remove from array: Should remove item
   - Remove missing item: Should warn
   - Add to non-array: Should error
   - Remove from non-array: Should error

4. **Workspace Config**
   - Get workspace config value: Should retrieve from metadata
   - Set workspace config value: Should update metadata.config
   - Unset workspace config value: Should remove from metadata.config
   - Workspace config priority: Should override project/user

**Example Test:**

```typescript
describe('Config inheritance', () => {
  it('should apply correct priority: workspace > project > user', async () => {
    // Setup user config: outputLevel=quiet
    // Setup project config: outputLevel=progress
    // Setup workspace config: outputLevel=verbose

    const manager = await ConfigManager.load({}, workspaceMetadata);

    expect(manager.get('outputLevel')).toBe('verbose'); // Workspace wins
  });
});
```

### Layer 3: Command Tests

**Scope:**

- CLI command parsing
- Command handler execution
- Error handling and messages
- Output formatting

**Key Test Scenarios:**

1. **Get Operations**
   - Get simple value: Should display value
   - Get nested value: Should display nested value
   - Get non-existent value: Should show "not set" message
   - Get with --global: Should read from user config
   - Get with --workspace: Should read from workspace metadata

2. **Set Operations**
   - Set simple value: Should save to config file
   - Set nested value: Should create structure and save
   - Set with validation: Should validate against schema
   - Set invalid value: Should fail with error message
   - Set with --global: Should save to user config
   - Set with --workspace: Should save to workspace metadata

3. **Array Operations**
   - Add to array: Should append and save
   - Remove from array: Should delete and save
   - Unset array: Should delete key entirely

4. **Key Discovery**
   - List keys: Should display all keys grouped by category
   - List keys with JSON: Should output valid JSON
   - Show current values: Should display effective values with source

**Example Test:**

```typescript
describe('Config set command', () => {
  it('should set nested value and save to file', async () => {
    // Execute: claude-iterate config verification.depth deep

    const saved = JSON.parse(await fs.readFile(projectConfigPath));
    expect(saved.verification.depth).toBe('deep');
  });
});
```

## Error Scenarios

### Error Test Cases

1. **Missing Key**
   - Condition: Run `claude-iterate config` with no key and no --list/--keys flag
   - Expected: Exit 1 with message "Configuration key required. Use --keys to see all available keys."
   - Verification: Check exit code and stderr output

2. **Invalid Schema**
   - Condition: Set value that violates schema constraints (e.g., negative number for defaultMaxIterations)
   - Expected: Exit 1 with Zod validation error message
   - Verification: Check exit code and error message contains field name

3. **Array Operation on Non-Array**
   - Condition: Run `claude-iterate config outputLevel --add value`
   - Expected: Exit 1 with message "Key 'outputLevel' is not an array"
   - Verification: Check exit code and error message

4. **Workspace Not Found**
   - Condition: Run `claude-iterate config --workspace invalid-name key value`
   - Expected: Exit 1 with workspace not found error
   - Verification: Check exit code and error message

5. **Invalid Config File**
   - Condition: Manually corrupt config JSON file
   - Expected: Exit 1 with JSON parse error
   - Verification: Check exit code and error message

## Edge Cases

1. **Concurrent Config Writes**
   - Condition: Multiple processes writing to same config file simultaneously
   - Expected Behavior: Last write wins (no lock mechanism)
   - Test: Spawn multiple processes, verify final state
   - Note: Document limitation in SPEC.md

2. **Very Long Dot Notation Path**
   - Condition: Create deeply nested config like `a.b.c.d.e.f.g.h`
   - Expected Behavior: Should work correctly up to reasonable depth
   - Test: Verify get/set/unset work with 10+ levels

3. **Special Characters in Values**
   - Condition: Set value with quotes, newlines, unicode
   - Expected Behavior: JSON encoding handles correctly
   - Test: Set value `{"test": "with \"quotes\" and\nnewlines"}`, verify correct storage

4. **Empty String vs Undefined**
   - Condition: Set key to empty string vs unset key
   - Expected Behavior: Empty string is valid value, undefined is missing
   - Test: Verify `config key ""` sets empty string, `config key --unset` removes key

5. **Tilde in Non-Path Fields**
   - Condition: Set non-path field to value starting with `~`
   - Expected Behavior: No expansion (only specific path fields expanded)
   - Test: Set `notifyUrl` to `~/test`, verify stored literally

## Test Data Requirements

### Test Fixtures

**Valid Configs:**

```typescript
const validProjectConfig = {
  defaultMaxIterations: 50,
  defaultDelay: 2,
  outputLevel: 'progress',
  verification: {
    depth: 'standard',
    autoVerify: true,
  },
};

const validUserConfig = {
  globalTemplatesDir: '~/.config/claude-iterate/templates',
  defaultMaxIterations: 100,
  colors: true,
};

const validWorkspaceConfig = {
  outputLevel: 'verbose',
  verification: {
    depth: 'deep',
  },
};
```

**Invalid Configs:**

```typescript
const invalidProjectConfig = {
  defaultMaxIterations: -5, // Violates min constraint
  outputLevel: 'invalid', // Not in enum
};
```

### Test Directories

- Use temporary directories for each test suite
- Clean up after each test (delete temp files)
- Mock home directory for user config tests
- Mock workspace directories for workspace config tests

## Security Testing

**Security Test Cases:**

- [ ] Dangerously-skip-permissions warning: Should display when flag added to claude.args
- [ ] Path traversal attempts: Should allow (user controls their config)
- [ ] Config file permissions: Should respect OS file permissions (no explicit checks)
- [ ] Sensitive values logging: Should not log full config values in errors (only keys)

## Performance Benchmarks

| Operation                | Target | Acceptable | Unacceptable |
| ------------------------ | ------ | ---------- | ------------ |
| Load config (all layers) | <30ms  | <50ms      | >100ms       |
| Schema validation        | <20ms  | <30ms      | >50ms        |
| Flatten config           | <10ms  | <20ms      | >50ms        |
| Schema inspection        | <50ms  | <100ms     | >200ms       |
| Format keys for display  | <100ms | <200ms     | >500ms       |

**Performance Test Scenarios:**

1. **Load time with all configs**: Measure time to load user + project + workspace
2. **Schema validation time**: Measure time to validate large config object
3. **Key formatting time**: Measure time to format and display all keys

## Testing Strategy

### Local Development

- Run unit tests on file save: `npm test -- --watch`
- Run integration tests before commit: `npm test tests/integration`
- Run full suite before push: `npm test`

### CI/CD Pipeline

- Run all tests on every pull request
- Fail build if coverage <80%
- Run lint and typecheck before tests
- No real file system writes (use temp directories)

### Test Environments

- **Local**: Developer machines with mocked file system where possible
- **CI**: GitHub Actions with temp directories for file tests
- **No staging**: Config is local-only, no staging environment needed

## Test Maintenance

- Update tests when adding new config keys
- Update schema tests when validation rules change
- Keep test fixtures in sync with actual schemas
- Review test coverage reports quarterly
- Refactor duplicate test setup into helpers

---

## Test Checklist

Before marking configuration feature as tested:

- [x] All unit tests written and passing
- [x] All integration tests written and passing
- [x] All error scenarios tested
- [x] All edge cases covered
- [x] Security tests passing
- [x] Performance benchmarks met
- [x] Test coverage ≥80% line coverage
- [x] Tests documented and maintainable
- [x] CI/CD pipeline runs tests successfully
- [x] 228 tests passing in full suite
