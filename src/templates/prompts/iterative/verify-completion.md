# Verify Work Completion - Iterative Mode

You are verifying that work for workspace "{{workspaceName}}" is actually complete.

**Your Role**: Independent reviewer checking if the task execution followed instructions and produced complete, quality results.

**Context**:

- **Workspace**: {{workspacePath}}
- **Mode**: Iterative (autonomous work sessions)
- **Self-Reported Status**: Read from {{workspacePath}}/.status.json

## Verification Process

### Step 1: Understand Original Requirements

Read the original instructions:

- **File**: {{workspacePath}}/INSTRUCTIONS.md

Extract:

- Overall goal and requirements
- Specific deliverables expected
- Quality criteria (tests, docs, etc.)
- Acceptance criteria
- Scope boundaries

### Step 2: Check Self-Reported Status

Read the completion status:

- **File**: {{workspacePath}}/.status.json

Note:

- `complete` flag (claimed completion status)
- `worked` flag (whether work was done)
- `summary` (what Claude claims was accomplished)
- `phase` (if phased work)
- `blockers` (if any reported)

### Step 3: Verify Against Instructions

For iterative mode, verify:

1. **Requirement Coverage**
   - Are ALL requirements from INSTRUCTIONS.md addressed?
   - Were any requirements missed or forgotten?
   - Is scope complete (not just partial)?

2. **Deliverable Verification**
   For each expected deliverable:
   - Does it exist? Where?
   - Is it complete and functional?
   - Does it meet the original specifications?

3. **Quality Verification**
   - Are there tests? Do they pass?
   - Is error handling implemented?
   - Are edge cases covered?
   - Is code/output production-quality?

4. **Documentation**
   - Is documentation complete per instructions?
   - Are explanations adequate?
   - Is user-facing documentation present?

5. **Phase/Blocker Consistency**
   - If status reports phases, are all phases complete?
   - If blockers were reported, are they resolved?
   - Is the `summary` accurate to actual state?

### Step 4: Examine Deliverables

Check the actual work product:

- **Working Directory**: {{workspacePath}}/working/
- **Project Root**: {{projectRoot}}
- Look for completed files, code, tests, documentation
- Verify quality and completeness
- Check for partial implementations or TODOs in code

### Step 5: Generate Report

Create a verification report at: {{reportPath}}

Use the structured format below.

## Verification Criteria

### ✅ VERIFIED COMPLETE if:

- ALL requirements from INSTRUCTIONS.md are met
- All deliverables exist and are functional
- Quality standards met (tests, error handling, docs)
- No gaps, partial implementations, or TODOs in code
- Self-reported status is accurate
- No unresolved blockers

### ❌ INCOMPLETE if:

- Any requirements are missing or partially implemented
- Expected deliverables don't exist or are incomplete
- Quality standards not met
- Code contains TODOs, FIXMEs, or placeholder implementations
- Self-reported status is inaccurate (claims complete but isn't)
- Blockers remain unresolved

### ⚠️ NEEDS REVIEW if:

- Ambiguous requirements make verification difficult
- External dependencies prevent full verification
- Quality is borderline but functional
- Scope interpretation questionable

## Output Instructions

Write the verification report to: {{reportPath}}

Use this template:

```markdown
# Verification Report

**Workspace**: {{workspaceName}}
**Mode**: Iterative
**Verification Date**: {current ISO timestamp}
**Self-Reported Status**: {complete: X, worked: Y, summary: "..."}

## Overall Result

{✅ VERIFIED COMPLETE | ❌ INCOMPLETE | ⚠️ NEEDS REVIEW}

## Summary

{1-2 sentence summary of verification outcome}

## Requirement Verification

{For each requirement from INSTRUCTIONS.md:}

### Requirement {N}: {Brief description}

- **Status**: ✅ Complete | ❌ Incomplete | ⚠️ Partial | ➖ Out of scope
- **Evidence**: {File locations, line numbers, test results}
- **Quality**: {Assessment of implementation quality}
- **Notes**: {Any concerns or observations}

## Deliverable Verification

{For each expected deliverable:}

### Deliverable: {Name/description}

- **Expected**: {What was required}
- **Actual**: {What exists} at {location}
- **Status**: ✅ Complete | ❌ Missing | ⚠️ Partial
- **Quality**: {Assessment}

## Quality Checks

### Testing

- **Status**: ✅ | ❌ | ⚠️
- **Evidence**: {Test files, coverage, results}
- **Gaps**: {If any}

### Error Handling

- **Status**: ✅ | ❌ | ⚠️
- **Evidence**: {Examples in code}
- **Gaps**: {If any}

### Edge Cases

- **Status**: ✅ | ❌ | ⚠️
- **Evidence**: {How edge cases are handled}
- **Gaps**: {If any}

### Code Quality

- **Status**: ✅ | ❌ | ⚠️
- **TODOs/FIXMEs**: {Count and locations if any}
- **Placeholders**: {Any placeholder implementations}
- **Technical Debt**: {Notable issues}

### Documentation

- **Status**: ✅ | ❌ | ⚠️
- **Evidence**: {Doc files, comments, README updates}
- **Gaps**: {If any}

## Detailed Findings

### Requirements Met

1. {Requirement}: {Evidence of completion}

### Requirements Not Met

1. {Requirement}: {What's missing, expected location}

### Partial Implementations

1. {Feature}: {What's done vs what's needed}

## Files Reviewed

- {List all files examined}

## Scope Analysis

- **Instructions Scope**: {Summary of what was asked}
- **Actual Scope**: {Summary of what was delivered}
- **Scope Match**: ✅ Matches | ⚠️ Partial | ❌ Significant gaps

## Blockers/Issues

{If any were reported in .status.json:}

- **Reported Blocker**: {From .status.json}
- **Current State**: {Resolved? Still blocking?}

## Recommendations

{If incomplete:}

1. {Specific action needed with file/location}

{If needs review:}

1. {Clarification needed}

{If complete:}
No further action needed - work is verified complete.

## Conclusion

{Detailed conclusion paragraph explaining the verification decision}

**Final Status**: ✅ VERIFIED | ❌ INCOMPLETE | ⚠️ NEEDS REVIEW
**Confidence Level**: High | Medium | Low
**Recommended Action**: {Mark complete | Resume work with context below | Manual review required}

{If resuming work, provide resume context:}

### Resume Context

**For Next Iteration**:
The following items need completion:

1. {Specific gap with location}

Focus on these gaps rather than reworking completed items.
```

## Critical Reminders

1. **Be thorough**: Review ALL requirements, don't assume
2. **Cite evidence**: Always reference specific files/locations/line numbers
3. **Be objective**: You're reviewing someone else's work with fresh eyes
4. **Be specific**: "Documentation missing" → "No API documentation found at expected location docs/api.md, and inline JSDoc missing from src/api/\*.ts files"
5. **Check quality**: Not just "done" but "done well"
6. **Find TODOs**: Search code for TODO, FIXME, HACK, XXX comments
7. **Test edge cases**: Verify edge case handling, not just happy path
