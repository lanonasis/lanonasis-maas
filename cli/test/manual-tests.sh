#!/usr/bin/env bash

# CLI Manual Test Script
# Purpose: Quick manual verification of CLI commands for debugging
# Usage: ./test-manual.sh [command-category] [options]
#
# Categories: all, auth, memory, topics, config, mcp, system
# Options: --verbose, --api-url <url>, --vendor-key <key>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
CLI_CMD="${CLI_CMD:-lanonasis}"
VERBOSE="${VERBOSE:-false}"
API_URL="${API_URL:-}"
VENDOR_KEY="${VENDOR_KEY:-}"
TEST_DIR="/tmp/lanonasis-cli-test-$$"

# Parse arguments
CATEGORY="${1:-all}"
shift || true

while [[ $# -gt 0 ]]; do
  case $1 in
    --verbose)
      VERBOSE=true
      shift
      ;;
    --api-url)
      API_URL="$2"
      shift 2
      ;;
    --vendor-key)
      VENDOR_KEY="$2"
      shift 2
      ;;
    --cli-cmd)
      CLI_CMD="$2"
      shift 2
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Helper functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[PASS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[FAIL]${NC} $1"
}

log_section() {
  echo -e "\n${CYAN}========================================${NC}"
  echo -e "${CYAN}$1${NC}"
  echo -e "${CYAN}========================================${NC}\n"
}

run_test() {
  local test_name="$1"
  local command="$2"
  local expect_success="${3:-true}"
  
  echo -n "  Testing: $test_name ... "
  
  if [ "$VERBOSE" = true ]; then
    echo ""
    echo "    Command: $command"
  fi
  
  # Run command and capture output
  set +e
  if [ "$VERBOSE" = true ]; then
    output=$(eval "$command" 2>&1)
    exit_code=$?
    echo "$output" | sed 's/^/    /'
  else
    output=$(eval "$command" 2>&1)
    exit_code=$?
  fi
  set -e
  
  # Check result
  if [ "$expect_success" = true ]; then
    if [ $exit_code -eq 0 ]; then
      log_success "$test_name"
      return 0
    else
      log_error "$test_name (exit code: $exit_code)"
      if [ "$VERBOSE" = true ]; then
        echo "    Output: $output"
      fi
      return 1
    fi
  else
    if [ $exit_code -ne 0 ]; then
      log_success "$test_name (expected failure)"
      return 0
    else
      log_warning "$test_name (expected failure but succeeded)"
      return 1
    fi
  fi
}

setup() {
  log_info "Setting up test environment..."
  mkdir -p "$TEST_DIR"
  
  # Setup isolated config if vendor key provided
  if [ -n "$VENDOR_KEY" ]; then
    log_info "Configuring with vendor key..."
    export HOME="$TEST_DIR"
  fi
  
  # Setup API URL override
  if [ -n "$API_URL" ]; then
    export MEMORY_API_URL="$API_URL"
    log_info "Using custom API URL: $API_URL"
  fi
}

cleanup() {
  log_info "Cleaning up test environment..."
  rm -rf "$TEST_DIR"
}

trap cleanup EXIT

# Test categories
test_system() {
  log_section "System Commands"
  
  run_test "Version" "$CLI_CMD --version"
  run_test "Help" "$CLI_CMD --help"
  run_test "Health" "$CLI_CMD health"
  run_test "Status" "$CLI_CMD status"
  run_test "Completion (bash)" "$CLI_CMD completion bash"
  run_test "Quickstart" "$CLI_CMD quickstart"
}

test_auth() {
  log_section "Auth Commands"
  
  if [ -n "$VENDOR_KEY" ]; then
    run_test "Login (vendor key)" "$CLI_CMD auth login --vendor-key $VENDOR_KEY"
    run_test "Auth Status" "$CLI_CMD auth status"
    run_test "Whoami" "$CLI_CMD whoami"
    run_test "Logout" "$CLI_CMD auth logout"
  else
    log_warning "Skipping auth tests (no vendor key provided)"
    log_info "Set VENDOR_KEY env var to run auth tests"
    
    # Test auth commands without credentials (should fail gracefully)
    run_test "Auth Status (no auth)" "$CLI_CMD auth status" false
    run_test "Whoami (no auth)" "$CLI_CMD whoami" false
  fi
  
  # Test registration validation (should fail with invalid email)
  run_test "Register (invalid email)" "$CLI_CMD auth register --email invalid --password Test1234! --confirm-password Test1234! --organization-name Test" false
}

test_memory() {
  log_section "Memory Commands"
  
  if [ -z "$VENDOR_KEY" ]; then
    log_warning "Memory tests require vendor key"
    log_info "Set VENDOR_KEY env var to run memory tests"
    
    # Test memory commands without auth (should fail gracefully)
    run_test "Memory List (no auth)" "$CLI_CMD memory list" false
    run_test "Memory Create (no auth)" "$CLI_CMD memory create --title Test --content Test" false
    return
  fi
  
  # Create a test memory
  log_info "Creating test memory..."
  create_output=$($CLI_CMD memory create --title "CLI Test Memory" --content "Test content for manual verification" --type context --tags "test,cli,manual" 2>&1) || true
  echo "$create_output" | head -5 | sed 's/^/  /'
  
  # Extract memory ID if possible
  memory_id=$(echo "$create_output" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1) || true
  
  if [ -n "$memory_id" ]; then
    log_info "Created test memory: $memory_id"
    
    run_test "Memory Get" "$CLI_CMD memory get $memory_id"
    run_test "Memory Update" "$CLI_CMD memory update $memory_id --title 'Updated Test Memory'"
    run_test "Memory List (with filter)" "$CLI_CMD memory list --type context --limit 5"
    run_test "Memory Search" "$CLI_CMD memory search 'test' --limit 5"
    run_test "Memory Stats" "$CLI_CMD memory stats"
    
    # Cleanup
    log_info "Cleaning up test memory..."
    $CLI_CMD memory delete $memory_id >/dev/null 2>&1 || true
  else
    log_warning "Could not extract memory ID, skipping memory-specific tests"
    run_test "Memory List" "$CLI_CMD memory list --limit 5"
    run_test "Memory Search" "$CLI_CMD memory search 'test' --limit 5"
    run_test "Memory Stats" "$CLI_CMD memory stats"
  fi
}

test_topics() {
  log_section "Topic Commands"
  
  if [ -z "$VENDOR_KEY" ]; then
    log_warning "Topic tests require vendor key"
    run_test "Topic List (no auth)" "$CLI_CMD topic list" false
    return
  fi
  
  # Create a test topic
  log_info "Creating test topic..."
  create_output=$($CLI_CMD topic create --name "CLI Test Topic" --description "Test topic for manual verification" --color "#3B82F6" --icon "🧪" 2>&1) || true
  echo "$create_output" | head -5 | sed 's/^/  /'
  
  topic_id=$(echo "$create_output" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1) || true
  
  if [ -n "$topic_id" ]; then
    log_info "Created test topic: $topic_id"
    
    run_test "Topic List" "$CLI_CMD topic list"
    run_test "Topic Get" "$CLI_CMD topic get $topic_id"
    run_test "Topic Update" "$CLI_CMD topic update $topic_id --name 'Updated Test Topic'"
    
    # Cleanup
    log_info "Cleaning up test topic..."
    $CLI_CMD topic delete $topic_id >/dev/null 2>&1 || true
  else
    log_warning "Could not extract topic ID, skipping topic-specific tests"
    run_test "Topic List" "$CLI_CMD topic list"
  fi
}

test_config() {
  log_section "Config Commands"
  
  local test_key="manual_test_$$"
  local test_value="test_value_$$"
  
  run_test "Config List" "$CLI_CMD config list"
  run_test "Config Set" "$CLI_CMD config set $test_key $test_value"
  run_test "Config Get" "$CLI_CMD config get $test_key"
  run_test "Config Reset" "$CLI_CMD config reset"
}

test_mcp() {
  log_section "MCP Commands"
  
  run_test "MCP Status" "$CLI_CMD mcp status"
  run_test "MCP Tools" "$CLI_CMD mcp tools"
  run_test "MCP Resources" "$CLI_CMD mcp resources"
  run_test "MCP Health" "$CLI_CMD mcp health"
  run_test "MCP List Servers" "$CLI_CMD mcp list-servers"
  
  # These may fail without proper setup, but should not crash
  run_test "MCP Connect (auto)" "$CLI_CMD mcp connect" false
  run_test "MCP Server Start" "$CLI_CMD mcp-server start" false
}

test_api_keys() {
  log_section "API Keys Commands"
  
  if [ -z "$VENDOR_KEY" ]; then
    log_warning "API Keys tests require vendor key"
    run_test "API Keys List (no auth)" "$CLI_CMD api-keys list" false
    return
  fi
  
  run_test "API Keys List" "$CLI_CMD api-keys list"
  
  # Create a test API key
  log_info "Creating test API key..."
  create_output=$($CLI_CMD api-keys create --name "Manual Test Key" --scope "memory:read" 2>&1) || true
  echo "$create_output" | head -5 | sed 's/^/  /'
  
  key_id=$(echo "$create_output" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1) || true
  
  if [ -n "$key_id" ]; then
    log_info "Created test API key: $key_id"
    
    # Note: Skip rotate test as it invalidates the key
    # run_test "API Keys Rotate" "$CLI_CMD api-keys rotate $key_id"
    
    # Cleanup
    log_info "Cleaning up test API key..."
    $CLI_CMD api-keys revoke $key_id >/dev/null 2>&1 || true
  else
    log_warning "Could not extract API key ID"
  fi
}

test_edge_cases() {
  log_section "Edge Cases & Error Handling"
  
  # Invalid commands
  run_test "Unknown command" "$CLI_CMD unknown-command-xyz" false
  run_test "Invalid option" "$CLI_CMD health --invalid-option" false
  
  # Missing required args
  run_test "Memory get without ID" "$CLI_CMD memory get" false
  run_test "Config get without key" "$CLI_CMD config get" false
  
  # Invalid formats
  run_test "Invalid memory type" "$CLI_CMD memory create --title Test --content Test --type invalid_type" false
  run_test "Invalid color format" "$CLI_CMD topic create --name Test --color invalid" false
}

# Main execution
main() {
  log_info "CLI Manual Test Suite"
  log_info "CLI Command: $CLI_CMD"
  log_info "Category: $CATEGORY"
  log_info "Verbose: $VERBOSE"
  
  setup
  
  case $CATEGORY in
    all)
      test_system
      test_auth
      test_memory
      test_topics
      test_config
      test_mcp
      test_api_keys
      test_edge_cases
      ;;
    system)
      test_system
      test_edge_cases
      ;;
    auth)
      test_auth
      ;;
    memory)
      test_memory
      ;;
    topics)
      test_topics
      ;;
    config)
      test_config
      ;;
    mcp)
      test_mcp
      ;;
    api-keys)
      test_api_keys
      ;;
    edge)
      test_edge_cases
      ;;
    *)
      log_error "Unknown category: $CATEGORY"
      echo "Valid categories: all, system, auth, memory, topics, config, mcp, api-keys, edge"
      exit 1
      ;;
  esac
  
  log_section "Test Summary"
  log_success "Manual test suite completed!"
  log_info "For detailed testing, run: $CLI_CMD --help"
  log_info "For automated tests, run: bun run test"
}

main
