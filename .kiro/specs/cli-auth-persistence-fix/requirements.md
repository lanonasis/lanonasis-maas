# Requirements Document

## Introduction

The Lanonasis CLI currently suffers from authentication persistence issues and cross-device connectivity problems that prevent users from maintaining authenticated sessions and connecting from multiple devices. This feature addresses critical authentication flow problems, credential storage issues, and MCP connection reliability across different environments.

## Glossary

- **CLI**: Command Line Interface for Lanonasis Memory as a Service
- **MCP**: Model Context Protocol for tool and resource communication
- **Vendor Key**: Authentication credential in format pk_xxx.sk_xxx for API access
- **JWT Token**: JSON Web Token for session-based authentication
- **Config Store**: Local configuration storage in ~/.maas/config.json
- **Service Discovery**: Automatic endpoint discovery via /.well-known/onasis.json
- **Cross-Device Auth**: Authentication that works consistently across multiple devices
- **MCP Server Mode**: CLI operating as MCP server for IDE and platform integrations
- **Transport Protocol**: Communication method (WebSocket, HTTP, SSE) for MCP connections
- **IDE Integration**: Connection from development environments to CLI MCP server

## Requirements

### Requirement 1

**User Story:** As a CLI user, I want my authentication to persist across CLI sessions, so that I don't have to re-authenticate every time I use the tool.

#### Acceptance Criteria

1. WHEN a user successfully authenticates with vendor key, THE CLI SHALL store the vendor key securely in the config store
2. WHEN a user successfully authenticates with JWT token, THE CLI SHALL store the token with expiration validation in the config store
3. WHEN a user starts a new CLI session, THE CLI SHALL automatically validate stored credentials before requiring re-authentication
4. WHEN stored credentials are expired or invalid, THE CLI SHALL prompt for re-authentication with clear error messages
5. THE CLI SHALL maintain separate authentication methods (vendor key, JWT, OAuth) with proper fallback logic

### Requirement 2

**User Story:** As a CLI user, I want to use the same credentials on multiple devices, so that I can access my memory services from any machine.

#### Acceptance Criteria

1. WHEN a user provides valid vendor key credentials on any device, THE CLI SHALL successfully authenticate against the service
2. WHEN service discovery fails on any device, THE CLI SHALL use fallback endpoints to maintain connectivity
3. WHEN MCP connection fails on any device, THE CLI SHALL provide clear diagnostic information about connection issues
4. THE CLI SHALL validate vendor key format before attempting authentication to prevent invalid requests
5. THE CLI SHALL provide consistent error messages across all devices for authentication failures

### Requirement 3

**User Story:** As a CLI user, I want clear feedback when authentication fails, so that I can understand and resolve connection issues.

#### Acceptance Criteria

1. WHEN authentication fails due to invalid credentials, THE CLI SHALL display specific error messages indicating credential validation failure
2. WHEN authentication fails due to network issues, THE CLI SHALL display network connectivity error messages with troubleshooting steps
3. WHEN MCP connection fails, THE CLI SHALL display MCP-specific error messages with connection details
4. WHEN service discovery fails, THE CLI SHALL display fallback endpoint information and retry options
5. THE CLI SHALL provide verbose diagnostic mode for detailed troubleshooting information

### Requirement 4

**User Story:** As a CLI user, I want reliable MCP connections that work consistently, so that I can access MCP tools and resources without connection failures.

#### Acceptance Criteria

1. WHEN MCP client initializes, THE CLI SHALL validate authentication credentials before attempting MCP connection
2. WHEN MCP connection fails, THE CLI SHALL attempt automatic retry with exponential backoff
3. WHEN multiple MCP servers are configured, THE CLI SHALL implement failover logic to backup servers
4. WHEN MCP authentication fails, THE CLI SHALL provide clear error messages distinguishing between auth and connection issues
5. THE CLI SHALL maintain connection health monitoring with automatic reconnection for dropped connections

### Requirement 5

**User Story:** As an IDE user, I want to connect to the CLI MCP server using my preferred transport protocol, so that I can access Lanonasis services from my development environment.

#### Acceptance Criteria

1. WHEN CLI runs in MCP server mode, THE CLI SHALL support WebSocket, HTTP, and SSE transport protocols
2. WHEN IDE connects to CLI MCP server, THE CLI SHALL authenticate the connection using stored credentials
3. WHEN multiple IDEs connect simultaneously, THE CLI SHALL handle concurrent MCP connections without conflicts
4. WHEN transport protocol fails, THE CLI SHALL provide fallback options and clear error messages
5. THE CLI SHALL expose all memory and topic management tools through the MCP server interface

### Requirement 6

**User Story:** As a CLI user, I want consistent configuration management across devices and platforms, so that my settings work reliably everywhere.

#### Acceptance Criteria

1. WHEN configuration is saved, THE CLI SHALL ensure atomic writes to prevent corruption during concurrent access
2. WHEN configuration is loaded, THE CLI SHALL validate configuration format and provide migration for outdated formats
3. WHEN service discovery updates endpoints, THE CLI SHALL merge discovered endpoints with existing configuration
4. WHEN authentication method changes, THE CLI SHALL clear incompatible stored credentials
5. THE CLI SHALL provide configuration backup and restore functionality for cross-device setup