import type {
  EnhancedMemoryClient,
  EnhancedMemoryClientConfig,
  OperationResult,
  CLICapabilities
} from '@lanonasis/memory-client/node';

let nodeModule: any = null;

async function importNodeModule(): Promise<{
  EnhancedMemoryClient: typeof EnhancedMemoryClient,
  createNodeMemoryClient: (config: EnhancedMemoryClientConfig) => Promise<EnhancedMemoryClient>
}> {
  if (!nodeModule) {
    nodeModule = await import('@lanonasis/memory-client/node');
  }
  return nodeModule;
}

export async function createNodeMemoryClient(config: EnhancedMemoryClientConfig): Promise<EnhancedMemoryClient> {
  const module = await importNodeModule();
  return module.createNodeMemoryClient(config);
}

export type { EnhancedMemoryClient, EnhancedMemoryClientConfig, OperationResult, CLICapabilities };