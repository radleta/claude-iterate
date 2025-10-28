---
# Status Tracking
status: complete
status_summary: Feature is fully implemented and documented

# Ownership
owner: brownfield-migration

# Blocking Issues
blocked_by:

# Summary (for AI and quick scanning)
summary: Verify workspace work completion with quick, standard, or deep analysis
---

# Verification

## Purpose

Verify workspace work completion using Claude to analyze deliverables and detect incomplete work with configurable depth levels.

## User Stories

- As a user, I want to verify my workspace is truly complete, so that I can trust the completion status before archiving or deploying.
- As a user, I want different verification depths (quick, standard, deep), so that I can balance thoroughness with speed based on my needs.
- As a developer, I want automatic verification after task completion, so that I don't have to manually check work quality.
- As a user, I want the system to resume work automatically when verification fails, so that incomplete tasks are fixed without manual intervention.

## Core Business Logic

- Verification uses Claude CLI to read workspace files and generate a structured markdown report
- Three depth levels: quick (~500-1K tokens), standard (~2-4K tokens), deep (~5-10K tokens)
- Reports include status (pass/fail/needs_review), summary, issues list, confidence level, and recommended action
- Exit code 0 for verified complete, 1 for incomplete/needs review
- Auto-verification runs automatically after task completion when `verification.autoVerify` is true (default)
- Auto-resume continues work when verification fails and `verification.resumeOnFail` is true (default)
- Maximum verification attempts controlled by `verification.maxAttempts` (default: 2)
- Verification report written to configurable filename (default: `verification-report.md` in workspace)
- Workspace metadata tracks verification attempts and resume cycles for monitoring

## Key Constraints

- Requires Claude CLI to be installed and available in PATH
- Verification requires read access to workspace files and write access for report generation
- Report parsing relies on specific markdown markers (✅ VERIFIED COMPLETE, ❌ INCOMPLETE)
- Depth level determines token usage and analysis thoroughness (configurable via CLI or config)
- Auto-verification only triggers when workspace status is "completed"
- Resume instructions append verification findings to original instructions without modifying them

## CLI Commands

This feature provides the following command:

- `claude-iterate verify <name>` - Verify workspace work completion

For full command reference, see [Commands Reference](../../../README.md#commands-reference).

## Document Links

- [Technical Specification](./SPEC.md)
- [Implementation Plan](./PLAN.md)
- [Testing Specification](./TEST.md)
- [Implementation Progress](./TODO.md)
