# Lanonasis/Onasis CLI Fish Completion
# Installation: Place in ~/.config/fish/completions/

# Helper function to check if a command is being used
function __fish_lanonasis_using_command
    set -l cmd (commandline -opc)
    if [ (count $cmd) -eq 2 ]
        if [ $argv[1] = $cmd[2] ]
            return 0
        end
    end
    return 1
end

function __fish_lanonasis_using_subcommand
    set -l cmd (commandline -opc)
    if [ (count $cmd) -eq 3 ]
        if [ $argv[1] = $cmd[2] ]; and [ $argv[2] = $cmd[3] ]
            return 0
        end
    end
    return 1
end

# Global options
complete -c lanonasis -s h -l help -d 'Show help information'
complete -c lanonasis -s v -l version -d 'Show version information'
complete -c lanonasis -s V -l verbose -d 'Enable verbose logging'
complete -c lanonasis -l output -d 'Output format' -xa 'table json yaml csv'
complete -c lanonasis -l api-url -d 'Override API URL'
complete -c lanonasis -l no-mcp -d 'Disable MCP and use direct API'

# Main commands
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'init' -d 'Initialize CLI configuration'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'login' -d 'Authenticate with your account'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'auth' -d 'Authentication commands'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'logout' -d 'Logout from your account'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'status' -d 'Show system status'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'health' -d 'Comprehensive health check'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'docs' -d 'Open documentation'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'memory' -d 'Memory management commands'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'mem' -d 'Memory management (alias)'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'topic' -d 'Topic management commands'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'topics' -d 'Topic management (alias)'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'config' -d 'Configuration management'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'org' -d 'Organization management'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'organization' -d 'Organization management (alias)'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'api-keys' -d 'API key management'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'mcp' -d 'Model Context Protocol commands'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'dashboard' -d 'Dashboard management'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'documentation' -d 'Documentation management'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'sdk' -d 'SDK management'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'api' -d 'REST API management'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'rest' -d 'REST API management (alias)'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'deploy' -d 'Deployment management'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'deployment' -d 'Deployment management (alias)'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'service' -d 'Service management'
complete -c lanonasis -f -n '__fish_use_subcommand' -a 'services' -d 'Service management (alias)'

# Auth subcommands
complete -c lanonasis -f -n '__fish_lanonasis_using_command auth' -a 'login' -d 'Login to your account'
complete -c lanonasis -f -n '__fish_lanonasis_using_command auth' -a 'logout' -d 'Logout from your account'
complete -c lanonasis -f -n '__fish_lanonasis_using_command auth' -a 'status' -d 'Show authentication status'
complete -c lanonasis -f -n '__fish_lanonasis_using_command auth' -a 'vendor-key' -d 'Authenticate with vendor key'
complete -c lanonasis -f -n '__fish_lanonasis_using_command auth' -a 'oauth' -d 'Browser-based OAuth authentication'

# Memory subcommands
complete -c lanonasis -f -n '__fish_lanonasis_using_command memory' -a 'list' -d 'List memories'
complete -c lanonasis -f -n '__fish_lanonasis_using_command memory' -a 'create' -d 'Create a new memory'
complete -c lanonasis -f -n '__fish_lanonasis_using_command memory' -a 'get' -d 'Get a specific memory'
complete -c lanonasis -f -n '__fish_lanonasis_using_command memory' -a 'update' -d 'Update an existing memory'
complete -c lanonasis -f -n '__fish_lanonasis_using_command memory' -a 'delete' -d 'Delete a memory'
complete -c lanonasis -f -n '__fish_lanonasis_using_command memory' -a 'search' -d 'Search memories'
complete -c lanonasis -f -n '__fish_lanonasis_using_command memory' -a 'stats' -d 'Show memory statistics'
complete -c lanonasis -f -n '__fish_lanonasis_using_command memory' -a 'bulk-delete' -d 'Delete multiple memories'
complete -c lanonasis -f -n '__fish_lanonasis_using_command memory' -a 'export' -d 'Export memories'
complete -c lanonasis -f -n '__fish_lanonasis_using_command memory' -a 'import' -d 'Import memories'

# Memory command options
complete -c lanonasis -n '__fish_lanonasis_using_subcommand memory create' -l memory-type -xa 'context project knowledge reference personal workflow'
complete -c lanonasis -n '__fish_lanonasis_using_subcommand memory update' -l memory-type -xa 'context project knowledge reference personal workflow'
complete -c lanonasis -n '__fish_lanonasis_using_subcommand memory list' -l memory-type -xa 'context project knowledge reference personal workflow'
complete -c lanonasis -n '__fish_lanonasis_using_subcommand memory list' -l sort-by -xa 'created_at updated_at last_accessed access_count'
complete -c lanonasis -n '__fish_lanonasis_using_subcommand memory list' -l sort-order -xa 'asc desc'

# Topic subcommands
complete -c lanonasis -f -n '__fish_lanonasis_using_command topic' -a 'list' -d 'List topics'
complete -c lanonasis -f -n '__fish_lanonasis_using_command topic' -a 'create' -d 'Create a new topic'
complete -c lanonasis -f -n '__fish_lanonasis_using_command topic' -a 'get' -d 'Get a specific topic'
complete -c lanonasis -f -n '__fish_lanonasis_using_command topic' -a 'update' -d 'Update an existing topic'
complete -c lanonasis -f -n '__fish_lanonasis_using_command topic' -a 'delete' -d 'Delete a topic'

# Config subcommands
complete -c lanonasis -f -n '__fish_lanonasis_using_command config' -a 'get' -d 'Get configuration value'
complete -c lanonasis -f -n '__fish_lanonasis_using_command config' -a 'set' -d 'Set configuration value'
complete -c lanonasis -f -n '__fish_lanonasis_using_command config' -a 'list' -d 'List all configuration'
complete -c lanonasis -f -n '__fish_lanonasis_using_command config' -a 'reset' -d 'Reset configuration'

# API Keys subcommands
complete -c lanonasis -f -n '__fish_lanonasis_using_command api-keys' -a 'list' -d 'List API keys'
complete -c lanonasis -f -n '__fish_lanonasis_using_command api-keys' -a 'create' -d 'Create a new API key'
complete -c lanonasis -f -n '__fish_lanonasis_using_command api-keys' -a 'revoke' -d 'Revoke an API key'
complete -c lanonasis -f -n '__fish_lanonasis_using_command api-keys' -a 'rotate' -d 'Rotate an API key'

# MCP subcommands
complete -c lanonasis -f -n '__fish_lanonasis_using_command mcp' -a 'status' -d 'Show MCP server status'
complete -c lanonasis -f -n '__fish_lanonasis_using_command mcp' -a 'connect' -d 'Connect to MCP server'
complete -c lanonasis -f -n '__fish_lanonasis_using_command mcp' -a 'disconnect' -d 'Disconnect from MCP server'
complete -c lanonasis -f -n '__fish_lanonasis_using_command mcp' -a 'servers' -d 'List MCP servers'
complete -c lanonasis -f -n '__fish_lanonasis_using_command mcp' -a 'tools' -d 'List available tools'
complete -c lanonasis -f -n '__fish_lanonasis_using_command mcp' -a 'resources' -d 'List available resources'

# Dashboard subcommands
complete -c lanonasis -f -n '__fish_lanonasis_using_command dashboard' -a 'status' -d 'Check dashboard status'
complete -c lanonasis -f -n '__fish_lanonasis_using_command dashboard' -a 'logs' -d 'View dashboard logs'
complete -c lanonasis -f -n '__fish_lanonasis_using_command dashboard' -a 'open' -d 'Open dashboard in browser'

# Deploy subcommands
complete -c lanonasis -f -n '__fish_lanonasis_using_command deploy' -a 'status' -d 'Show deployment status'
complete -c lanonasis -f -n '__fish_lanonasis_using_command deploy' -a 'health' -d 'Check deployment health'
complete -c lanonasis -f -n '__fish_lanonasis_using_command deploy' -a 'list' -d 'List deployments'

# Service subcommands
complete -c lanonasis -f -n '__fish_lanonasis_using_command service' -a 'list' -d 'List services'
complete -c lanonasis -f -n '__fish_lanonasis_using_command service' -a 'status' -d 'Show service status'
complete -c lanonasis -f -n '__fish_lanonasis_using_command service' -a 'restart' -d 'Restart a service'
complete -c lanonasis -f -n '__fish_lanonasis_using_command service' -a 'logs' -d 'View service logs'

# Apply same completions for all aliases
complete -c onasis -w lanonasis
complete -c memory -w lanonasis
complete -c maas -w lanonasis