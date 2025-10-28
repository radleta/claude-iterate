# Testing Specification: Workspace Management

## Test Coverage Targets

- **Unit Test Coverage**: >=80% line coverage for workspace.ts, metadata.ts, and command files
- **Integration Test Coverage**: All CLI commands tested with ConfigManager integration
- **End-to-End Test Coverage**: Critical user workflows (init → setup → run → clean)
- **Error Scenario Coverage**: All error conditions from SPEC.md tested

## Testing Layers

### Layer 1: Unit Tests

**Scope:**

- Workspace class methods
- MetadataManager class methods
- Path validation utilities
- Error handling logic

**Key Test Scenarios:**

#### Workspace Class (`tests/unit/workspace.test.ts`)

1. **Workspace.init()**
   - Valid input: Creates workspace with default settings (status: in_progress, totalIterations: 0)
   - Custom options: Creates workspace with maxIterations=100, delay=5, stagnationThreshold=5, notifyUrl
   - Already exists: Throws WorkspaceExistsError
   - Creates directory structure: .metadata.json, TODO.md, working/ subdirectory
   - Loop mode default: Metadata.mode = 'loop' when no mode specified
   - Iterative mode: Metadata.mode = 'iterative' when mode='iterative' option provided

2. **Workspace.load()**
   - Existing workspace: Loads successfully with correct name and path
   - Not found: Throws WorkspaceNotFoundError for non-existent workspace
   - Missing metadata: Throws WorkspaceNotFoundError for directory without .metadata.json

3. **Workspace.isComplete()**
   - Not complete: Returns false when .status.json has complete=false
   - Complete: Returns true when .status.json has complete=true
   - Mode-aware: Uses loop mode logic for loop mode workspaces
   - Mode-aware: Uses iterative mode logic for iterative mode workspaces

4. **Workspace.getCompletionStatus()**
   - Returns object with: isComplete, hasTodo, hasInstructions, remainingCount
   - Loop mode: Calculates remainingCount from progress.total - progress.completed
   - Iterative mode: Calculates remainingCount from progress.total - progress.completed

5. **Workspace.getRemainingCount()**
   - Loop mode: Returns progress.total - progress.completed
   - Iterative mode: Returns progress.total - progress.completed
   - No status file: Returns null

6. **Workspace.hasInstructions()**
   - File exists: Returns true when INSTRUCTIONS.md exists
   - File missing: Returns false when INSTRUCTIONS.md does not exist

7. **Workspace.getInstructions() / writeInstructions()**
   - Read: Returns content of INSTRUCTIONS.md
   - Write: Creates INSTRUCTIONS.md with provided content
   - Round-trip: Write then read returns same content

8. **Workspace.incrementIterations()**
   - Setup type: Increments totalIterations and setupIterations by 1
   - Execution type: Increments totalIterations and executionIterations by 1
   - Updates lastRun: Sets lastRun timestamp on each increment

9. **Workspace.markCompleted()**
   - Sets status: Changes metadata.status to 'completed'
   - Updates timestamp: Sets lastRun to current timestamp

10. **Workspace.markError()**
    - Sets status: Changes metadata.status to 'error'
    - Updates timestamp: Sets lastRun to current timestamp

11. **Workspace.resetIterations()**
    - Resets counts: Sets totalIterations, setupIterations, executionIterations to 0
    - Resets status: Changes status to 'in_progress'

12. **Workspace.getInfo()**
    - Returns aggregate info: name, path, status, totalIterations, hasInstructions, hasTodo, isComplete, remainingCount, created, lastRun
    - All fields defined: No undefined values in returned object

13. **Path helpers**
    - getTodoPath(): Returns absolute path to TODO.md
    - getInstructionsPath(): Returns absolute path to INSTRUCTIONS.md
    - getWorkingDir(): Returns absolute path to working/ subdirectory

#### MetadataManager Class (`tests/unit/metadata.test.ts`)

1. **MetadataManager.create()**
   - Valid metadata: Creates object with name, status='in_progress', totalIterations=0
   - Default values: maxIterations=50, delay=2, stagnationThreshold=2, notifyEvents=['all']

2. **MetadataManager.read() / write()**
   - Write then read: Returns same metadata object
   - Validation: Throws InvalidMetadataError for invalid schema (empty name)

3. **MetadataManager.exists()**
   - File exists: Returns true when .metadata.json exists
   - File missing: Returns false when .metadata.json does not exist

4. **MetadataManager.update()**
   - Partial update: Updates specified fields, preserves others
   - Multiple fields: Can update status and totalIterations simultaneously

5. **MetadataManager.incrementIterations()**
   - Setup: Increments totalIterations and setupIterations
   - Execution: Increments totalIterations and executionIterations
   - Timestamp: Updates lastRun on each increment

6. **MetadataManager.markCompleted()**
   - Status change: Sets status='completed'
   - Timestamp: Updates lastRun

7. **MetadataManager.markError()**
   - Status change: Sets status='error'
   - Timestamp: Updates lastRun

8. **MetadataManager.resetIterations()**
   - Resets counts: totalIterations=0, setupIterations=0, executionIterations=0
   - Resets status: status='in_progress'

9. **MetadataManager.getPath()**
   - Returns correct path: path.join(workspacePath, '.metadata.json')

#### Show Command Error Handling (`tests/unit/commands/show.test.ts`)

1. **WorkspaceNotFoundError handling**
   - Clean message: Displays "Workspace not found: name" without stack trace
   - Exit code: Exits with code 1

2. **Generic error handling**
   - Stack trace: Displays error with stack trace for non-workspace errors
   - Exit code: Exits with code 1

3. **Error type distinction**
   - WorkspaceNotFoundError: Is instance of WorkspaceNotFoundError
   - Generic errors: Are not instance of WorkspaceNotFoundError

#### Config Command Handlers (`tests/unit/commands/config.test.ts`)

1. **Config file operations**
   - No config: Returns defaults when config file does not exist
   - Read project config: Loads values from .claude-iterate.json
   - Write project config: Persists values to file

2. **Getting config values**
   - Simple value: Retrieves top-level config value
   - Nested value: Retrieves nested config value (verification.depth)
   - Missing key: Returns undefined for non-existent keys

3. **Setting config values**
   - Simple value: Sets top-level value
   - Nested value: Sets nested value, preserves siblings
   - Create structure: Creates nested structure when setting deep path
   - Overwrite: Overwrites existing values

4. **Array operations**
   - Add to empty: Creates array and adds item
   - Add to existing: Appends item to existing array
   - Prevent duplicates: Does not add duplicate items
   - Remove item: Filters out specified item
   - Remove non-existent: No change when removing non-existent item
   - Remove from empty: No error when removing from empty array

5. **Unsetting values**
   - Simple value: Deletes top-level key
   - Nested value: Deletes nested key, preserves siblings
   - Non-existent key: No error when unsetting non-existent key

6. **Config inheritance**
   - CLI priority: CLI options override config file
   - Config fallback: Uses config file when no CLI options
   - Default fallback: Uses defaults when no config exists

7. **Schema validation**
   - Enum values: Accepts valid enum values (outputLevel: 'verbose')
   - Number constraints: Accepts numbers within valid range

8. **ConfigManager integration**
   - Effective values: Resolves effective values with correct sources
   - Default source: Shows 'default' source when no overrides

### Layer 2: Integration Tests

**Scope:**

- CLI commands with full stack (command → Workspace → MetadataManager → FileSystem)
- ConfigManager integration
- ArchiveManager integration

**Key Test Scenarios:**

1. **Init command integration**
   - Creates workspace directory at configured path
   - Writes valid .metadata.json
   - Creates working/ subdirectory
   - Creates TODO.md placeholder
   - Integrates with ConfigManager for workspace directory resolution
   - Displays success message with workspace info

2. **List command integration**
   - Scans workspace directory
   - Loads metadata for each workspace
   - Filters by status when --status flag provided
   - Displays table with status icons, iterations, remaining count
   - Shows Claude configuration
   - Handles empty workspace directory gracefully

3. **Show command integration**
   - Loads workspace metadata
   - Loads .status.json
   - Checks for INSTRUCTIONS.md and TODO.md
   - Displays all sections: status, progress, files, settings, Claude config, timestamps, actions
   - Handles missing files gracefully (shows ✗ indicators)

4. **Clean command integration**
   - Archives workspace using ArchiveManager
   - Deletes workspace directory
   - Requires --force in non-interactive mode
   - Supports --no-archive flag to skip archiving
   - Displays archive location and success message

5. **Reset command integration**
   - Loads workspace
   - Updates metadata (resets iteration counts)
   - Preserves workspace files (INSTRUCTIONS.md, TODO.md, .status.json)
   - Displays before/after iteration counts

### Layer 3: End-to-End Tests

**Scope:**

- Complete user workflows from CLI
- Multi-command sequences
- Real filesystem operations

**Key User Flows:**

1. **New workspace workflow**
   - Step 1: `init my-task` → Workspace created
   - Step 2: `show my-task` → Displays "Instructions: ✗"
   - Step 3: `setup my-task` → Instructions created (tested in setup feature)
   - Step 4: `show my-task` → Displays "Instructions: ✓"
   - Validation: All files exist, metadata valid, ready for run command

2. **List and filter workflow**
   - Step 1: Create 3 workspaces with different statuses
   - Step 2: `list` → Shows all 3 workspaces
   - Step 3: `list --status completed` → Shows only completed workspace
   - Step 4: `list --status in_progress` → Shows only in_progress workspaces
   - Validation: Filter works correctly, status icons match

3. **Clean workflow**
   - Step 1: Create workspace
   - Step 2: `clean my-task --force` → Archives and deletes
   - Step 3: `list` → Workspace no longer listed
   - Step 4: Check archive directory → Archive file exists
   - Validation: Workspace removed, archive created

4. **Reset workflow**
   - Step 1: Create workspace, increment iterations to 10
   - Step 2: `show my-task` → Shows 10 iterations
   - Step 3: `reset my-task` → Resets count
   - Step 4: `show my-task` → Shows 0 iterations, status=in_progress
   - Validation: Counts reset, files preserved

### Layer 4: Performance Tests

**Performance Benchmarks:**

| Operation                             | Target  | Acceptable | Unacceptable |
| ------------------------------------- | ------- | ---------- | ------------ |
| Workspace init                        | < 100ms | < 200ms    | > 500ms      |
| List 100 workspaces                   | < 500ms | < 1000ms   | > 2000ms     |
| Show workspace                        | < 50ms  | < 100ms    | > 200ms      |
| Reset workspace                       | < 50ms  | < 100ms    | > 200ms      |
| Clean workspace (no archive)          | < 100ms | < 200ms    | > 500ms      |
| Clean workspace (with archive <100MB) | < 2s    | < 5s       | > 10s        |

**Load Test Scenarios:**

1. **Normal Load**: Init 10 workspaces sequentially within 2 seconds
2. **List Performance**: List 100 workspaces within 500ms
3. **Concurrent Access**: Multiple processes reading same workspace metadata (no corruption)

## Error Scenarios

### Error Test Cases

1. **Invalid workspace name**
   - Input: `init "my task"` (spaces)
   - Expected: Exit code 1, message "Invalid workspace name. Use only letters, numbers, hyphens, and underscores."

2. **Workspace already exists**
   - Input: `init my-task` (when my-task already exists)
   - Expected: Exit code 1, message "Workspace 'my-task' already exists"

3. **Workspace not found**
   - Input: `show nonexistent`
   - Expected: Exit code 1, message "Workspace not found: nonexistent"

4. **Invalid metadata file**
   - Condition: Corrupt .metadata.json (invalid JSON)
   - Expected: Exit code 1, message "Metadata validation failed: [details]"

5. **File system error**
   - Condition: Permission denied when creating workspace directory
   - Expected: Exit code 1, message "Failed to initialize workspace: [system error]"

6. **Clean without --force in CI**
   - Input: `clean my-task` (in non-interactive mode without --force)
   - Expected: Exit code 1, message "Cannot prompt in non-interactive mode. Use --force to confirm."

7. **Invalid option values**
   - Input: `init my-task --max-iterations 0`
   - Expected: Exit code 1, message about invalid max iterations

8. **Invalid mode**
   - Input: `init my-task --mode invalid`
   - Expected: Exit code 1, message about invalid mode

## Edge Cases

### Edge Case Tests

1. **Empty workspaces directory**
   - Condition: No workspaces exist
   - Test: `list` command
   - Expected: "No workspaces found. Initialize a workspace: claude-iterate init <name>"

2. **Missing status file**
   - Condition: .status.json does not exist
   - Test: `show my-task` command
   - Expected: Shows workspace info, marks as not complete

3. **Corrupted status file**
   - Condition: .status.json contains invalid JSON
   - Test: `show my-task` command
   - Expected: Shows validation warnings, continues operation

4. **Unicode in workspace name**
   - Input: `init café`
   - Expected: Exit code 1, validation error (non-ASCII rejected)

5. **Maximum length workspace name**
   - Input: `init ` + 255 character string
   - Expected: Success or validation error based on filesystem limits

6. **Special characters in workspace name**
   - Input: `init my/task`, `init my.task`, `init my..task`
   - Expected: Exit code 1, validation error for all cases

7. **Concurrent workspace creation**
   - Condition: Two processes try to create same workspace simultaneously
   - Expected: One succeeds, one gets WorkspaceExistsError (no corruption)

8. **Reset during execution**
   - Condition: Reset command run while workspace is being executed
   - Expected: Metadata update succeeds (no file locking), iteration count unpredictable but no data corruption

9. **Archive failure**
   - Condition: Archive directory not writable
   - Expected: Clean command fails, workspace not deleted, error message displayed

10. **Missing INSTRUCTIONS.md**
    - Condition: INSTRUCTIONS.md deleted manually
    - Test: `show my-task` command
    - Expected: Shows "Instructions: ✗", suggests setup command

## Test Data Requirements

### Test Database

- Use temporary directories for all tests (`tests/setup.ts` provides `getTestDir()`)
- Clean up test directories after each test
- No shared state between tests

### Test Workspaces

- **Minimal workspace**: Only .metadata.json and TODO.md
- **Complete workspace**: .metadata.json, TODO.md, INSTRUCTIONS.md, .status.json, working/, iterate-\*.log
- **Corrupted workspace**: Invalid .metadata.json, missing files
- **Multi-mode workspaces**: One loop mode, one iterative mode

### Test Fixtures

```typescript
// Minimal metadata fixture
const minimalMetadata = {
  name: 'test-workspace',
  created: '2025-10-28T10:00:00Z',
  status: 'in_progress',
  mode: 'loop',
  totalIterations: 0,
  setupIterations: 0,
  executionIterations: 0,
  maxIterations: 50,
  delay: 2,
  stagnationThreshold: 2,
  notifyEvents: ['all'],
};

// Complete status fixture
const completeStatus = {
  complete: true,
  progress: { completed: 10, total: 10 },
  summary: 'All tasks completed',
  lastUpdated: '2025-10-28T14:00:00Z',
};

// In-progress status fixture
const inProgressStatus = {
  complete: false,
  progress: { completed: 5, total: 10 },
  summary: '5 of 10 tasks completed',
  lastUpdated: '2025-10-28T14:00:00Z',
};
```

## Security Testing

**Security Test Cases:**

- [ ] Directory traversal: `init ../../malicious` rejected by name validation
- [ ] Path injection: `init malicious/../../etc/passwd` rejected by name validation
- [ ] Command injection: Workspace names with shell metacharacters rejected
- [ ] Metadata injection: Invalid metadata rejected by Zod schema validation
- [ ] Symlink attacks: Workspace creation does not follow symlinks
- [ ] File permissions: Created files have appropriate permissions (no execute)

## Testing Strategy

### Local Development

- Run unit tests on every file save: `npm test -- --watch`
- Run full test suite before committing: `npm test`
- Check coverage: `npm run test:coverage` (must meet >=80% target)

### CI/CD Pipeline

- Run all tests on every pull request
- Block merge if tests fail or coverage drops below 80%
- Run performance tests on staging before production deploy
- Run security linting (no credentials, no command injection)

### Test Environments

- **Local**: Developer machines with temporary test directories
- **CI**: Automated test environment with clean state per test
- **Staging**: Production-like environment for integration tests
- **Production**: Monitoring only (no test suite execution)

## Test Maintenance

- Update tests when SPEC.md changes (validation rules, error messages, schemas)
- Remove obsolete tests when features are deprecated
- Refactor tests to use shared fixtures and helpers
- Keep test data fixtures synchronized with schema changes (Metadata, Status)
- Review and update performance benchmarks when implementation changes

---

## Test Checklist

### Unit Tests

- [x] All Workspace methods tested
- [x] All MetadataManager methods tested
- [x] Path validation utilities tested
- [x] Error handling tested
- [x] Mode-specific behavior tested

### Integration Tests

- [x] ConfigManager integration tested
- [x] ArchiveManager integration tested
- [x] Show command error handling tested
- [x] Config command handlers tested

### Coverage

- [x] Workspace.ts >=80% line coverage
- [x] Metadata.ts >=80% line coverage
- [x] Command files tested for error paths

### Error Scenarios

- [x] Invalid workspace name tested
- [x] Workspace already exists tested
- [x] Workspace not found tested
- [x] Invalid metadata tested
- [x] File system errors handled

### Edge Cases

- [x] Empty workspace directory tested
- [x] Missing status file tested
- [x] Unicode rejection tested
- [x] Special characters rejection tested

### Security

- [x] Directory traversal prevented
- [x] Path injection prevented
- [x] Name validation prevents shell injection
- [x] Metadata validation prevents malformed data
