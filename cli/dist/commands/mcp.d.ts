import { Command } from 'commander';
/**
 * Register MCP-related CLI commands (mcp and mcp-server) on a Commander program.
 *
 * Adds commands and subcommands for MCP server initialization, connection management,
 * status reporting, tool listing and invocation, memory create/search operations,
 * preference configuration, and diagnostic routines, wiring each command to its
 * corresponding action handlers.
 *
 * @param program - Commander program instance to extend with MCP commands
 */
export declare function mcpCommands(program: Command): void;
