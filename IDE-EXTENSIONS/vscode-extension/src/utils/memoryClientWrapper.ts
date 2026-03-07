import type {
  EnhancedMemoryClient,
  EnhancedMemoryClientConfig,
  OperationResult,
  CLICapabilities
} from '@lanonasis/memory-client/node';

type NodeMemoryModule = typeof import('@lanonasis/memory-client/node');
let nodeModulePromise: Promise<NodeMemoryModule> | null = null;

async function importNodeModule(): Promise<NodeMemoryModule> {
  if (!nodeModulePromise) {
    nodeModulePromise = import('@lanonasis/memory-client/node');
  }
  return nodeModulePromise;
}

export async function createNodeMemoryClient(config: EnhancedMemoryClientConfig): Promise<EnhancedMemoryClient> {
  const module = await importNodeModule();
  return module.createNodeMemoryClient(config);
}

export type { EnhancedMemoryClient, EnhancedMemoryClientConfig, OperationResult, CLICapabilities };
