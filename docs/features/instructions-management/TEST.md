# Testing Specification: Instructions Management

## Test Coverage Targets

- **Unit Test Coverage**: 80% minimum for command handlers and prompt templates
- **Integration Test Coverage**: All CLI commands tested with mocked ClaudeClient
- **End-to-End Test Coverage**: Manual testing of interactive sessions with real Claude CLI

## Testing Layers

### Layer 1: Unit Tests

**Scope:**

- Command handler logic (setup, edit, validate)
- Workspace loading and validation
- Config loading with metadata overrides
- Prompt template loading and token replacement
- Error handling for missing workspace/instructions
- Claude CLI availability checks
- Notification triggering logic

**Key Test Scenarios:**

1. **setup command**
   - Success case: Workspace loaded, Claude available, instructions created, notification sent
   - Error: Workspace not found
   - Error: Claude CLI not available
   - Warning: Instructions not created after session
   - Config: Workspace-level claudeCommand override respected
   - Prompt: Mode-aware prompt generated with correct tokens
   - Metadata: Setup iteration count incremented

2. **edit command**
   - Success case: Workspace loaded, instructions exist, session completes
   - Error: Workspace not found
   - Error: Instructions not found (show setup hint)
   - Error: Claude CLI not available
   - Prompt: Mode-aware prompt generated with correct tokens
   - Metadata: Setup iteration count incremented

3. **validate command**
   - Success case: Workspace loaded, instructions exist, report generated and displayed
   - Error: Workspace not found
   - Error: Instructions not found (show setup hint)
   - Error: Claude CLI not available
   - Warning: Validation report not created
   - Prompt: Mode-aware prompt generated with correct tokens and report path
   - Output: Report content displayed in console

4. **Prompt Templates**
   - Token replacement: {{workspaceName}}, {{workspacePath}}, {{validationCriteria}}, {{reportPath}}
   - Mode selection: Loop vs iterative templates loaded correctly
   - Validation criteria: Embedded correctly in setup/edit/validate prompts

5. **Error Messages**
   - Workspace not found message includes workspace name
   - Instructions not found message includes setup command hint
   - Claude not available message includes configured command name

**Example Test:**

```typescript
describe('setup command', () => {
  it('should create instructions and send notification', async () => {
    const mockWorkspace = createMockWorkspace();
    const mockClient = createMockClaudeClient();

    mockWorkspace.hasInstructions.mockResolvedValue(true);
    mockClient.isAvailable.mockResolvedValue(true);

    await setupCommand()(mockWorkspace, mockClient);

    expect(mockClient.executeInteractive).toHaveBeenCalledWith(
      expect.stringContaining('Setup prompt'),
      expect.stringContaining('System prompt')
    );
    expect(mockWorkspace.incrementIterations).toHaveBeenCalledWith('setup');
    expect(mockNotificationService.send).toHaveBeenCalledWith(
      expect.stringContaining('WORKSPACE SETUP COMPLETE'),
      expect.objectContaining({ title: 'Setup Complete' })
    );
  });

  it('should exit with error if workspace not found', async () => {
    const mockWorkspace = {
      load: vi.fn().mockRejectedValue(new Error('Not found')),
    };

    await expect(setupCommand()(mockWorkspace)).rejects.toThrow('Not found');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should exit with error if instructions not found', async () => {
    const mockWorkspace = createMockWorkspace();
    mockWorkspace.hasInstructions.mockResolvedValue(false);

    await editCommand()(mockWorkspace);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Instructions not found. Run setup first')
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
```

### Layer 2: Integration Tests

**Scope:**

- Full command execution flow with mocked ClaudeClient
- Config loading and workspace metadata integration
- Prompt generation with mode strategies
- Notification service integration

**Key Test Scenarios:**

1. **Setup Flow**
   - Load config → Load workspace → Load config with metadata → Generate prompts → Execute Claude → Increment counter → Check instructions → Notify
   - Verify workspace-level config overrides applied
   - Verify correct prompt strategy selected based on mode

2. **Edit Flow**
   - Load config → Load workspace → Check instructions exist → Generate prompts → Execute Claude → Increment counter
   - Verify error if instructions missing

3. **Validate Flow**
   - Load config → Load workspace → Check instructions exist → Generate prompts → Execute Claude → Read report → Display report
   - Verify report path generation
   - Verify report content displayed

**Example Integration Test:**

```typescript
describe('setup command integration', () => {
  it('should complete full setup flow', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const config = await ConfigManager.load({ workspacesDir: testDir });

    // Mock Claude execution
    mockClaudeClient.executeInteractive.mockResolvedValue();

    // Execute command
    await setupCommand().action('test-workspace', {}, createMockCommand());

    // Verify results
    const workspace = await Workspace.load('test-workspace', workspacePath);
    const metadata = await workspace.getMetadata();
    expect(metadata.setupIterations).toBe(1);
    expect(await workspace.hasInstructions()).toBe(true);
  });
});
```

### Layer 3: End-to-End Tests

**Scope:**

- Manual testing with real Claude CLI
- Interactive session user experience
- Validation report quality

**Key User Flows:**

1. **Complete Setup Flow**
   - Step 1: Run `claude-iterate init test-task`
   - Step 2: Run `claude-iterate setup test-task`
   - Step 3: Interact with Claude to define task
   - Step 4: Verify INSTRUCTIONS.md created
   - Step 5: Run `claude-iterate validate test-task`
   - Step 6: Review validation report
   - Validation: Instructions meet all 7 REQUIRED criteria

2. **Edit and Refine Flow**
   - Step 1: Run `claude-iterate edit test-task`
   - Step 2: Request improvements from Claude
   - Step 3: Verify INSTRUCTIONS.md updated
   - Step 4: Run `claude-iterate validate test-task` again
   - Validation: Quality score improved

3. **Error Recovery Flow**
   - Step 1: Run `claude-iterate edit non-existent-task`
   - Step 2: Verify error message with setup hint
   - Step 3: Run `claude-iterate setup non-existent-task`
   - Step 4: Verify error message about missing workspace
   - Validation: Errors are clear and actionable

## Error Scenarios

### Error Test Cases

1. **Workspace Not Found**
   - Command: Any (setup, edit, validate)
   - Expected: Exit 1, message "Workspace not found: {name}"
   - Test: Mock Workspace.load() to throw

2. **Instructions Not Found**
   - Command: edit or validate
   - Expected: Exit 1, message "Instructions not found. Run setup first: claude-iterate setup {name}"
   - Test: Mock workspace.hasInstructions() to return false

3. **Claude CLI Not Available**
   - Command: Any (setup, edit, validate)
   - Expected: Exit 1, message "Claude CLI not found. Make sure '{command}' is installed and in PATH."
   - Test: Mock client.isAvailable() to return false

4. **Instructions Not Created (Setup)**
   - Command: setup
   - Expected: Exit 0 (warning), message "Instructions file not found. You may need to run setup again."
   - Test: Mock workspace.hasInstructions() to return false after session

5. **Report Not Created (Validate)**
   - Command: validate
   - Expected: Exit 0 (warning), message "Validation report not created"
   - Test: Mock fileExists() to return false for report path

6. **Command Execution Failed**
   - Command: Any (setup, edit, validate)
   - Expected: Exit 1, message "{Command} failed: {error}"
   - Test: Mock command execution to throw

## Edge Cases

1. **User Cancels Interactive Session**
   - Condition: User exits Claude session before completing
   - Expected Behavior: Command exits cleanly, warning shown if no instructions
   - Test: Simulate Claude process exit code 0 with no file changes

2. **Workspace Config Overrides**
   - Condition: Workspace metadata has config.claudeCommand override
   - Expected Behavior: Override respected in ClaudeClient initialization
   - Test: Set workspace config, verify correct command used

3. **Mode-Specific Templates**
   - Condition: Workspace mode is 'iterative'
   - Expected Behavior: Iterative mode templates loaded
   - Test: Create workspace with iterative mode, verify prompt contains iterative-specific guidance

4. **Multiple Setup Runs**
   - Condition: User runs setup multiple times
   - Expected Behavior: Each run increments setupIterations, allows refinement
   - Test: Run setup twice, verify counter increments

5. **Notification Not Configured**
   - Condition: No notifyUrl in metadata
   - Expected Behavior: Skip notification silently
   - Test: Mock NotificationService.isConfigured() to return false

6. **Long Validation Report**
   - Condition: Report content exceeds terminal height
   - Expected Behavior: Full report displayed (user scrolls), file path shown
   - Test: Generate large report, verify full content logged

## Test Data Requirements

### Test Workspaces

- Standard workspace: valid metadata, no instructions yet
- Workspace with instructions: valid INSTRUCTIONS.md file
- Workspace with mode override: metadata.mode = 'iterative'
- Workspace with config override: metadata.config.claudeCommand = 'custom-claude'

### Test Instructions

```markdown
# Task: Build REST API

Build a REST API with /users, /auth, /posts endpoints.

Track progress in TODO.md. Task complete when all endpoints tested and documented.
```

### Test Validation Report

```markdown
# Instruction Validation Report

**Workspace**: test-task
**Mode**: Loop
**Validation Date**: 2025-10-28T12:00:00Z

## Overall Assessment

✅ Ready to execute

## Criteria Evaluation

{...10 criteria evaluated...}

## Results Summary

**REQUIRED criteria**: 7/7 passing
**RECOMMENDED criteria**: 3/3 passing
**Overall Status**: ✅ Ready
```

## Security Testing

**Security Test Cases:**

- [ ] Workspace paths are validated before use
- [ ] No command injection via workspace names
- [ ] No path traversal via workspace names
- [ ] Claude CLI spawned safely with validated paths
- [ ] Notification URLs validated before sending
- [ ] File reads/writes use safe path resolution

## Testing Strategy

### Local Development

- Run unit tests on file save: `npm test -- --watch`
- Run all tests before commit: `npm test`
- Test with real Claude: manual E2E flows

### CI/CD Pipeline

- Run all unit and integration tests on every PR
- Use mocked ClaudeClient (no real API calls)
- Block merge if tests fail
- Coverage report generated and checked (>=80%)

### Test Environments

- **Local**: Developer machines with mocked ClaudeClient
- **CI**: Automated test environment with all mocks
- **Manual**: Real Claude CLI for E2E validation

## Test Maintenance

- Update tests when SPEC.md changes
- Update mocks when ClaudeClient interface changes
- Update test prompts when template files change
- Keep test fixtures in sync with schema changes (metadata, config)
- Review and update coverage targets quarterly

---

## Test Checklist

Before marking feature as complete:

- [ ] All unit tests written and passing
- [ ] All integration tests written and passing
- [ ] Manual E2E tests completed successfully
- [ ] Error scenarios covered
- [ ] Edge cases covered
- [ ] Security tests passing
- [ ] Test coverage meets 80% threshold
- [ ] Tests documented and maintainable
