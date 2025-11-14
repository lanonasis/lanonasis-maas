/**
 * Vector Store Integration
 * Supports multiple vector stores with configurable embedding models
 */
export interface VectorStoreConfig {
    provider: 'local' | 'qdrant' | 'chroma';
    url?: string;
    apiKey?: string;
    collection?: string;
    dimensions?: number;
}
export interface SearchResult {
    id: string;
    score: number;
    metadata: any;
}
export declare class LanonasisVectorStore {
    private config;
    private storeConfig;
    private isInitialized;
    private localEmbeddings;
    constructor();
    initialize(): Promise<void>;
    isConfigured(): boolean;
    addMemory(memoryId: string, content: string, metadata: any): Promise<void>;
    searchMemories(query: string, options?: any): Promise<SearchResult[]>;
    findRelatedMemories(memoryId: string, options?: any): Promise<SearchResult[]>;
    private generateSimpleEmbedding;
    private simpleHash;
    private cosineSimilarity;
}
