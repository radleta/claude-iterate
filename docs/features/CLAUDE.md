# Feature Development Instructions for Agents

This file provides agent-specific workflow guidance for the Spec-Driven Development (SDD) process.

**Context:** All relative paths are from this location.

For the complete SDD workflow, templates, and examples:
@./CONTRIBUTING.md

> **💡 See Also**
>
> This guide covers **feature documentation** workflows for AI agents.
>
> For **codebase architecture** and development patterns, see:
>
> - [Root CLAUDE.md](../../CLAUDE.md)

---

## Required Files

Every feature MUST have exactly 5 files:

1. **README.md** - Feature overview and status
2. **SPEC.md** - Technical specification (NO testing details)
3. **PLAN.md** - Implementation tasks
4. **TEST.md** - ALL testing requirements (REQUIRED, not optional)
5. **TODO.md** - Progress tracking and validation checklists (REQUIRED, not optional)

---

## Workflow Phases

When creating feature documentation, follow these phases in order:

### 1. Investigation Phase (ALWAYS FIRST)

Before creating any specification files, investigate and document:

**Similar Features:**

- Find 3-5 existing features in the same domain
- Examine their README.md, SPEC.md, PLAN.md, TEST.md, TODO.md files
- Document directory structure patterns
- Document naming conventions

**Dependencies:**

- Identify features this depends on
- Read their SPEC.md Public Contract sections
- Verify they provide needed functionality
- List all dependencies with file paths

**Testing Patterns:**

- Find test files in the codebase
- Identify test framework (Jest, Vitest, etc.)
- Document test file location pattern
- Document test naming convention
- Note coverage requirements

**Code Patterns:**

- Read similar code files
- Document indentation (2 spaces, 4 spaces, tabs)
- Document quote style (single, double)
- Document naming conventions (camelCase, PascalCase, snake_case)

**Document findings in SPEC.md Implementation Notes section before proceeding.**

---

### 2. Creation Phase

Copy templates from `.templates/` directory to new feature directory `[domain]/[feature]/`:

- README.md (from `.templates/README.md.template`)
- SPEC.md (from `.templates/SPEC.md.template`)
- PLAN.md (from `.templates/PLAN.md.template`)
- TEST.md (from `.templates/TEST.md.template`) **REQUIRED**
- TODO.md (from `.templates/TODO.md.template`) **REQUIRED**

**All 5 files are required for every feature.**

---

### 3. Population Phase

Customize each file with specifics from investigation:

**README.md:**

- Replace [PLACEHOLDERS] with actual values
- Add user stories
- Set status in frontmatter
- Link to all 4 other files (SPEC.md, PLAN.md, TEST.md, TODO.md)

**SPEC.md:**

- Add Public Contract section
- List dependencies with markdown links
- Add investigation findings to Implementation Notes
- Replace all vague terms with measurable criteria
- **DO NOT include testing details** - those go in TEST.md

**PLAN.md:**

- Choose mode: Checklist (1-30 tasks) or Roadmap (30+ tasks)
- Add specific, actionable tasks
- Link dependencies
- **DO NOT include testing details** - those go in TEST.md

**TEST.md:**

- Define coverage targets with specific percentages (e.g., ">=80% line coverage")
- Document test scenarios for each testing layer
- List error scenarios and edge cases
- Define performance benchmarks with measurable criteria (e.g., "<200ms at 95th percentile")
- Include security testing requirements
- **ALL testing requirements go here**, not in SPEC.md or PLAN.md

**TODO.md:**

- The template provides validation checklists by default
- Use it to verify feature setup (all 5 files exist)
- Track implementation tasks from PLAN.md
- Track blockers and decisions
- Update progress percentage as work progresses

---

### 4. Validation Phase

Verify files are complete using the checklists below.

Verify all markdown links resolve by reading each linked file path.

---

### 5. Version Control

Commit only after validation passes:

- Stage all 5 files in the feature directory
- Use commit message format: "feat: add [feature] specification"

---

## File Validation Checklists

Use these before marking work complete:

### README.md Validation

- [ ] YAML frontmatter present with: status, owner, summary
- [ ] Status is one of: planning, in-progress, blocked, complete
- [ ] Summary is one sentence
- [ ] Purpose section is one sentence
- [ ] User stories use "As a [role], I want [action], so that [benefit]" format
- [ ] Core Business Logic is specific (includes numbers, thresholds, formats)
- [ ] Links to SPEC.md, PLAN.md, TEST.md, and TODO.md are present and resolve

### SPEC.md Validation

- [ ] Public Contract section defines stable API (or states "internal only")
- [ ] Dependencies section lists all feature dependencies as markdown links
- [ ] No circular dependencies (verified by checking dependency SPEC.md files)
- [ ] Validation rules follow template: Type, Min/Max, Pattern, Examples
- [ ] Error handling documents: Condition, HTTP Code, Message, Action
- [ ] All vague terms replaced (no "good", "appropriate", "sufficient", "should")
- [ ] All criteria measurable (has numbers: ">500 lines", "80%", "<200ms")
- [ ] Implementation Notes section documents investigation findings
- [ ] Mermaid diagrams added for complex flows (optional but recommended)
- [ ] NO testing details (all testing is in TEST.md)

### PLAN.md Validation

- [ ] Mode selected: Checklist (1-30 tasks) or Roadmap (30+ tasks)
- [ ] If Checklist mode: Each task is specific and actionable
- [ ] If Roadmap mode: Links to sub-feature README.md files
- [ ] Dependencies identified and match SPEC.md dependencies
- [ ] No [PLACEHOLDERS] remain in file
- [ ] NO testing details (all testing is in TEST.md)

### TEST.md Validation (REQUIRED)

- [ ] Coverage targets specified with exact percentages for each test type (unit, integration, e2e, performance)
- [ ] Test scenarios documented for each testing layer
- [ ] Error scenarios and edge cases listed
- [ ] Performance benchmarks defined with measurable criteria (e.g., "<200ms at 95th percentile")
- [ ] Test data requirements specified
- [ ] Security testing checklist included
- [ ] All criteria measurable (no "good coverage", use ">=80%")

### TODO.md Validation (REQUIRED)

- [ ] YAML frontmatter present with: status, progress_percentage, blockers_count
- [ ] Feature setup validation checklist present (verifies all 5 files exist)
- [ ] Implementation task list present (tracks PLAN.md tasks)
- [ ] Quality validation checklist present (code quality, testing, documentation)
- [ ] Progress percentage field exists (will be updated during implementation)
- [ ] Blockers section exists (will document blockers as they arise)

### Cross-File Validation

- [ ] All markdown links resolve (test by reading each linked path)
- [ ] README.md links to SPEC.md, PLAN.md, TEST.md, and TODO.md
- [ ] SPEC.md dependencies link to other features' SPEC.md files
- [ ] PLAN.md (if Roadmap) links to sub-features' README.md files
- [ ] No broken links exist
- [ ] All 5 required files exist

---

## Quick Reference: Decision Points

**PLAN.md Mode Selection:**

- Checklist: 1-30 tasks, implement directly
- Roadmap: 30+ tasks, split into sub-features

**When to split into spec/ subdirectory:**

- SPEC.md exceeds 500 lines
- SPEC.md becomes an index file linking to spec/01_section.md, spec/02_section.md, etc.
- Public Contract and Dependencies sections must remain in main SPEC.md

**When to split into test/ subdirectory:**

- TEST.md exceeds 400 lines
- TEST.md becomes an index file linking to test/01_unit.md, test/02_integration.md, etc.

**When to split into features/ subdirectory:**

- Feature has 30+ implementation tasks
- Feature has distinct, independent parts
- Create features/sub-feature-1/ directory with full 5-file structure (README, SPEC, PLAN, TEST, TODO)

**IMPORTANT: Recursive Directory Structure**

The directory name `features/` repeats at each level of the hierarchy. This is intentional design, not an error.

**Example of recursive nesting:**

```
docs/features/auth/              ← Root feature
└── features/                    ← Sub-features (name: "features")
    └── password-reset/
        └── features/            ← Sub-sub-features (name repeats: "features")
            ├── email-reset/
            └── sms-reset/
```

**Key points:**

- Path pattern: `docs/features/feature-name/features/sub-feature/features/sub-sub-feature/...`
- The word "features" appears at each level by design
- This enables unlimited nesting without refactoring
- Each level maintains the same 5-file structure (README, SPEC, PLAN, TEST, TODO)

For detailed explanation and examples, see CONTRIBUTING.md "Step 3: Handling Growth - The Recursive Pattern"

---

## Workflow State Tracking

Track feature progress using README.md frontmatter status field:

**planning** -> Investigation, writing specs, all 5 files created
**in-progress** -> Implementation started, update TODO.md with progress
**blocked** -> Cannot proceed, document blocker in TODO.md, set blocked_by in README.md
**complete** -> All done, deployed, working, TODO.md kept for audit trail

Change status by editing the frontmatter in README.md.

---

## Common Anti-Patterns

**Missing required files:**

- Every feature MUST have all 5 files: README, SPEC, PLAN, TEST, TODO
- Do not skip TEST.md - it is required, not optional
- Do not skip TODO.md - it is required, not optional

**Testing details in wrong files:**

- ALL testing requirements go in TEST.md
- Do NOT put testing details in SPEC.md
- Do NOT put testing details in PLAN.md
- Reference TEST.md from other files if needed

**Skipping investigation:**

- Never guess patterns - always investigate first
- Missing investigation leads to inconsistent implementations
- Document all findings in SPEC.md Implementation Notes

**Circular dependencies:**

- If feature A depends on B, and B depends on A, extract shared logic to a third feature C
- Both A and B should depend on C instead
- Verify no A->B->A chains exist by reading dependency SPEC.md files

**Vague specifications:**

- Replace "good coverage" with ">=80% coverage"
- Replace "fast response" with "<200ms at 95th percentile"
- Replace "strong password" with "8-128 chars, 1 uppercase, 1 lowercase, 1 number, 1 special"
- All criteria must be measurable (include numbers, thresholds, formats)
