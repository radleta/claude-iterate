#!/bin/bash
# validate-docs.sh - SDD Documentation Validation Script
# Version: 1.0.0
#
# Purpose: Orchestrate validation tools (markdownlint, mdite, remark) with
#          comprehensive error handling, helpful output, and flexible options.
#
# Usage: Run from documentation root directory (where this script lives)
#        ./validate-docs.sh [OPTIONS]

set -euo pipefail

# ============================================================================
# GLOBAL VARIABLES
# ============================================================================

SCRIPT_VERSION="1.0.0"
SCRIPT_NAME="$(basename "$0")"

# Counters
FAILED_CHECKS=0
PASSED_CHECKS=0
SKIPPED_CHECKS=0
START_TIME=""

# Flags (defaults)
QUIET=0
VERBOSE=0
FIX_MODE=0
FAST_FAIL=0
SKIP_FORMAT=0
SKIP_LINKS=0
SKIP_FRONTMATTER=0
NO_COLOR=0

# Colors (will be set based on terminal support and --no-color flag)
COLOR_RED=""
COLOR_GREEN=""
COLOR_YELLOW=""
COLOR_BLUE=""
COLOR_RESET=""

# Check symbols
CHECK_PASS="✓"
CHECK_FAIL="✗"
CHECK_WARN="⚠"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

# Initialize colors based on terminal support
init_colors() {
  if [[ $NO_COLOR -eq 1 ]] || [[ ! -t 1 ]]; then
    # No color mode or non-interactive terminal
    COLOR_RED=""
    COLOR_GREEN=""
    COLOR_YELLOW=""
    COLOR_BLUE=""
    COLOR_RESET=""
  else
    # Check if terminal supports colors
    if command -v tput >/dev/null 2>&1 && tput setaf 1 >/dev/null 2>&1; then
      COLOR_RED=$(tput setaf 1)
      COLOR_GREEN=$(tput setaf 2)
      COLOR_YELLOW=$(tput setaf 3)
      COLOR_BLUE=$(tput setaf 4)
      COLOR_RESET=$(tput sgr0)
    fi
  fi
}

# Print a box with text
print_box() {
  local text="$1"
  local width=66

  echo "╔══════════════════════════════════════════════════════════════════╗"
  printf "║ %-64s ║\n" "$text"
  echo "╚══════════════════════════════════════════════════════════════════╝"
}

# Print a section header
print_section() {
  local text="$1"
  echo "$text"
}

# Print a status indicator
print_status() {
  local status="$1"  # pass, fail, warn
  local message="$2"

  case "$status" in
    pass)
      echo "${COLOR_GREEN}${CHECK_PASS}${COLOR_RESET} $message"
      ;;
    fail)
      echo "${COLOR_RED}${CHECK_FAIL}${COLOR_RESET} $message"
      ;;
    warn)
      echo "${COLOR_YELLOW}${CHECK_WARN}${COLOR_RESET} $message"
      ;;
  esac
}

# ============================================================================
# ARGUMENT PARSING
# ============================================================================

show_help() {
  cat <<EOF
Usage: $SCRIPT_NAME [OPTIONS]

SDD Documentation Validation Script - Orchestrates markdownlint, mdite,
and remark to validate documentation structure, formatting, and frontmatter.

Options:
  -h, --help              Show this help message
  -q, --quiet             Suppress tool output, only show summary
  -v, --verbose           Show detailed output from all tools
  -f, --fix               Run markdownlint --fix before validation
  --fast-fail             Stop on first failure (useful for CI/CD)
  --skip-format           Skip markdownlint (formatting check)
  --skip-links            Skip mdite (link validation)
  --skip-frontmatter      Skip remark (frontmatter validation)
  --no-color              Disable colored output
  --version               Show script version

Examples:
  $SCRIPT_NAME                    # Run all validations
  $SCRIPT_NAME --fix              # Auto-fix formatting, then validate
  $SCRIPT_NAME --quiet            # Only show summary
  $SCRIPT_NAME --fast-fail        # Stop on first error (CI/CD)
  $SCRIPT_NAME --skip-frontmatter # Skip frontmatter validation

Exit Codes:
  0 - All validations passed
  1 - One or more validation failures detected
  2 - Environment error (wrong directory, missing tool, invalid arguments)

Requirements:
  - Must run from documentation root (containing README.md and .templates/)
  - Required tools: markdownlint, mdite, remark
  - Config files (optional): mdite.config.js, .markdownlint.json, .remarkrc.json
EOF
}

parse_arguments() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h|--help)
        show_help
        exit 0
        ;;
      --version)
        echo "$SCRIPT_NAME version $SCRIPT_VERSION"
        exit 0
        ;;
      -q|--quiet)
        QUIET=1
        shift
        ;;
      -v|--verbose)
        VERBOSE=1
        shift
        ;;
      -f|--fix)
        FIX_MODE=1
        shift
        ;;
      --fast-fail)
        FAST_FAIL=1
        shift
        ;;
      --skip-format)
        SKIP_FORMAT=1
        shift
        ;;
      --skip-links)
        SKIP_LINKS=1
        shift
        ;;
      --skip-frontmatter)
        SKIP_FRONTMATTER=1
        shift
        ;;
      --no-color)
        NO_COLOR=1
        shift
        ;;
      *)
        echo "Error: Unknown option: $1" >&2
        echo "Run '$SCRIPT_NAME --help' for usage information." >&2
        exit 2
        ;;
    esac
  done

  # Validate conflicting options
  if [[ $QUIET -eq 1 && $VERBOSE -eq 1 ]]; then
    echo "Error: Cannot use --quiet and --verbose together" >&2
    exit 2
  fi
}

# ============================================================================
# ENVIRONMENT CHECKS
# ============================================================================

check_working_directory() {
  # Check for README.md and .templates/ directory
  if [[ ! -f "README.md" ]] || [[ ! -d ".templates" ]]; then
    echo ""
    print_status fail "Error: Must run from documentation root directory"
    echo "  Current directory: $(pwd)"
    echo "  Expected: README.md and .templates/ directory"
    echo ""
    echo "Hint: cd to your documentation root directory (the one containing validate-docs.sh)"
    echo ""
    exit 2
  fi
}

check_tool_availability() {
  local missing_tools=()

  # Check required tools (only if not skipped)
  if [[ $SKIP_FORMAT -eq 0 ]] && ! command -v markdownlint >/dev/null 2>&1; then
    missing_tools+=("markdownlint (install: npm install -g markdownlint-cli)")
  fi

  if [[ $SKIP_LINKS -eq 0 ]] && ! command -v mdite >/dev/null 2>&1; then
    missing_tools+=("mdite (install: npm install -g mdite)")
  fi

  if [[ $SKIP_FRONTMATTER -eq 0 ]] && ! command -v remark >/dev/null 2>&1; then
    missing_tools+=("remark (install: npm install -g remark-cli remark-frontmatter remark-lint-frontmatter-schema)")
  fi

  if [[ ${#missing_tools[@]} -gt 0 ]]; then
    echo ""
    print_status fail "Error: Missing required tools:"
    for tool in "${missing_tools[@]}"; do
      echo "  - $tool"
    done
    echo ""
    echo "Cannot continue without required tools."
    echo ""
    exit 2
  fi
}

check_config_files() {
  local config_files=(
    "mdite.config.js"
    ".markdownlint.json"
    ".remarkrc.json"
    ".templates/readme-frontmatter-schema.json"
  )

  local missing_configs=0

  for config in "${config_files[@]}"; do
    if [[ ! -f "$config" ]]; then
      print_status warn "Warning: Config file '$config' not found. Using tool defaults."
      missing_configs=$((missing_configs + 1))
    fi
  done

  if [[ $missing_configs -gt 0 ]]; then
    echo ""
  fi
}

# ============================================================================
# VALIDATION RUNNERS
# ============================================================================

run_markdownlint() {
  local step_num="1"
  local total_steps="3"

  # Calculate actual step number based on skipped checks
  if [[ $SKIP_FORMAT -eq 0 && $SKIP_LINKS -eq 0 && $SKIP_FRONTMATTER -eq 0 ]]; then
    step_num="1"
    total_steps="3"
  else
    # Adjust based on what's enabled
    local enabled_count=0
    [[ $SKIP_FORMAT -eq 0 ]] && enabled_count=$((enabled_count + 1))
    [[ $SKIP_LINKS -eq 0 ]] && enabled_count=$((enabled_count + 1))
    [[ $SKIP_FRONTMATTER -eq 0 ]] && enabled_count=$((enabled_count + 1))
    total_steps=$enabled_count
    step_num=$((PASSED_CHECKS + FAILED_CHECKS + 1))
  fi

  if [[ $FIX_MODE -eq 1 ]]; then
    echo "[${step_num}/${total_steps}] Auto-fixing formatting (markdownlint --fix)..."
  else
    echo "[${step_num}/${total_steps}] Checking formatting (markdownlint)..."
  fi

  local cmd="markdownlint"
  [[ $FIX_MODE -eq 1 ]] && cmd="$cmd --fix"
  cmd="$cmd '**/*.md'"

  local output
  local exit_code=0

  # Capture output
  output=$(eval "$cmd" 2>&1) || exit_code=$?

  if [[ $exit_code -eq 0 ]]; then
    if [[ $FIX_MODE -eq 1 ]]; then
      print_status pass "Formatting check passed (auto-fixed issues)"
    else
      print_status pass "Formatting check passed (0 issues)"
    fi
    PASSED_CHECKS=$((PASSED_CHECKS + 1))

    # Show output in verbose mode
    if [[ $VERBOSE -eq 1 && -n "$output" ]]; then
      echo "$output"
    fi
  else
    # Count issues from output
    local issue_count=$(echo "$output" | grep -c "MD[0-9]" || true)
    print_status fail "Formatting check failed ($issue_count issues found)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))

    # Show output unless quiet mode
    if [[ $QUIET -eq 0 ]]; then
      echo ""
      echo "$output"
      echo ""
    fi

    if [[ $FAST_FAIL -eq 1 ]]; then
      echo ""
      echo "Stopping validation (--fast-fail mode)"
      echo ""
      return 1
    fi
  fi

  echo ""
}

run_mdite() {
  local step_num=$((PASSED_CHECKS + FAILED_CHECKS + 1))
  local total_steps=3

  # Calculate total based on skipped checks
  local enabled_count=0
  [[ $SKIP_FORMAT -eq 0 ]] && enabled_count=$((enabled_count + 1))
  [[ $SKIP_LINKS -eq 0 ]] && enabled_count=$((enabled_count + 1))
  [[ $SKIP_FRONTMATTER -eq 0 ]] && enabled_count=$((enabled_count + 1))
  total_steps=$enabled_count

  echo "[${step_num}/${total_steps}] Validating structure and links (mdite)..."

  local output
  local exit_code=0

  # Capture output
  output=$(mdite lint 2>&1) || exit_code=$?

  if [[ $exit_code -eq 0 ]]; then
    print_status pass "Structure validation passed"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))

    # Show output in verbose mode
    if [[ $VERBOSE -eq 1 && -n "$output" ]]; then
      echo "$output"
    fi
  else
    # Count issues
    local issue_count=$(echo "$output" | grep -c "error\|warning" || true)
    print_status fail "Structure validation failed ($issue_count issues found)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))

    # Show output unless quiet mode
    if [[ $QUIET -eq 0 ]]; then
      echo ""
      echo "$output"
      echo ""
    fi

    if [[ $FAST_FAIL -eq 1 ]]; then
      echo ""
      echo "Stopping validation (--fast-fail mode)"
      echo ""
      return 1
    fi
  fi

  echo ""
}

run_remark() {
  local step_num=$((PASSED_CHECKS + FAILED_CHECKS + 1))
  local total_steps=3

  # Calculate total based on skipped checks
  local enabled_count=0
  [[ $SKIP_FORMAT -eq 0 ]] && enabled_count=$((enabled_count + 1))
  [[ $SKIP_LINKS -eq 0 ]] && enabled_count=$((enabled_count + 1))
  [[ $SKIP_FRONTMATTER -eq 0 ]] && enabled_count=$((enabled_count + 1))
  total_steps=$enabled_count

  echo "[${step_num}/${total_steps}] Validating frontmatter (remark)..."

  local output
  local exit_code=0

  # Capture output
  output=$(remark '**/README.md' --quiet --frail 2>&1) || exit_code=$?

  if [[ $exit_code -eq 0 ]]; then
    print_status pass "Frontmatter validation passed"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))

    # Show output in verbose mode
    if [[ $VERBOSE -eq 1 && -n "$output" ]]; then
      echo "$output"
    fi
  else
    # Count issues
    local issue_count=$(echo "$output" | grep -c "warning\|error" || true)
    print_status fail "Frontmatter validation failed ($issue_count issues found)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))

    # Show output unless quiet mode
    if [[ $QUIET -eq 0 ]]; then
      echo ""
      echo "$output"
      echo ""
    fi

    if [[ $FAST_FAIL -eq 1 ]]; then
      echo ""
      echo "Stopping validation (--fast-fail mode)"
      echo ""
      return 1
    fi
  fi

  echo ""
}

# ============================================================================
# SUMMARY
# ============================================================================

print_summary() {
  local end_time=$(date +%s)
  local elapsed=$((end_time - START_TIME))
  local elapsed_display="${elapsed}.0"

  # Calculate better elapsed time
  if command -v bc >/dev/null 2>&1; then
    elapsed_display=$(echo "scale=1; $elapsed" | bc)
  fi

  local total_checks=$((PASSED_CHECKS + FAILED_CHECKS))

  echo "╔══════════════════════════════════════════════════════════════════╗"
  echo "║ Validation Summary                                               ║"
  echo "╠══════════════════════════════════════════════════════════════════╣"

  # Print each check result
  if [[ $SKIP_FORMAT -eq 0 ]]; then
    local status="${COLOR_GREEN}${CHECK_PASS}${COLOR_RESET}"
    local msg="Formatting check"

    # Determine if this check passed or failed
    # (This is approximate - we'd need to track individual results)
    if [[ $FAILED_CHECKS -gt 0 ]]; then
      # Check if markdownlint failed (first check)
      status="${COLOR_RED}${CHECK_FAIL}${COLOR_RESET}"
    fi

    printf "║ %b %-18s %-42s ║\n" "$status" "markdownlint" "$msg"
  fi

  if [[ $SKIP_LINKS -eq 0 ]]; then
    local status="${COLOR_GREEN}${CHECK_PASS}${COLOR_RESET}"
    local msg="Structure and links"

    if [[ $FAILED_CHECKS -gt 0 ]]; then
      status="${COLOR_RED}${CHECK_FAIL}${COLOR_RESET}"
    fi

    printf "║ %b %-18s %-42s ║\n" "$status" "mdite" "$msg"
  fi

  if [[ $SKIP_FRONTMATTER -eq 0 ]]; then
    local status="${COLOR_GREEN}${CHECK_PASS}${COLOR_RESET}"
    local msg="Frontmatter validation"

    if [[ $FAILED_CHECKS -gt 0 ]]; then
      status="${COLOR_RED}${CHECK_FAIL}${COLOR_RESET}"
    fi

    printf "║ %b %-18s %-42s ║\n" "$status" "remark" "$msg"
  fi

  echo "╠══════════════════════════════════════════════════════════════════╣"

  if [[ $FAILED_CHECKS -eq 0 ]]; then
    printf "║ Result: ${COLOR_GREEN}PASSED${COLOR_RESET} (%d/%d checks passed)%*s║\n" \
      "$PASSED_CHECKS" "$total_checks" $((38 - ${#PASSED_CHECKS} - ${#total_checks})) ""
  else
    printf "║ Result: ${COLOR_RED}FAILED${COLOR_RESET} (%d/%d checks failed)%*s║\n" \
      "$FAILED_CHECKS" "$total_checks" $((38 - ${#FAILED_CHECKS} - ${#total_checks})) ""
  fi

  printf "║ Time: %s seconds%*s║\n" "$elapsed_display" $((55 - ${#elapsed_display})) ""
  echo "╚══════════════════════════════════════════════════════════════════╝"

  # Helpful hint for quiet mode
  if [[ $QUIET -eq 1 && $FAILED_CHECKS -gt 0 ]]; then
    echo ""
    echo "Run with --verbose to see detailed error messages."
  fi
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  START_TIME=$(date +%s)

  # Parse arguments first
  parse_arguments "$@"

  # Initialize colors
  init_colors

  # Show header
  print_box "SDD Documentation Validation"
  echo "Directory: $(pwd)"
  echo ""

  # Environment checks
  check_working_directory
  check_tool_availability
  check_config_files

  # Run validations
  local validation_failed=0

  if [[ $SKIP_FORMAT -eq 0 ]]; then
    run_markdownlint || validation_failed=1
  fi

  if [[ $validation_failed -eq 0 || $FAST_FAIL -eq 0 ]] && [[ $SKIP_LINKS -eq 0 ]]; then
    run_mdite || validation_failed=1
  fi

  if [[ $validation_failed -eq 0 || $FAST_FAIL -eq 0 ]] && [[ $SKIP_FRONTMATTER -eq 0 ]]; then
    run_remark || validation_failed=1
  fi

  # Print summary
  print_summary
  echo ""

  # Exit with appropriate code
  if [[ $FAILED_CHECKS -eq 0 ]]; then
    exit 0
  else
    exit 1
  fi
}

# Run main function
main "$@"
