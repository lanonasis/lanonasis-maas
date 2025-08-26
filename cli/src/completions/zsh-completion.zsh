#compdef lanonasis onasis memory maas

# Lanonasis/Onasis CLI Zsh Completion
# Installation: Place in your $fpath (e.g., ~/.zsh/completions/) and run 'compinit'

_lanonasis() {
    local context curcontext="$curcontext" state line
    typeset -A opt_args

    _arguments -C \
        '1: :_lanonasis_commands' \
        '*:: :->args' \
        '--help[Show help information]' \
        '--version[Show version information]' \
        '--verbose[Enable verbose logging]' \
        '--output[Output format]:format:(table json yaml csv)' \
        '--api-url[Override API URL]:url:' \
        '--no-mcp[Disable MCP and use direct API]'

    case $state in
        args)
            case $words[1] in
                auth|login)
                    _lanonasis_auth_commands
                    ;;
                memory|mem)
                    _lanonasis_memory_commands
                    ;;
                topic|topics)
                    _lanonasis_topic_commands
                    ;;
                config)
                    _lanonasis_config_commands
                    ;;
                api-keys)
                    _lanonasis_apikeys_commands
                    ;;
                mcp)
                    _lanonasis_mcp_commands
                    ;;
                dashboard)
                    _lanonasis_dashboard_commands
                    ;;
                deploy|deployment)
                    _lanonasis_deploy_commands
                    ;;
                service|services)
                    _lanonasis_service_commands
                    ;;
            esac
            ;;
    esac
}

_lanonasis_commands() {
    local commands; commands=(
        'init:Initialize CLI configuration'
        'login:Authenticate with your account'
        'auth:Authentication commands'
        'logout:Logout from your account'
        'status:Show system status'
        'health:Comprehensive health check'
        'docs:Open documentation'
        'memory:Memory management commands'
        'mem:Memory management (alias)'
        'topic:Topic management commands'
        'topics:Topic management (alias)'
        'config:Configuration management'
        'org:Organization management'
        'organization:Organization management (alias)'
        'api-keys:API key management'
        'mcp:Model Context Protocol commands'
        'dashboard:Dashboard management'
        'documentation:Documentation management'
        'sdk:SDK management'
        'api:REST API management'
        'rest:REST API management (alias)'
        'deploy:Deployment management'
        'deployment:Deployment management (alias)'
        'service:Service management'
        'services:Service management (alias)'
    )
    _describe 'commands' commands
}

_lanonasis_auth_commands() {
    local subcommands; subcommands=(
        'login:Login to your account'
        'logout:Logout from your account'
        'status:Show authentication status'
        'vendor-key:Authenticate with vendor key'
        'oauth:Browser-based OAuth authentication'
    )
    _describe 'auth commands' subcommands
}

_lanonasis_memory_commands() {
    local subcommands; subcommands=(
        'list:List memories'
        'create:Create a new memory'
        'get:Get a specific memory'
        'update:Update an existing memory'
        'delete:Delete a memory'
        'search:Search memories'
        'stats:Show memory statistics'
        'bulk-delete:Delete multiple memories'
        'export:Export memories'
        'import:Import memories'
    )
    _describe 'memory commands' subcommands

    # Add memory type completion for relevant commands
    if [[ "$words[2]" == "create" || "$words[2]" == "update" || "$words[2]" == "list" ]]; then
        _arguments \
            '--memory-type[Memory type]:type:(context project knowledge reference personal workflow)' \
            '--tags[Tags]:tags:' \
            '--topic-id[Topic ID]:topic:'
    fi
}

_lanonasis_topic_commands() {
    local subcommands; subcommands=(
        'list:List topics'
        'create:Create a new topic'
        'get:Get a specific topic'
        'update:Update an existing topic'
        'delete:Delete a topic'
    )
    _describe 'topic commands' subcommands
}

_lanonasis_config_commands() {
    local subcommands; subcommands=(
        'get:Get configuration value'
        'set:Set configuration value'
        'list:List all configuration'
        'reset:Reset configuration'
    )
    _describe 'config commands' subcommands
}

_lanonasis_apikeys_commands() {
    local subcommands; subcommands=(
        'list:List API keys'
        'create:Create a new API key'
        'revoke:Revoke an API key'
        'rotate:Rotate an API key'
    )
    _describe 'api-keys commands' subcommands
}

_lanonasis_mcp_commands() {
    local subcommands; subcommands=(
        'status:Show MCP server status'
        'connect:Connect to MCP server'
        'disconnect:Disconnect from MCP server'
        'servers:List MCP servers'
        'tools:List available tools'
        'resources:List available resources'
    )
    _describe 'mcp commands' subcommands
}

_lanonasis_dashboard_commands() {
    local subcommands; subcommands=(
        'status:Check dashboard status'
        'logs:View dashboard logs'
        'open:Open dashboard in browser'
    )
    _describe 'dashboard commands' subcommands
}

_lanonasis_deploy_commands() {
    local subcommands; subcommands=(
        'status:Show deployment status'
        'health:Check deployment health'
        'list:List deployments'
    )
    _describe 'deploy commands' subcommands
}

_lanonasis_service_commands() {
    local subcommands; subcommands=(
        'list:List services'
        'status:Show service status'
        'restart:Restart a service'
        'logs:View service logs'
    )
    _describe 'service commands' subcommands
}

# Initialize completion for all aliases
compdef _lanonasis lanonasis
compdef _lanonasis onasis
compdef _lanonasis memory
compdef _lanonasis maas