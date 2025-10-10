#!/bin/bash
# Mock Claude CLI for testing parameter passing
# Usage: ./mock-claude.sh [options] <prompt>

# Log all arguments to a file for debugging
echo "=== Mock Claude Called ===" >> /tmp/mock-claude.log
echo "Timestamp: $(date)" >> /tmp/mock-claude.log
echo "Number of args: $#" >> /tmp/mock-claude.log
echo "" >> /tmp/mock-claude.log

# Parse arguments
PRINT_MODE=false
SYSTEM_PROMPT=""
USER_PROMPT=""
SKIP_PERMS=false

i=1
while [ $i -le $# ]; do
    arg="${!i}"

    case "$arg" in
        --version)
            echo "mock-claude 1.0.0"
            exit 0
            ;;
        --print|-p)
            PRINT_MODE=true
            echo "Arg $i: --print" >> /tmp/mock-claude.log
            ;;
        --dangerously-skip-permissions)
            SKIP_PERMS=true
            echo "Arg $i: --dangerously-skip-permissions" >> /tmp/mock-claude.log
            ;;
        --append-system-prompt)
            ((i++))
            arg="${!i}"
            # Support @file syntax
            if [[ "$arg" == @* ]]; then
                file_path="${arg:1}"
                if [ -f "$file_path" ]; then
                    SYSTEM_PROMPT="$(cat "$file_path")"
                    echo "Arg $i-1: --append-system-prompt" >> /tmp/mock-claude.log
                    echo "Arg $i: [@$file_path - ${#SYSTEM_PROMPT} chars from file]" >> /tmp/mock-claude.log
                else
                    echo "Error: File not found: $file_path" >&2
                    exit 1
                fi
            else
                SYSTEM_PROMPT="$arg"
                echo "Arg $i-1: --append-system-prompt" >> /tmp/mock-claude.log
                echo "Arg $i: [SYSTEM_PROMPT - ${#SYSTEM_PROMPT} chars]" >> /tmp/mock-claude.log
            fi
            ;;
        *)
            # Support @file syntax for user prompt
            if [[ "$arg" == @* ]]; then
                file_path="${arg:1}"
                if [ -f "$file_path" ]; then
                    USER_PROMPT="$(cat "$file_path")"
                    echo "Arg $i: [@$file_path - ${#USER_PROMPT} chars from file]" >> /tmp/mock-claude.log
                else
                    echo "Error: File not found: $file_path" >&2
                    exit 1
                fi
            else
                USER_PROMPT="$arg"
                echo "Arg $i: [USER_PROMPT - ${#USER_PROMPT} chars]" >> /tmp/mock-claude.log
            fi
            ;;
    esac
    ((i++))
done

echo "" >> /tmp/mock-claude.log
echo "Parsed values:" >> /tmp/mock-claude.log
echo "  PRINT_MODE: $PRINT_MODE" >> /tmp/mock-claude.log
echo "  SKIP_PERMS: $SKIP_PERMS" >> /tmp/mock-claude.log
echo "  SYSTEM_PROMPT length: ${#SYSTEM_PROMPT}" >> /tmp/mock-claude.log
echo "  USER_PROMPT length: ${#USER_PROMPT}" >> /tmp/mock-claude.log
echo "" >> /tmp/mock-claude.log

# If --print mode, simulate Claude response
if [ "$PRINT_MODE" = true ]; then
    # Simulate processing delay
    sleep 0.5

    # Check if we got prompt from stdin (if USER_PROMPT is empty)
    if [ -z "$USER_PROMPT" ]; then
        # Try to read from stdin
        if [ ! -t 0 ]; then
            USER_PROMPT="$(cat)"
            echo "Read ${#USER_PROMPT} chars from stdin" >> /tmp/mock-claude.log
        else
            echo "Error: No user prompt provided (not in args or stdin)" >&2
            echo "ERROR: No user prompt" >> /tmp/mock-claude.log
            exit 1
        fi
    fi

    # Parse the user prompt to extract task info
    if echo "$USER_PROMPT" | grep -q "output.txt"; then
        # Create the output file as requested
        cat > /workspace/repo/claude-iterate/workspaces/real-test/output.txt <<'OUTPUTEOF'
1
2
3
4
5

Counting complete!
OUTPUTEOF

        # Update TODO.md to mark complete
        cat > /workspace/repo/claude-iterate/workspaces/real-test/TODO.md <<'TODOEOF'
# TODO

- [x] Create output.txt file
- [x] Add numbers 1-5
- [x] Add blank line
- [x] Add completion message

**Remaining: 0**
TODOEOF

        # Simulate Claude's response
        cat <<'RESPONSEEOF'
I'll complete this simple counting task.

Let me read the current TODO:
<bash>cat /workspace/repo/claude-iterate/workspaces/real-test/TODO.md</bash>

Now I'll create the output.txt file with the numbers 1-5:
<bash>cat > /workspace/repo/claude-iterate/workspaces/real-test/output.txt <<'EOF'
1
2
3
4
5

Counting complete!
EOF</bash>

Let me update the TODO to mark everything complete:
<bash>cat > /workspace/repo/claude-iterate/workspaces/real-test/TODO.md <<'EOF'
# TODO

- [x] Create output.txt file
- [x] Add numbers 1-5
- [x] Add blank line
- [x] Add completion message

**Remaining: 0**
EOF</bash>

Task complete! All items have been checked off.
RESPONSEEOF
    else
        echo "Mock response for: ${USER_PROMPT:0:50}..."
        echo ""
        echo "System prompt received: ${#SYSTEM_PROMPT} characters"
        echo "This is a mock Claude response."
    fi

    echo "SUCCESS" >> /tmp/mock-claude.log
    exit 0
else
    echo "Error: Only --print mode is supported by mock" >&2
    echo "ERROR: Not in print mode" >> /tmp/mock-claude.log
    exit 1
fi
