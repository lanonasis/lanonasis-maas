/**
 * Commands that own REST contracts must not depend on the MCP tool surface.
 * This keeps management operations available even when the MCP route has no
 * equivalent endpoint.
 */
export function isDirectApiFlow(commandName?: string, parentName?: string): boolean {
  return commandName === 'memory' ||
    parentName === 'memory' ||
    commandName === 'topic' ||
    parentName === 'topic' ||
    commandName === 'org' ||
    parentName === 'org' ||
    commandName === 'api-keys' ||
    parentName === 'api-keys';
}
