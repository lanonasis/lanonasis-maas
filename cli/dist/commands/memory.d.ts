import { Command } from 'commander';
import { MemoryIntelligenceClient } from '@lanonasis/mem-intel-sdk';
interface IntelligenceTransport {
    mode: 'sdk' | 'api';
    client?: MemoryIntelligenceClient;
}
type TransportResolver = (noMcp: boolean) => Promise<IntelligenceTransport>;
/**
 * Card 2 (2026-07-18): replaced by the testability seam above so that
 * `.cli.test.ts` can substitute a stub without touching this file.
 */
export declare const __setIntelligenceTransportResolver: (next: TransportResolver) => void;
export declare function memoryCommands(program: Command): void;
export {};
