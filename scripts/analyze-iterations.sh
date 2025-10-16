#!/bin/bash
# Usage: ./scripts/analyze-iterations.sh <workspace-name>

WORKSPACE=$1
LOG_FILE=$(ls -t claude-iterate/workspaces/$WORKSPACE/iterate-*.log 2>/dev/null | head -1)

if [ -z "$WORKSPACE" ]; then
  echo "Usage: $0 <workspace-name>"
  echo "Example: $0 example-loop-v2"
  exit 1
fi

if [ -z "$LOG_FILE" ]; then
  echo "No log file found for $WORKSPACE"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Analyzing iterations for $WORKSPACE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Log file: $LOG_FILE"
echo ""

# Count iteration markers in log
ITERATION_COUNT=$(grep -c "^=== Iteration [0-9]" "$LOG_FILE" 2>/dev/null || echo "0")
echo "Total iterations found in log: $ITERATION_COUNT"
echo ""

# Show Remaining count changes (loop mode)
echo "━━━ Remaining count progression (loop mode) ━━━"
if grep -qi "remaining:" "$LOG_FILE" 2>/dev/null; then
  grep -i "remaining:" "$LOG_FILE" | head -20
else
  echo "(No 'Remaining:' markers found)"
fi
echo ""

# Show checkbox changes (iterative mode)
echo "━━━ Checkbox states (iterative mode) ━━━"
if grep -qE "\[[ xX]\]" "$LOG_FILE" 2>/dev/null; then
  grep -E "\[[ xX]\]" "$LOG_FILE" | head -20
else
  echo "(No checkboxes found)"
fi
echo ""

# Show iteration markers
echo "━━━ Iteration markers ━━━"
if grep -q "^=== Iteration" "$LOG_FILE" 2>/dev/null; then
  grep "^=== Iteration" "$LOG_FILE"
else
  echo "(No iteration markers found)"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Analysis complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
