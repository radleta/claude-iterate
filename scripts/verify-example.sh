#!/bin/bash
# Usage: ./scripts/verify-example.sh <workspace-name> <mode>

set -e

WORKSPACE=$1
MODE=$2
WORKSPACE_DIR="claude-iterate/workspaces/$WORKSPACE"

if [ -z "$WORKSPACE" ] || [ -z "$MODE" ]; then
  echo "Usage: $0 <workspace-name> <mode>"
  echo "Example: $0 example-loop-mode loop"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Verifying $WORKSPACE ($MODE mode)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

# Check workspace exists
if [ ! -d "$WORKSPACE_DIR" ]; then
  echo "❌ Workspace not found: $WORKSPACE_DIR"
  exit 1
fi
echo "✅ Workspace exists: $WORKSPACE_DIR"

# Check TODO.md exists
if [ ! -f "$WORKSPACE_DIR/TODO.md" ]; then
  echo "❌ TODO.md not found"
  exit 1
fi
echo "✅ TODO.md exists"

# Mode-specific checks
if [ "$MODE" = "loop" ]; then
  # Check for completion marker
  if grep -qE "Remaining: 0|TASK COMPLETE" "$WORKSPACE_DIR/TODO.md"; then
    echo "✅ Loop mode completion marker found"
  else
    echo "❌ Loop mode completion marker not found"
    echo "   TODO.md content:"
    cat "$WORKSPACE_DIR/TODO.md"
    exit 1
  fi
fi

if [ "$MODE" = "iterative" ]; then
  # Check no unchecked boxes remain
  if grep -qE "^[[:space:]-]*\[[[:space:]]\]" "$WORKSPACE_DIR/TODO.md"; then
    echo "❌ Unchecked boxes still remain"
    echo "   TODO.md content:"
    cat "$WORKSPACE_DIR/TODO.md"
    exit 1
  fi

  # Check that we have at least some checked boxes
  if grep -qE "^[[:space:]-]*\[[xX]\]" "$WORKSPACE_DIR/TODO.md"; then
    echo "✅ All checkboxes marked complete"
  else
    echo "❌ No checked boxes found"
    exit 1
  fi
fi

# Check status is completed
if grep -qE '"status"\s*:\s*"completed"' "$WORKSPACE_DIR/.metadata.json" 2>/dev/null; then
  echo "✅ Metadata shows completed status"
else
  echo "❌ Metadata does not show completed status"
  if [ -f "$WORKSPACE_DIR/.metadata.json" ]; then
    echo "   Metadata status:"
    grep '"status"' "$WORKSPACE_DIR/.metadata.json"
  fi
  exit 1
fi

# Check working directory has content
if [ -d "$WORKSPACE_DIR/working" ] && [ "$(ls -A $WORKSPACE_DIR/working 2>/dev/null)" ]; then
  echo "✅ Working directory contains files"
  echo "   Contents:"
  ls -lR "$WORKSPACE_DIR/working" | sed 's/^/   /'
else
  echo "❌ Working directory is empty or missing"
  exit 1
fi

# Show iteration count
if [ -f "$WORKSPACE_DIR/.metadata.json" ]; then
  EXEC_ITERATIONS=$(grep -oE '"executionIterations"\s*:\s*[0-9]+' "$WORKSPACE_DIR/.metadata.json" | grep -oE '[0-9]+$')
  if [ -n "$EXEC_ITERATIONS" ]; then
    echo "✅ Execution iterations: $EXEC_ITERATIONS"

    # Verify minimum iterations for proper testing
    if [ "$MODE" = "loop" ]; then
      if [ "$EXEC_ITERATIONS" -lt 3 ]; then
        echo "⚠️  Warning: Only $EXEC_ITERATIONS iterations - expected at least 3 for loop mode testing"
        echo "   This may indicate tasks were batched instead of executed sequentially"
      fi
    fi

    if [ "$MODE" = "iterative" ]; then
      if [ "$EXEC_ITERATIONS" -lt 2 ]; then
        echo "⚠️  Warning: Only $EXEC_ITERATIONS iteration - expected at least 2 for iterative mode testing"
        echo "   This may indicate all work was done in a single pass"
      fi
    fi
  fi
fi

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All verifications passed for $WORKSPACE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
