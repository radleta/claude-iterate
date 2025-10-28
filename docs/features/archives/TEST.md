# Testing Specification: Archives

## Test Coverage Targets

- **Unit Test Coverage**: ≥80% line coverage for ArchiveManager class
- **Integration Test Coverage**: All CLI commands (archive save, list, restore, show, delete)
- **End-to-End Test Coverage**: Complete archive → restore workflow
- **Performance Test Coverage**: Archive/restore operations for workspaces up to 1GB

## Testing Layers

### Layer 1: Unit Tests

**Scope:**

- ArchiveManager class methods
- Archive metadata validation
- Tarball creation and extraction
- Error handling logic

**Test File:** `tests/unit/archive-manager.test.ts`

**Key Test Scenarios:**

1. **archive() Method**
   - Valid workspace: Creates .tar.gz tarball with correct naming
   - Non-existent workspace: Throws "Workspace not found" error
   - Metadata creation: Embeds valid .archived.json with correct schema
   - Timestamp format: Archive name matches pattern `{name}-YYYY-MM-DDTHH-MM-SS`
   - Expected: Archive name returned, tarball exists at expected path

2. **listArchives() Method**
   - Multiple archives: Returns all archives sorted newest first
   - Empty archive directory: Returns empty array (no error)
   - Missing archive directory: Returns empty array (no error)
   - Invalid archives: Skips archives without metadata, continues processing
   - Legacy format: Lists both .tar.gz and directory archives
   - Expected: Array of {name, metadata} objects sorted by archivedAt descending

3. **restore() Method**
   - Valid archive: Restores workspace with all files intact
   - Custom name: Restores to specified workspace name
   - Metadata cleanup: Removes .archived.json from restored workspace
   - Non-existent archive: Throws "Archive not found" error
   - Existing workspace: Throws "Workspace already exists" error
   - Content preservation: All files restored with exact content
   - Expected: Workspace name returned, workspace exists with correct files

4. **getArchive() Method**
   - Valid archive: Returns {name, metadata, path} object
   - Tarball format: Returns path to .tar.gz file
   - Legacy format: Returns path to directory
   - Non-existent archive: Throws "Archive not found" error
   - Expected: Metadata matches schema, path is absolute

5. **delete() Method**
   - Valid archive: Removes tarball or directory
   - Non-existent archive: Throws "Archive not found" error
   - Tarball format: Deletes .tar.gz file
   - Legacy format: Deletes directory recursively
   - Expected: Archive no longer exists after deletion

6. **exists() Method**
   - Existing archive: Returns true
   - Non-existent archive: Returns false
   - Both formats: Checks .tar.gz and directory
   - Expected: Boolean result without throwing errors

**Example Test:**

```typescript
describe('ArchiveManager', () => {
  describe('archive()', () => {
    it('should create .tar.gz tarball', async () => {
      const wsPath = path.join(workspacesDir, 'test-workspace');
      await ensureDir(wsPath);
      await writeText(path.join(wsPath, 'TODO.md'), '# Test');

      const archiveName = await manager.archive('test-workspace');

      expect(archiveName).toMatch(
        /^test-workspace-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/
      );
      expect(
        await pathExists(path.join(archiveDir, `${archiveName}.tar.gz`))
      ).toBe(true);
    });

    it('should throw for non-existent workspace', async () => {
      await expect(manager.archive('nonexistent')).rejects.toThrow(
        'Workspace not found'
      );
    });
  });
});
```

### Layer 2: Integration Tests

**Scope:**

- CLI command execution
- Commander.js argument parsing
- Logger output formatting
- Config integration

**Status:** Not yet implemented (future work)

**Key Test Scenarios:**

1. **archive save Command**
   - Success: Archives workspace and shows success message
   - With --keep: Archives workspace without removing it
   - Invalid workspace: Shows error message and exits with code 1
   - Output: Verifies emoji indicators and location path

2. **archive list Command**
   - Multiple archives: Displays formatted list with metadata
   - Empty state: Shows helpful message with usage hint
   - Alias ls: Works identically to list command

3. **archive restore Command**
   - Success: Restores workspace and shows next steps
   - Custom name: Restores to specified name
   - Existing workspace: Shows error and exits with code 1
   - Non-existent archive: Shows error and exits with code 1

4. **archive show Command**
   - Valid archive: Displays formatted metadata
   - Non-existent archive: Shows error and exits with code 1

5. **archive delete Command**
   - Without --force: Shows warning and exits with code 0
   - With --force: Deletes archive and shows success
   - Non-existent archive: Shows error and exits with code 1

**Example Integration Test (Planned):**

```typescript
describe('archive CLI', () => {
  it('should archive and restore workspace', async () => {
    // Create workspace
    await exec('claude-iterate init test-workspace');

    // Archive it
    const archiveOutput = await exec(
      'claude-iterate archive save test-workspace --keep'
    );
    expect(archiveOutput).toContain('Workspace archived:');

    // List archives
    const listOutput = await exec('claude-iterate archive list');
    expect(listOutput).toContain('test-workspace-');

    // Remove workspace
    await exec('claude-iterate clean test-workspace --force');

    // Restore from archive
    const restoreOutput = await exec(
      'claude-iterate archive restore test-workspace-*'
    );
    expect(restoreOutput).toContain('Archive restored: test-workspace');

    // Verify workspace exists
    const showOutput = await exec('claude-iterate show test-workspace');
    expect(showOutput).toContain('test-workspace');
  });
});
```

### Layer 3: End-to-End Tests

**Scope:**

- Complete user workflows
- Multi-command sequences
- Real filesystem operations

**Status:** Not yet implemented (future work)

**Key User Flows:**

1. **Archive and Restore Workflow**
   - Step 1: Create workspace with init → Workspace exists
   - Step 2: Archive workspace → Archive created, workspace removed
   - Step 3: List archives → Archive appears in list
   - Step 4: Restore archive → Workspace recreated with same content
   - Validation: Restored workspace matches original exactly

2. **Archive Management Workflow**
   - Step 1: Create multiple workspaces → Multiple workspaces exist
   - Step 2: Archive all workspaces → Multiple archives created
   - Step 3: Show archive details → Metadata displayed correctly
   - Step 4: Delete old archive → Archive removed
   - Validation: Only remaining archives shown in list

### Layer 4: Performance Tests

**Performance Benchmarks:**

| Operation         | Workspace Size | Target | Acceptable | Unacceptable |
| ----------------- | -------------- | ------ | ---------- | ------------ |
| archive()         | 100MB          | <5s    | <10s       | >30s         |
| restore()         | 100MB          | <5s    | <10s       | >30s         |
| listArchives()    | 100 archives   | <100ms | <500ms     | >2s          |
| extractMetadata() | Per archive    | <200ms | <500ms     | >2s          |
| Compression ratio | Text files     | >60%   | >40%       | <20%         |

**Load Test Scenarios:**

1. **Large Workspace Archive**
   - Workspace: 1GB with 10,000 files
   - Operation: archive()
   - Target: <30 seconds
   - Memory: <512MB

2. **Many Archives List**
   - Archives: 1000 archives
   - Operation: listArchives()
   - Target: <1 second
   - Memory: <256MB

3. **Concurrent Operations**
   - Scenario: 5 parallel archive operations
   - Target: No conflicts, all succeed
   - Validation: Unique temp directories, unique archive names

**Example Performance Test (Planned):**

```typescript
describe('Performance', () => {
  it('should archive 100MB workspace in <10s', async () => {
    // Create 100MB workspace
    const wsPath = path.join(workspacesDir, 'large-workspace');
    await createLargeWorkspace(wsPath, 100 * 1024 * 1024);

    const start = Date.now();
    await manager.archive('large-workspace');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10000); // 10 seconds
  });
});
```

## Error Scenarios

### Error Test Cases

1. **Invalid Workspace Name**
   - Input: Non-existent workspace name
   - Expected: Error "Workspace not found: {name}", exit code 1

2. **Archive Already Exists Conflict**
   - Input: Restore to existing workspace name
   - Expected: Error "Workspace already exists: {name}", exit code 1

3. **Archive Not Found**
   - Input: Non-existent archive name
   - Expected: Error "Archive not found: {name}", exit code 1

4. **Corrupted Archive**
   - Input: Invalid .tar.gz file
   - Expected: Error from tar package, exit code 1

5. **Missing Metadata**
   - Input: Tarball without .archived.json
   - Expected: Error "No metadata file found in archive", exit code 1

6. **Invalid Metadata Schema**
   - Input: Archive with invalid .archived.json
   - Expected: Zod validation error, exit code 1

7. **Filesystem Permission Errors**
   - Input: Archive directory not writable
   - Expected: Filesystem error, exit code 1

8. **Delete Without --force**
   - Input: delete command without --force flag
   - Expected: Warning message, exit code 0 (not error)

## Edge Cases

1. **Concurrent Archive Creation**
   - Condition: Two archive operations for same workspace simultaneously
   - Expected Behavior: Both succeed with unique names (different timestamps)
   - Test: Verify unique temp directories, verify both tarballs created

2. **Very Large Workspace**
   - Condition: Workspace >1GB
   - Expected Behavior: Archive succeeds within performance target
   - Test: Measure time and memory usage

3. **Special Characters in Filenames**
   - Condition: Workspace contains unicode or special characters
   - Expected Behavior: All filenames preserved correctly
   - Test: Create workspace with unicode files, archive, restore, verify names

4. **Empty Workspace**
   - Condition: Workspace directory exists but is empty
   - Expected Behavior: Archive created with only metadata
   - Test: Archive empty workspace, restore, verify empty directory

5. **Legacy Directory Archive**
   - Condition: Existing directory-based archive from older version
   - Expected Behavior: List, show, restore, delete all work
   - Test: Create legacy format, test all operations

6. **Temp Directory Cleanup Failure**
   - Condition: Temp directory cannot be deleted
   - Expected Behavior: Operation succeeds, cleanup logged but does not fail
   - Test: Mock fs.rm to fail, verify archive still created

7. **Archive Directory Missing**
   - Condition: Archive directory does not exist
   - Expected Behavior: Created on save, list returns empty array
   - Test: Delete archive directory, call listArchives(), verify empty array

8. **System Tmpdir Full**
   - Condition: No space in os.tmpdir()
   - Expected Behavior: Error with clear message
   - Test: Mock ensureDir to fail with ENOSPC

## Test Data Requirements

### Test Database

Not applicable (filesystem-based feature)

### Test Workspaces

```typescript
// Small workspace (for basic tests)
const smallWorkspace = {
  name: 'test-workspace',
  files: {
    'TODO.md': '# TODO',
    'INSTRUCTIONS.md': '# Instructions',
    '.metadata.json': '{"version": 1}',
  },
};

// Medium workspace (for integration tests)
const mediumWorkspace = {
  name: 'medium-workspace',
  files: {
    'TODO.md': '# TODO with 100 lines...',
    'INSTRUCTIONS.md': '# Instructions...',
    '.metadata.json': '{"version": 1}',
    'iterate-20251028-140000.log': 'Log content...',
    'working/file1.txt': 'Content...',
    'working/file2.txt': 'Content...',
  },
  size: '~1MB',
};

// Large workspace (for performance tests)
const largeWorkspace = {
  name: 'large-workspace',
  files: '10,000 files totaling 100MB',
};
```

### Test Fixtures

```typescript
// Valid archive metadata
const validMetadata: ArchiveMetadata = {
  originalName: 'test-workspace',
  archiveName: 'test-workspace-2025-10-28T14-30-00',
  archivedAt: '2025-10-28T14:30:00Z',
  archivedFrom: '/path/to/workspaces/test-workspace',
};

// Invalid metadata (missing field)
const invalidMetadata = {
  originalName: 'test-workspace',
  // Missing archiveName
  archivedAt: '2025-10-28T14:30:00Z',
  archivedFrom: '/path/to/workspaces/test-workspace',
};
```

## Security Testing

**Security Test Cases:**

- [x] Directory traversal: Archive names with `../` rejected
- [x] Path injection: Archive paths validated against archiveDir
- [x] Temp directory security: Uses crypto.randomBytes for unpredictable names
- [x] Metadata injection: Zod schema prevents invalid metadata
- [x] Filesystem permissions: Respects OS permissions, no privilege escalation
- [x] Content validation: No execution of workspace content during archive
- [ ] Archive bomb: Large compressed archives handled gracefully (future work)
- [ ] Symlink attacks: Symlinks inside archives handled safely (future work)

## Testing Strategy

### Local Development

- Run unit tests on every file save: `npm test -- --watch`
- Run full test suite before committing: `npm test`
- Check coverage: `npm run coverage`
- Target: ≥80% line coverage, ≥80% branch coverage

### CI/CD Pipeline

- Run all unit tests on every pull request
- Block merge if tests fail
- Block merge if coverage drops below 80%
- Run type checking: `npm run typecheck`
- Run linting: `npm run lint`

### Test Environments

- **Local**: Developer machines with temp directories
- **CI**: GitHub Actions with Ubuntu/Windows/macOS runners
- **Manual Testing**: Real workspaces archived and restored

## Test Maintenance

- Update tests when SPEC.md changes
- Add regression tests for any bugs found
- Keep test fixtures synchronized with ArchiveMetadata schema
- Review performance benchmarks quarterly
- Update integration tests when CLI commands change

---

## Test Checklist

### Unit Tests

- [x] All ArchiveManager methods tested
- [x] All error cases covered
- [x] All edge cases covered
- [x] Coverage ≥80% achieved

### Integration Tests

- [ ] CLI commands tested (future work)
- [ ] Error messages validated (future work)
- [ ] Output formatting verified (future work)

### End-to-End Tests

- [ ] Complete workflows tested (future work)
- [ ] Multi-command sequences validated (future work)

### Performance Tests

- [ ] Large workspace benchmarks (future work)
- [ ] Many archives benchmarks (future work)
- [ ] Concurrent operations tested (future work)

### Security Tests

- [x] Path validation tested
- [x] Temp directory security verified
- [x] Metadata validation tested
- [ ] Archive bomb handling (future work)
- [ ] Symlink safety (future work)
