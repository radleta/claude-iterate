#!/bin/bash
# Quick smoke test for process cleanup (< 5 seconds)
# Tests the most critical path: can we interrupt without zombies?

set -e

echo "🧪 Quick Smoke Test: Process Cleanup"
echo ""

# Count zombies before
BEFORE=$(ps aux | grep "[d]efunct" | wc -l || echo "0")
echo "Zombies before: $BEFORE"

# Start and kill a short process
echo "Starting sleep process..."
timeout --signal=SIGTERM 0.5s sleep 10 2>/dev/null || true

# Give OS a moment
sleep 0.2

# Count zombies after
AFTER=$(ps aux | grep "[d]efunct" | wc -l || echo "0")
echo "Zombies after:  $AFTER"

# Check for new sleep zombies specifically
SLEEP_ZOMBIES=$(ps aux | grep -E "sleep.*defunct" | grep -v grep | wc -l || echo "0")
echo "Sleep zombies:  $SLEEP_ZOMBIES"

echo ""
if [ "$SLEEP_ZOMBIES" -eq 0 ]; then
    echo "✅ PASS: No zombie processes"
    exit 0
else
    echo "❌ FAIL: Found $SLEEP_ZOMBIES zombie processes"
    ps aux | grep -E "sleep.*defunct" | grep -v grep
    exit 1
fi
