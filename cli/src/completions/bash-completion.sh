#!/bin/bash

# Lanonasis/Onasis CLI Bash Completion
# Installation: source this file or copy to /etc/bash_completion.d/

_lanonasis_completions() {
    local cur prev words cword
    _init_completion || return

    # Get completion data from CLI
    local completion_data
    completion_data=$(lanonasis --completion-data 2>/dev/null || echo '{}')

    case "${COMP_CWORD}" in
        1)
            # Main commands
            local commands=$(echo "$completion_data" | jq -r '.commands[]?.name // empty' 2>/dev/null)
            if [[ -z "$commands" ]]; then
                commands="init login auth logout status health docs memory mem topic topics config org organization api-keys mcp dashboard documentation sdk api rest deploy deployment service services"
            fi
            COMPREPLY=($(compgen -W "$commands" -- "$cur"))
            ;;
        2)
            # Subcommands based on main command
            case "${words[1]}" in
                auth|login)
                    COMPREPLY=($(compgen -W "login logout status vendor-key oauth" -- "$cur"))
                    ;;
                memory|mem)
                    COMPREPLY=($(compgen -W "list create get update delete search stats bulk-delete export import" -- "$cur"))
                    ;;
                topic|topics)
                    COMPREPLY=($(compgen -W "list create get update delete" -- "$cur"))
                    ;;
                config)
                    COMPREPLY=($(compgen -W "get set list reset" -- "$cur"))
                    ;;
                api-keys)
                    COMPREPLY=($(compgen -W "list create revoke rotate" -- "$cur"))
                    ;;
                mcp)
                    COMPREPLY=($(compgen -W "status connect disconnect servers tools resources" -- "$cur"))
                    ;;
                dashboard)
                    COMPREPLY=($(compgen -W "status logs open" -- "$cur"))
                    ;;
                deploy|deployment)
                    COMPREPLY=($(compgen -W "status health list" -- "$cur"))
                    ;;
                service|services)
                    COMPREPLY=($(compgen -W "list status restart logs" -- "$cur"))
                    ;;
            esac
            ;;
        *)
            # Options and flags
            case "${prev}" in
                --memory-type)
                    COMPREPLY=($(compgen -W "context project knowledge reference personal workflow" -- "$cur"))
                    ;;
                --output)
                    COMPREPLY=($(compgen -W "table json yaml csv" -- "$cur"))
                    ;;
                --sort-by)
                    COMPREPLY=($(compgen -W "created_at updated_at last_accessed access_count" -- "$cur"))
                    ;;
                --sort-order)
                    COMPREPLY=($(compgen -W "asc desc" -- "$cur"))
                    ;;
                --api-url)
                    COMPREPLY=($(compgen -W "https://api.lanonasis.com/api/v1" -- "$cur"))
                    ;;
            esac
            
            # Global flags
            if [[ "$cur" == -* ]]; then
                local global_flags="--help --version --verbose --output --api-url --no-mcp"
                COMPREPLY=($(compgen -W "$global_flags" -- "$cur"))
            fi
            ;;
    esac
}

# Register completions for all command aliases
complete -F _lanonasis_completions lanonasis
complete -F _lanonasis_completions onasis
complete -F _lanonasis_completions memory
complete -F _lanonasis_completions maas