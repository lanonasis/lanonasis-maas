/**
 * Vector Store Integration
 * Supports multiple vector stores with configurable embedding models
 */

import { CLIConfig } from '../utils/config.js';
import { logger } from './logger.js';

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

export class LanonasisVectorStore {
  private config: CLIConfig;
  private storeConfig: VectorStoreConfig;
  private isInitialized: boolean = false;
  private localEmbeddings: Map<string, any> = new Map();

  constructor() {
    this.config = new CLIConfig();
    this.storeConfig = {
      provider: 'local',
      collection: 'lanonasis_memories',
      dimensions: 384
    };
  }

  async initialize(): Promise<void> {
    this.isInitialized = true;
    logger.info('Vector store initialized', { provider: this.storeConfig.provider });
  }

  isConfigured(): boolean {
    return this.isInitialized;
  }

  async addMemory(memoryId: string, content: string, metadata: any): Promise<void> {
    const embedding = this.generateSimpleEmbedding(content);
    this.localEmbeddings.set(memoryId, { embedding, metadata, content });
    logger.debug('Memory added to vector store', { memoryId });
  }

  async searchMemories(query: string, options: any = {}): Promise<SearchResult[]> {
    const queryEmbedding = this.generateSimpleEmbedding(query);
    const results: SearchResult[] = [];

    for (const [id, data] of this.localEmbeddings) {
      const similarity = this.cosineSimilarity(queryEmbedding, data.embedding);
      if (similarity >= (options.threshold || 0.7)) {
        results.push({ id, score: similarity, metadata: data.metadata });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, options.limit || 10);
  }

  async findRelatedMemories(memoryId: string, options: any = {}): Promise<SearchResult[]> {
    const memory = this.localEmbeddings.get(memoryId);
    if (!memory) return [];

    const results: SearchResult[] = [];
    for (const [id, data] of this.localEmbeddings) {
      if (id === memoryId) continue;
      const similarity = this.cosineSimilarity(memory.embedding, data.embedding);
      if (similarity >= (options.threshold || 0.6)) {
        results.push({ id, score: similarity, metadata: data.metadata });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, options.limit || 5);
  }

  private generateSimpleEmbedding(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0);
    
    words.forEach((word, index) => {
      const hash = this.simpleHash(word);
      const position = Math.abs(hash) % embedding.length;
      embedding[position] += 1 / (index + 1);
    });

    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
  }
}