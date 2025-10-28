# Testing Specification: Verification

## Test Coverage Targets

- **Unit Test Coverage**: ≥80% line coverage for VerificationService and verify command
- **Integration Test Coverage**: All CLI command options and error scenarios
- **End-to-End Test Coverage**: Auto-verification and auto-resume workflows (manual testing)
- **Performance Test Coverage**: Verification duration benchmarks for each depth level

## Testing Layers

### Layer 1: Unit Tests

**Scope:**

- VerificationService.verify() method
- VerificationService.parseVerificationReport() method
- VerificationService.prepareResumeInstructions() method
- Report parsing logic
- Path resolution logic
- Error handling logic

**Key Test Scenarios:**

1. **verify() with quick depth**
   - Mock ClaudeClient to return mock output
   - Mock file system to return valid report
   - Verify prompt includes "quick" depth parameter
   - Verify result.status = "pass" for valid report
   - Verify reportPath is absolute

2. **verify() with standard depth**
   - Mock report with ❌ INCOMPLETE marker
   - Verify result.status = "fail"
   - Verify issueCount extracted correctly
   - Verify issues array populated from report

3. **verify() with deep depth**
   - Mock report with ✅ VERIFIED marker
   - Verify result.status = "pass"
   - Verify confidence level extracted
   - Verify recommended action extracted

4. **verify() with custom report path**
   - Provide custom absolute path
   - Verify fileExists called with custom path
   - Verify result.reportPath matches custom path

5. **verify() with relative report path**
   - Provide relative path like "./reports/verify.md"
   - Verify path converted to absolute using workspace path
   - Verify cross-platform compatibility (Windows vs Unix)

6. **verify() when Claude unavailable**
   - Mock ClaudeClient.isAvailable() returns false
   - Verify throws error with message "Claude CLI not available"

7. **verify() when Claude execution fails**
   - Mock executeNonInteractive() throws error
   - Verify error propagated with original message

8. **verify() when report not generated**
   - Mock fileExists() returns false
   - Verify throws error with helpful message including:
     - "Verification report not generated"
     - "Expected location:"
     - "Permission prompts blocked execution"
     - "--dangerously-skip-permissions"
     - Claude output for debugging

9. **parseVerificationReport() with VERIFIED COMPLETE status**
   - Report contains "✅ VERIFIED COMPLETE"
   - Verify result.status = "pass"
   - Verify summary extracted from ## Summary section
   - Verify confidence and recommendedAction extracted

10. **parseVerificationReport() with INCOMPLETE status**
    - Report contains "❌ INCOMPLETE"
    - Verify result.status = "fail"
    - Verify issueCount calculated from numbered list
    - Verify issues array contains issue names

11. **parseVerificationReport() with needs_review status (default)**
    - Report has no status markers
    - Verify result.status = "needs_review"
    - Verify fallback summary used if no ## Summary section

12. **parseVerificationReport() with issues list**
    - Report has "### Incomplete Requirements" section
    - Report has numbered list: "1. **Task A**: Description"
    - Verify issueCount = 3
    - Verify issues = ["Task A", "Task B", "Task C"]

13. **parseVerificationReport() with no issues**
    - Report has no "### Incomplete Requirements" section
    - Verify issueCount = 0
    - Verify issues = []

14. **prepareResumeInstructions() with issues**
    - Provide VerificationResult with 2 issues
    - Verify output contains "VERIFICATION FINDINGS"
    - Verify output contains issue count "2 issue(s)"
    - Verify output contains reportPath
    - Verify output contains numbered issues list
    - Verify output contains original instructions at end

15. **prepareResumeInstructions() with empty issues**
    - Provide VerificationResult with 0 issues
    - Verify output contains "See report for details"

**Example Test:**

```typescript
describe('VerificationService', () => {
  it('should generate verification report with quick depth', async () => {
    const { fileExists, readText } = await import('../../src/utils/fs.js');
    (fileExists as any).mockResolvedValue(true);
    (readText as any).mockResolvedValue(`
# Verification Report

## Summary

All tasks complete.

✅ VERIFIED COMPLETE

**Confidence Level**: High
**Recommended Action**: Mark complete
    `);

    const result = await service.verify(mockWorkspace, { depth: 'quick' });

    expect(result.status).toBe('pass');
    expect(result.confidence).toBe('high');
    expect(result.recommendedAction).toBe('Mark complete');
  });
});
```

### Layer 2: Integration Tests

**Scope:**

- CLI command execution (verify command)
- Option parsing and validation
- Error handling and exit codes
- Output formatting (JSON vs console)

**Key Test Scenarios:**

1. **verify command with workspace name**
   - Execute: `claude-iterate verify my-workspace`
   - Verify workspace loaded
   - Verify verification runs with default depth (standard)
   - Verify console output shows summary
   - Verify exit code 0 for pass, 1 for fail

2. **verify command with --depth flag**
   - Execute: `claude-iterate verify my-workspace --depth deep`
   - Verify prompt includes "deep" depth
   - Verify verification runs with deep analysis

3. **verify command with --report-path flag**
   - Execute: `claude-iterate verify my-workspace --report-path ./custom/report.md`
   - Verify custom path used
   - Verify path converted to absolute

4. **verify command with --json flag**
   - Execute: `claude-iterate verify my-workspace --json`
   - Verify output is valid JSON
   - Verify JSON contains all VerificationResult fields

5. **verify command with --show-report flag**
   - Execute: `claude-iterate verify my-workspace --show-report`
   - Verify full report printed to console

6. **verify command with --verbose flag**
   - Execute: `claude-iterate verify my-workspace --verbose`
   - Verify Claude output shown (via ConsoleReporter)

7. **verify command with --quiet flag**
   - Execute: `claude-iterate verify my-workspace --quiet`
   - Verify minimal output (errors only)

8. **verify command with conflicting flags**
   - Execute: `claude-iterate verify my-workspace --verbose --quiet`
   - Verify error: "Cannot use both --verbose and --quiet"
   - Verify exit code 1

9. **verify command with nonexistent workspace**
   - Execute: `claude-iterate verify nonexistent`
   - Verify error message about workspace not found
   - Verify exit code 1

10. **verify command with workspace missing instructions**
    - Create workspace without instructions
    - Execute: `claude-iterate verify my-workspace`
    - Verify error: "Instructions not found. Run setup first"
    - Verify exit code 1

11. **verify command with --dangerously-skip-permissions**
    - Execute: `claude-iterate verify my-workspace --dangerously-skip-permissions`
    - Verify flag added to claudeArgs runtime override
    - Verify warning message shown

12. **verify command updates workspace metadata**
    - Execute verification
    - Verify metadata.verification.lastVerificationStatus updated
    - Verify metadata.verification.lastVerificationTime updated
    - Verify metadata.verification.verificationAttempts incremented

### Layer 3: End-to-End Tests

**Scope:**

- Auto-verification integration with run command
- Auto-resume workflow
- Verification attempt limits
- Real workspace with real instructions (manual testing)

**Key User Flows:**

1. **Auto-verification on completion (passing)**
   - Step 1: Run workspace until completion
   - Step 2: Auto-verification triggered (autoVerify = true)
   - Step 3: Verification passes
   - Step 4: Workspace remains in "completed" status
   - Validation: Metadata shows verification passed, exit code 0

2. **Auto-verification on completion (failing) with auto-resume**
   - Step 1: Run workspace until completion (incomplete work)
   - Step 2: Auto-verification triggered and fails
   - Step 3: Auto-resume triggered (resumeOnFail = true)
   - Step 4: Workspace reset to in-progress
   - Step 5: Resume instructions prepended with verification findings
   - Step 6: Additional iterations run to fix issues
   - Step 7: Verification runs again and passes
   - Validation: Metadata shows verifyResumeCycles incremented, final status = completed

3. **Auto-verification with maxAttempts limit**
   - Step 1: Run workspace with maxAttempts = 2
   - Step 2: First verification fails, auto-resume runs
   - Step 3: Second verification fails
   - Step 4: Max attempts reached, no more resumes
   - Validation: Exit code 1, workspace status = completed (but incomplete)

4. **Manual verification after completion**
   - Step 1: Run workspace to completion
   - Step 2: Manually run `claude-iterate verify my-workspace`
   - Step 3: Review report
   - Validation: Report generated, exit code reflects status

5. **Verification with different depth levels**
   - Quick depth: Fast check, basic verification
   - Standard depth: Balanced analysis
   - Deep depth: Comprehensive review
   - Validation: Report detail increases with depth

### Layer 4: Performance Tests

**Performance Benchmarks:**

| Depth           | Target  | Acceptable | Unacceptable | Notes                       |
| --------------- | ------- | ---------- | ------------ | --------------------------- |
| Quick           | < 15s   | < 30s      | > 60s        | Simple task, ~500-1K tokens |
| Standard        | < 30s   | < 60s      | > 120s       | Typical task, ~2-4K tokens  |
| Deep            | < 60s   | < 120s     | > 300s       | Complex task, ~5-10K tokens |
| Report parsing  | < 10ms  | < 50ms     | > 100ms      | Regex-based parsing         |
| Metadata update | < 100ms | < 500ms    | > 1s         | JSON file write             |

**Load Test Scenarios:**

1. **Sequential verifications**: Run 10 verifications back-to-back, measure average duration
2. **Large workspace**: Verify workspace with 50+ files and 10K+ lines of code
3. **Deep verification stress**: Run deep verification on complex codebase

## Error Scenarios

### Error Test Cases

1. **Workspace not found**
   - Input: Nonexistent workspace name
   - Expected: Exit code 1, error message with workspace path
   - Verify: Error logged, helpful message shown

2. **Instructions not found**
   - Input: Workspace without instructions
   - Expected: Exit code 1, error message with setup command
   - Verify: Guidance provided to run setup

3. **Claude CLI not available**
   - Input: Claude not in PATH or not installed
   - Expected: Exit code 1, error message "Claude CLI not available"
   - Verify: Installation instructions provided

4. **Verification report not generated**
   - Input: Permission prompts block Claude execution
   - Expected: Exit code 1, detailed error with diagnostic info
   - Verify: Error includes suggestion to use --dangerously-skip-permissions

5. **Claude execution error**
   - Input: Claude crashes or returns error
   - Expected: Exit code 1, original Claude error message
   - Verify: Error logged with context

6. **Conflicting CLI flags**
   - Input: `--verbose --quiet`
   - Expected: Exit code 1, error "Cannot use both --verbose and --quiet"
   - Verify: Command exits before running verification

7. **Invalid depth value**
   - Input: `--depth invalid`
   - Expected: Exit code 1, Commander validation error
   - Verify: Valid values shown (quick, standard, deep)

8. **Unwritable report path**
   - Input: `--report-path /root/report.md` (no permissions)
   - Expected: Exit code 1, Claude fails to write report
   - Verify: Error message indicates permission issue

## Edge Cases

1. **Custom report path with missing parent directory**
   - Condition: `--report-path /new/dir/report.md` where `/new/dir` doesn't exist
   - Expected Behavior: Parent directory created recursively
   - Test: Verify directory created, report written successfully

2. **Relative report path**
   - Condition: `--report-path ./reports/verify.md`
   - Expected Behavior: Path converted to absolute relative to workspace
   - Test: Verify final path is absolute, cross-platform compatible

3. **Report already exists**
   - Condition: Run verification twice in same workspace
   - Expected Behavior: Overwrite previous report
   - Test: Verify new report replaces old report

4. **Workspace status not "completed" (manual verification)**
   - Condition: Manually verify workspace with status "in-progress"
   - Expected Behavior: Verification runs anyway (no status check)
   - Test: Verify verification completes normally

5. **Empty verification report**
   - Condition: Claude generates empty or malformed report
   - Expected Behavior: Parse returns needs_review status with fallback values
   - Test: Verify status = needs_review, summary = "See report for details"

6. **Multiple status markers in report**
   - Condition: Report contains both "✅ VERIFIED" and "❌ INCOMPLETE"
   - Expected Behavior: First marker found determines status
   - Test: Verify status based on first marker

7. **Unicode and special characters in report**
   - Condition: Report contains emojis, Unicode, special characters
   - Expected Behavior: Parse correctly (UTF-8 encoding)
   - Test: Verify summary and issues extracted correctly

8. **Very large verification report**
   - Condition: Report exceeds 1MB (comprehensive deep verification)
   - Expected Behavior: Parse successfully, no memory issues
   - Test: Verify report loaded and parsed without errors

## Test Data Requirements

### Test Workspaces

**Simple Workspace:**

- Name: test-simple
- Instructions: 5 simple tasks
- Expected verification: Quick depth passes in <15s

**Standard Workspace:**

- Name: test-standard
- Instructions: 20 tasks with mixed complexity
- Expected verification: Standard depth passes in <30s

**Complex Workspace:**

- Name: test-complex
- Instructions: 50+ tasks, multiple files
- Expected verification: Deep depth passes in <60s

### Test Fixtures

```typescript
// Mock verification report (passing)
const passingReport = `
# Verification Report

## Summary

All tasks completed successfully.

✅ VERIFIED COMPLETE

**Confidence Level**: High
**Recommended Action**: Mark complete and archive
`;

// Mock verification report (failing)
const failingReport = `
# Verification Report

## Summary

Work incomplete, found 3 issues.

❌ INCOMPLETE

### Incomplete Requirements

1. **Task A**: Missing implementation
2. **Task B**: Incomplete tests
3. **Task C**: No documentation

**Confidence Level**: Medium
**Recommended Action**: Resume work to fix issues
`;

// Mock VerificationResult
const mockResult: VerificationResult = {
  status: 'pass',
  summary: 'All complete',
  fullReport: passingReport,
  reportPath: '/path/to/report.md',
  issueCount: 0,
  issues: [],
  confidence: 'high',
  recommendedAction: 'Mark complete',
};
```

## Security Testing

**Security Test Cases:**

- [x] Path traversal prevention: `--report-path ../../etc/passwd` → normalized to safe path
- [x] Report content sanitization: Claude output is trusted (no user input in report)
- [x] Permission escalation: `--dangerously-skip-permissions` only affects current run (not saved)
- [x] Concurrent access: Multiple verifications don't corrupt report (filesystem handles locking)
- [x] Metadata integrity: Atomic writes prevent corruption (write to temp, rename)
- [x] Sensitive data leaks: Reports contain only workspace content (no credentials)

## Testing Strategy

### Local Development

- Run unit tests on every file save (Vitest watch mode)
- Run integration tests before committing
- Manual E2E testing for auto-verification workflows

### CI/CD Pipeline

- Run all unit tests on every pull request
- Run integration tests on every pull request
- Block merge if coverage drops below 80%
- Run performance benchmarks on staging environment

### Test Environments

- **Local**: Developer machines with mocked ClaudeClient
- **CI**: Automated test environment with Vitest + mocks
- **Staging**: Real Claude CLI for manual E2E testing (optional)
- **Production**: Monitoring for verification failures and performance

## Test Maintenance

- Update tests whenever SPEC.md changes (new features, changed behavior)
- Remove obsolete tests when features deprecated
- Refactor tests to use shared fixtures (reduce duplication)
- Keep test data synchronized with prompt template changes
- Review performance benchmarks quarterly (update targets as needed)

---

## Test Checklist

Before marking verification feature as complete, verify:

- [x] All unit tests written and passing (≥80% coverage)
- [x] All integration tests written and passing (CLI options, error scenarios)
- [x] All edge cases covered (custom paths, relative paths, empty reports)
- [x] Performance benchmarks met for all depth levels
- [x] All error scenarios tested (Claude unavailable, report not generated)
- [x] Security tests passing (path traversal, permission checks)
- [x] Test coverage reported and meets minimum thresholds
- [x] Tests documented and maintainable
- [x] CI/CD pipeline configured correctly
