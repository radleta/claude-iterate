#!/bin/bash
# Smoke test for verbose mode tool visibility
# Tests that --verbose flag shows tool usage

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🧪 Verbose Mode Tool Visibility Smoke Test"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TESTS_RUN=$((TESTS_RUN + 1))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TESTS_RUN=$((TESTS_RUN + 1))
}

info() {
    echo -e "${YELLOW}→${NC} $1"
}

# Cleanup function
cleanup() {
    info "Cleaning up test workspaces..."
    rm -rf "$REPO_ROOT/claude-iterate/workspaces/test-verbose-"* 2>/dev/null || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Change to repo root
cd "$REPO_ROOT"

# Build if needed
if [ ! -d "dist" ]; then
    info "Building project..."
    npm run build > /dev/null 2>&1
fi

# Test 1: Initialize test workspace
info "Test 1: Initialize test workspace"
WORKSPACE_NAME="test-verbose-$(date +%s)"

if node dist/src/index.js init "$WORKSPACE_NAME" --mode loop --max-iterations 1 > /dev/null 2>&1; then
    pass "workspace initialized"
else
    fail "workspace initialization failed"
    exit 1
fi

# Test 2: Create minimal instructions
info "Test 2: Create instructions"
WORKSPACE_PATH="$REPO_ROOT/claude-iterate/workspaces/$WORKSPACE_NAME"

echo "Complete one simple task: Create a test file" > "$WORKSPACE_PATH/INSTRUCTIONS.md"
echo "- [ ] Create test.txt" > "$WORKSPACE_PATH/TODO.md"

if [ -f "$WORKSPACE_PATH/INSTRUCTIONS.md" ] && [ -f "$WORKSPACE_PATH/TODO.md" ]; then
    pass "instructions created"
else
    fail "instructions not created"
    exit 1
fi

# Test 3: Run in verbose mode and capture output
info "Test 3: Run with --verbose and check for tool events"
OUTPUT_FILE=$(mktemp)

# Run with dry-run (mock) and verbose mode
node dist/src/index.js run "$WORKSPACE_NAME" --dry-run --no-delay --verbose > "$OUTPUT_FILE" 2>&1

# Check for tool event indicators (new format is "🔧 Read tool" not "🔧 Using Read tool")
if grep -q "🔧" "$OUTPUT_FILE"; then
    pass "tool usage indicator found"
else
    fail "tool usage indicator not found"
    echo "Output contents:"
    cat "$OUTPUT_FILE"
fi

if grep -q "Read tool" "$OUTPUT_FILE" || grep -q "Write tool" "$OUTPUT_FILE"; then
    pass "tool name displayed"
else
    fail "tool name not displayed"
    echo "Output contents:"
    cat "$OUTPUT_FILE"
fi

# Test 4: Check log file for tool events
info "Test 4: Check log file for tool events"
LOG_FILE=$(ls -t "$WORKSPACE_PATH"/iterate-*.log 2>/dev/null | head -1)

if [ -f "$LOG_FILE" ]; then
    pass "log file created"

    if grep -q "🔧" "$LOG_FILE"; then
        pass "tool events logged to file"
    else
        fail "tool events not found in log file"
    fi
else
    fail "log file not found"
fi

# Test 5: Compare with non-verbose mode
info "Test 5: Compare with progress mode (should not show tool events)"
WORKSPACE_NAME2="test-verbose-progress-$(date +%s)"

node dist/src/index.js init "$WORKSPACE_NAME2" --mode loop --max-iterations 1 > /dev/null 2>&1
WORKSPACE_PATH2="$REPO_ROOT/claude-iterate/workspaces/$WORKSPACE_NAME2"

echo "Complete one simple task" > "$WORKSPACE_PATH2/INSTRUCTIONS.md"
echo "- [ ] Task" > "$WORKSPACE_PATH2/TODO.md"

OUTPUT_FILE2=$(mktemp)
node dist/src/index.js run "$WORKSPACE_NAME2" --dry-run --no-delay --output progress > "$OUTPUT_FILE2" 2>&1

# Progress mode should NOT show tool events in console
if grep -q "🔧" "$OUTPUT_FILE2"; then
    fail "progress mode should not show tool events in console"
else
    pass "progress mode correctly omits tool events from console"
fi

# But log file should still have tool events (in verbose mode runs)
# Note: In this test, progress mode uses executeNonInteractive, so log won't have formatted tool events

# Cleanup temp files
rm -f "$OUTPUT_FILE" "$OUTPUT_FILE2"

# Summary
echo ""
echo "==================================="
echo "Tests run: $TESTS_RUN"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
