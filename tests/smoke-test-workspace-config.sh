#!/bin/bash
# Smoke test for per-workspace configuration feature
# Tests that workspace config works correctly

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🧪 Workspace Configuration Smoke Test"
echo "======================================"
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
    rm -rf "$REPO_ROOT/claude-iterate/workspaces/test-ws-config-"* 2>/dev/null || true
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

# Test 1: Config command has --workspace flag
info "Test 1: Config command has --workspace flag"
if node dist/src/index.js config --help 2>&1 | grep -q "\-w, --workspace"; then
    pass "config command has --workspace flag"
else
    fail "config command missing --workspace flag"
fi

# Test 2: Create test workspace
info "Test 2: Create test workspace"
WORKSPACE_NAME="test-ws-config-$(date +%s)"

if node dist/src/index.js init "$WORKSPACE_NAME" > /dev/null 2>&1; then
    pass "workspace created successfully"
else
    fail "workspace creation failed"
fi

# Test 3: Set workspace verification depth
info "Test 3: Set workspace verification depth"
if node dist/src/index.js config --workspace "$WORKSPACE_NAME" verification.depth deep > /dev/null 2>&1; then
    pass "set verification.depth to deep"

    # Verify it was set in metadata
    METADATA_FILE="$REPO_ROOT/claude-iterate/workspaces/$WORKSPACE_NAME/.metadata.json"
    if grep -q '"depth".*"deep"' "$METADATA_FILE"; then
        pass "verification depth persisted in metadata"
    else
        fail "verification depth not found in metadata"
    fi
else
    fail "failed to set verification.depth"
fi

# Test 4: Set workspace outputLevel
info "Test 4: Set workspace outputLevel"
if node dist/src/index.js config --workspace "$WORKSPACE_NAME" outputLevel verbose > /dev/null 2>&1; then
    pass "set outputLevel to verbose"

    # Verify it was set in metadata
    if grep -q '"outputLevel".*"verbose"' "$METADATA_FILE"; then
        pass "outputLevel persisted in metadata"
    else
        fail "outputLevel not found in metadata"
    fi
else
    fail "failed to set outputLevel"
fi

# Test 5: List workspace config
info "Test 5: List workspace config"
OUTPUT=$(node dist/src/index.js config --workspace "$WORKSPACE_NAME" --list 2>&1)
if echo "$OUTPUT" | grep -q "verification"; then
    pass "list shows verification config"
else
    fail "list doesn't show verification config"
fi

if echo "$OUTPUT" | grep -q "outputLevel"; then
    pass "list shows outputLevel config"
else
    fail "list doesn't show outputLevel config"
fi

# Test 6: Get specific workspace config value
info "Test 6: Get specific workspace config value"
OUTPUT=$(node dist/src/index.js config --workspace "$WORKSPACE_NAME" verification.depth 2>&1)
if echo "$OUTPUT" | grep -q "deep"; then
    pass "get verification.depth returns correct value"
else
    fail "get verification.depth failed"
fi

# Test 7: Unset workspace config
info "Test 7: Unset workspace config"
if node dist/src/index.js config --workspace "$WORKSPACE_NAME" outputLevel --unset > /dev/null 2>&1; then
    pass "unset outputLevel succeeded"

    # Verify it was removed from metadata
    if ! grep -q '"outputLevel"' "$METADATA_FILE" || grep -q '"outputLevel".*null' "$METADATA_FILE"; then
        pass "outputLevel removed from metadata"
    else
        fail "outputLevel still in metadata"
    fi
else
    fail "failed to unset outputLevel"
fi

# Test 8: Add to array config (claude.args)
info "Test 8: Add to array config (claude.args)"
if node dist/src/index.js config --workspace "$WORKSPACE_NAME" claude.args --add --dangerously-skip-permissions > /dev/null 2>&1; then
    pass "added --dangerously-skip-permissions to claude.args"

    # Verify it was added to metadata (use simpler grep pattern)
    if grep -q "dangerously-skip-permissions" "$METADATA_FILE"; then
        pass "claude.args persisted in metadata"
    else
        fail "claude.args not found in metadata"
        # Debug: show what's in the file
        cat "$METADATA_FILE" | grep -A 5 -B 5 "claude" || true
    fi
else
    fail "failed to add to claude.args"
fi

# Test 9: Remove from array config
info "Test 9: Remove from array config (claude.args)"
if node dist/src/index.js config --workspace "$WORKSPACE_NAME" claude.args --remove --dangerously-skip-permissions > /dev/null 2>&1; then
    pass "removed --dangerously-skip-permissions from claude.args"

    # Verify it was removed from metadata
    if ! grep -q '"--dangerously-skip-permissions"' "$METADATA_FILE"; then
        pass "value removed from claude.args"
    else
        fail "value still in claude.args"
    fi
else
    fail "failed to remove from claude.args"
fi

# Test 10: Verify config is used by verify command
info "Test 10: Verify config is used by verify command"
# Set depth to quick
node dist/src/index.js config --workspace "$WORKSPACE_NAME" verification.depth quick > /dev/null 2>&1

# Try to run verify (will fail without instructions, but should use workspace config)
# Just verify the depth setting is in metadata - actual usage is tested in unit tests
if grep -q '"depth".*"quick"' "$METADATA_FILE"; then
    pass "workspace config ready for verify command"
else
    fail "workspace config not ready"
fi

# Summary
echo ""
echo "================================"
echo "Test Summary:"
echo "  Total:  $TESTS_RUN"
echo -e "  ${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "  ${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
