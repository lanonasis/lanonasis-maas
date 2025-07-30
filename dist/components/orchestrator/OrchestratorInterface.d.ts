/**
 * Orchestrator Interface Component
 * Provides a chat-like interface for natural language command execution
 */
import React from 'react';
interface OrchestratorResult {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
    executionTime: number;
    command: ParsedCommand;
}
interface ParsedCommand {
    action: string;
    target: string;
    parameters: Record<string, unknown>;
    confidence?: number;
    tool?: string;
}
interface OrchestratorInterfaceProps {
    className?: string;
    onCommandExecuted?: (result: OrchestratorResult) => void;
    onUIAction?: (action: string, args: Record<string, unknown>) => void;
    placeholder?: string;
    disabled?: boolean;
}
export declare const OrchestratorInterface: React.FC<OrchestratorInterfaceProps>;
export default OrchestratorInterface;
//# sourceMappingURL=OrchestratorInterface.d.ts.map