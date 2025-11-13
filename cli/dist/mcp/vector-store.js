/**
 * Vector Store Integration
 * Supports multiple vector stores with configurable embedding models
 */
import { CLIConfig } from '../utils/config.js';
import { logger } from './logger.js';
export class LanonasisVectorStore {
    config;
    storeConfig;
    isInitialized = false;
    localEmbeddings = new Map();
    constructor() {
        this.config = new CLIConfig();
        this.storeConfig = {
            provider: 'local',
            collection: 'lanonasis_memories',
            dimensions: 384
        };
    }
    async initialize() {
        this.isInitialized = true;
        logger.info('Vector store initialized', { provider: this.storeConfig.provider });
    }
    isConfigured() {
        return this.isInitialized;
    }
    async addMemory(memoryId, content, metadata) {
        const embedding = this.generateSimpleEmbedding(content);
        this.localEmbeddings.set(memoryId, { embedding, metadata, content });
        logger.debug('Memory added to vector store', { memoryId });
    }
    async searchMemories(query, options = {}) {
        const queryEmbedding = this.generateSimpleEmbedding(query);
        const results = [];
        // Only consider memories the caller is allowed to see
        const allowedIds = options.memoryIds
            ? new Set(options.memoryIds)
            : undefined;
        for (const [id, data] of this.localEmbeddings) {
            if (allowedIds && !allowedIds.has(id))
                continue;
            const similarity = this.cosineSimilarity(queryEmbedding, data.embedding);
            if (similarity >= (options.threshold || 0.7)) {
                results.push({ id, score: similarity, metadata: data.metadata });
            }
        }
        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, options.limit || 10);
    }
    async findRelatedMemories(memoryId, options = {}) {
        const memory = this.localEmbeddings.get(memoryId);
        if (!memory)
            return [];
        const results = [];
        for (const [id, data] of this.localEmbeddings) {
            if (id === memoryId)
                continue;
            const similarity = this.cosineSimilarity(memory.embedding, data.embedding);
            if (similarity >= (options.threshold || 0.6)) {
                results.push({ id, score: similarity, metadata: data.metadata });
            }
        }
        return results.sort((a, b) => b.score - a.score).slice(0, options.limit || 5);
    }
    generateSimpleEmbedding(text) {
        const words = text.toLowerCase().split(/\s+/);
        const embedding = new Array(this.storeConfig.dimensions ?? 384).fill(0);
        words.forEach((word, index) => {
            const hash = this.simpleHash(word);
            const position = Math.abs(hash) % embedding.length;
            embedding[position] += 1 / (index + 1);
        });
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
    }
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }
    cosineSimilarity(a, b) {
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
    }
}
