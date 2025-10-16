# Smoke Test Templates

This directory contains templates for testing claude-iterate execution modes.

## Templates

### test-loop-mode

**Purpose**: Smoke test for loop mode execution
**Mode**: loop
**Completion**: Remaining: 0
**Expected iterations**: 5

**What it tests**:
- Loop mode iteration mechanics
- Remaining count detection (5 → 0)
- Default loop completion markers

**Usage**:
```bash
claude-iterate template use test-loop-mode my-test
# Add TODO.md with "Remaining: 5" and 5 checkboxes
claude-iterate run my-test
```

### test-iterative-mode

**Purpose**: Smoke test for iterative mode execution
**Mode**: iterative
**Completion**: COUNT: 5
**Expected iterations**: 5

**What it tests**:
- Iterative mode iteration mechanics
- Custom completion marker detection (COUNT: 5)
- Counter-based progress tracking

**Usage**:
```bash
claude-iterate template use test-iterative-mode my-test
# Add TODO.md with "COUNT: 0"
claude-iterate run my-test
```

## Design Principle

Both templates use **information asymmetry**: Claude doesn't know when the task will complete.

- **Loop mode**: Claude decrements "Remaining" but doesn't know 0 is the completion marker
- **Iterative mode**: Claude increments "COUNT" but doesn't know 5 triggers completion

This forces multiple iterations naturally without complex task design.

## Running Tests

See `scratch/example-modes/FINAL-SUMMARY.md` for complete test instructions.
