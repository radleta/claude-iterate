#!/bin/bash
# Mock Claude CLI for integration testing
# Accepts the same flags as claude CLI and sleeps for the duration specified in the prompt

SLEEP_DURATION=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --print|--dangerously-skip-permissions)
            # Ignore Claude-specific flags
            shift
            ;;
        *)
            # Treat as the duration (prompt)
            SLEEP_DURATION="$1"
            shift
            ;;
    esac
done

# Sleep for the specified duration
if [ -n "$SLEEP_DURATION" ]; then
    sleep "$SLEEP_DURATION"
    exit 0
else
    echo "No duration specified" >&2
    exit 1
fi
