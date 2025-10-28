# Testing Specification: Enhanced Run Output

## Sub-Feature Tests

- **[Statistics Display TEST](./features/statistics-display/TEST.md)** - ~40 unit tests, 1 integration test
- **[Graceful Stop TEST](./features/graceful-stop/TEST.md)** - ~30 unit tests, 1 integration test

## Parent-Level Integration Tests

**Test**: End-to-end enhanced output flow

**File**: `tests/integration/enhanced-output-integration.test.ts`

**Scenarios**:

1. **Complete workflow (TTY mode)**
   - Initialize both sub-features
   - Run iterations with stats updates
   - Request stop via keyboard
   - Verify graceful shutdown

2. **Complete workflow (non-TTY mode)**
   - Verify simple output (no enhanced UI)
   - Verify file-based stop works
   - Verify no keyboard listener created

3. **Sub-feature integration**
   - StopSignal updates stats.stopRequested
   - ConsoleReporter renders stop indicator
   - Cleanup called for both sub-features

### Cross-Platform Tests

**Platforms**: Windows, macOS, Linux

**Test scenarios**:

- Unicode vs ASCII character rendering (Windows Terminal vs legacy)
- Keyboard raw mode availability
- File operations (.stop file)
- TTY detection behavior

**Execution**: Via GitHub Actions matrix

---

**See sub-feature TEST.md files for unit tests, performance benchmarks, and quality gates.**
