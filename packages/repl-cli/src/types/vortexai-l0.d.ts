/**
 * Type stubs for vortexai-l0 module
 * Provides minimal type definitions for the vortexai-l0 library
 */

export interface L0Response {
    message: string;
    type: string;
    workflow?: string[];
    agents?: string[];
    related?: string[];
}

export interface L0Orchestrator {
    query(input: string): Promise<L0Response>;
}

export function createPluginManager(): any;
export function configureMemoryPlugin(config: any): any;

declare const l0: {
    L0Orchestrator: typeof L0Orchestrator;
    createPluginManager: typeof createPluginManager;
    configureMemoryPlugin: typeof configureMemoryPlugin;
};

export default l0;
