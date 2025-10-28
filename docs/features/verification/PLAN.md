---
# Plan Status
status: complete
status_summary: All implementation tasks completed and deployed
summary: Implementation plan for Verification feature
plan_mode: checklist
total_tasks: 38
completed_tasks: 38
---

# Implementation Plan: Verification

This document is the task list that was used to implement this feature. All tasks are marked complete as this is a brownfield documentation effort for an already-implemented feature.

**Mode:** Checklist (leaf feature with direct implementation tasks)

---

## MODE A: Coding Checklist

### Phase 1: Core Service & Types

- [x] Create `src/types/config.ts` verification config schema
- [x] Add `verification` field to `RuntimeConfig` interface
- [x] Add verification defaults to `DEFAULT_CONFIG`
- [x] Create `src/core/verification-service.ts` with `VerificationService` class
- [x] Implement `verify()` method with depth parameter support
- [x] Implement `parseVerificationReport()` private method for report parsing
- [x] Implement `prepareResumeInstructions()` method for auto-resume
- [x] Define `VerificationOptions` interface
- [x] Define `VerificationResult` interface

### Phase 2: Verification Prompts

- [x] Add `getVerificationPrompt()` to `src/templates/system-prompt.ts`
- [x] Create verification prompt template in `src/templates/prompts/`
- [x] Add mode-aware verification prompt to base mode strategy
- [x] Implement quick depth prompt (minimal analysis)
- [x] Implement standard depth prompt (balanced analysis)
- [x] Implement deep depth prompt (comprehensive analysis)
- [x] Add depth parameter to prompt template token replacement
- [x] Test prompt generation for all depth levels

### Phase 3: CLI Command

- [x] Create `src/commands/verify.ts` with `verifyCommand()` function
- [x] Add workspace name argument validation
- [x] Add `--depth` option with enum validation (quick, standard, deep)
- [x] Add `--report-path` option for custom report location
- [x] Add `--json` flag for JSON output
- [x] Add `--show-report` flag to display report in console
- [x] Add `-v, --verbose` flag for full Claude output
- [x] Add `-q, --quiet` flag for silent execution
- [x] Add `--dangerously-skip-permissions` runtime override
- [x] Implement conflicting flags validation (verbose vs quiet)
- [x] Load workspace and check instructions exist
- [x] Create VerificationService instance with runtime config
- [x] Call `verify()` and handle result
- [x] Update workspace metadata with verification results
- [x] Output results in console or JSON format
- [x] Set exit code based on verification status (0 for pass, 1 for fail/needs_review)
- [x] Register command in `src/cli.ts`

### Phase 4: Report Handling

- [x] Implement absolute path resolution for report path
- [x] Create parent directory recursively if needed (`mkdir -p`)
- [x] Parse verification report for status markers (✅ VERIFIED COMPLETE, ❌ INCOMPLETE)
- [x] Extract summary from `## Summary` section
- [x] Extract issues list from `### Incomplete Requirements` section
- [x] Extract confidence level from markdown
- [x] Extract recommended action from markdown
- [x] Handle missing report with helpful error message
- [x] Include diagnostic info in error (permission prompts, Claude output)

### Phase 5: Auto-Verification Integration

- [x] Add auto-verification trigger to run command (when status = completed)
- [x] Check `verification.autoVerify` config before triggering
- [x] Track `verificationAttempts` in workspace metadata
- [x] Implement `maxAttempts` limit check
- [x] Implement auto-resume on failed verification
- [x] Check `verification.resumeOnFail` config before resuming
- [x] Increment `verifyResumeCycles` on each resume
- [x] Prepend verification findings to instructions for resume
- [x] Reset workspace status to in-progress for resume iterations

### Phase 6: Testing

- [x] Create `tests/unit/verification-service.test.ts`
- [x] Test `verify()` with quick depth
- [x] Test `verify()` with standard depth
- [x] Test `verify()` with deep depth
- [x] Test report parsing for pass status
- [x] Test report parsing for fail status
- [x] Test report parsing for needs_review status
- [x] Test issue extraction from report
- [x] Test confidence level extraction
- [x] Test recommended action extraction
- [x] Test custom report path handling
- [x] Test relative path conversion to absolute
- [x] Test error when report not generated
- [x] Test error when Claude unavailable
- [x] Test error when Claude execution fails
- [x] Test `prepareResumeInstructions()` with issues
- [x] Test `prepareResumeInstructions()` with empty issues
- [x] Mock ClaudeClient and file system operations
- [x] Achieve ≥80% test coverage for verification service

### Phase 7: Documentation & Configuration

- [x] Add verification config to README.md
- [x] Document `--depth` option in README.md
- [x] Document verification workflow in README.md
- [x] Document auto-verification behavior
- [x] Document auto-resume workflow
- [x] Add verification examples to README.md
- [x] Add verification configuration keys to config schema
- [x] Update CHANGELOG.md with verification feature

---

## Notes

### Key Decisions

**Decision: Use markdown report format**

- **Date:** Initial implementation
- **Context:** Need human-readable verification reports that can be reviewed manually
- **Decision:** Generate markdown reports with structured sections and markers
- **Rationale:** Markdown is human-readable, easy to parse, and integrates well with documentation workflows
- **Alternatives Considered:**
  - JSON reports: Not human-readable, harder to review manually
  - Plain text: Harder to parse reliably

**Decision: Three depth levels (quick, standard, deep)**

- **Date:** Initial implementation
- **Context:** Users need to balance verification thoroughness with speed
- **Decision:** Provide three preset depth levels with clear token budgets
- **Rationale:** Simple abstraction that covers common use cases without exposing token counts to users
- **Alternatives Considered:**
  - Custom token budget: Too technical, users don't know how many tokens they need
  - Binary (fast/thorough): Not granular enough

**Decision: Auto-verification with auto-resume**

- **Date:** Initial implementation
- **Context:** Want to catch incomplete work automatically without manual intervention
- **Decision:** Auto-verify on completion, auto-resume on failure with verification findings
- **Rationale:** Reduces manual checking, ensures work is truly complete, provides feedback loop
- **Alternatives Considered:**
  - Manual verification only: Requires user to remember to verify
  - Auto-verify without resume: Catches issues but doesn't fix them automatically

**Decision: Mode-aware verification prompts**

- **Date:** Initial implementation
- **Context:** Loop mode and iterative mode have different expectations for progress tracking
- **Decision:** Use mode-specific prompts via strategy pattern
- **Rationale:** Ensures verification understands the mode's workflow and completion criteria
- **Alternatives Considered:**
  - Single generic prompt: Would miss mode-specific nuances

### Potential Risks

- **Risk:** Claude misunderstands verification instructions and gives false positives/negatives
  - **Mitigation:** Use structured prompts with clear examples, parse reports with specific markers

- **Risk:** Verification reports not generated due to permission prompts
  - **Mitigation:** Provide helpful error message suggesting --dangerously-skip-permissions

- **Risk:** Auto-resume creates infinite loop if verification always fails
  - **Mitigation:** Implement maxAttempts limit (default: 2), track verifyResumeCycles

### Testing Strategy

- **Unit tests:** All VerificationService methods with mocked dependencies
- **Integration tests:** CLI command with mocked ClaudeClient
- **Edge case tests:** Custom paths, relative paths, missing reports, concurrent access
- **Error scenario tests:** Claude unavailable, execution failures, conflicting options
- **Auto-verification tests:** Trigger conditions, resume workflow, attempt limits
