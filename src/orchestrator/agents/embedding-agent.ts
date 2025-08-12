/**
 * Embedding Agent
 * Specialized in converting text to embeddings and semantic similarity operations
 */

import { BaseAgent, AgentConfig, AgentRequest, AgentResponse } from './base-agent.js';

export class EmbeddingAgent extends BaseAgent {
  private openaiApiKey: string;
  private embeddingModel: string;
  private cache: Map<string, number[]> = new Map();

  constructor() {
    const config: AgentConfig = {
      name: 'EmbeddingAgent',
      description: 'Converts text to embeddings and performs semantic similarity operations',
      capabilities: ['embedding', 'similarity', 'semantic', 'vector', 'search'],
      priority: 8,
      timeout: 15000
    };
    
    super(config);
    
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.embeddingModel = 'text-embedding-3-small';
    
    if (!this.openaiApiKey) {
      this.log('warn', 'OpenAI API key not found. Embedding operations will fail.');
    }
  }

  async process(request: AgentRequest): Promise<AgentResponse> {
    const { input, parameters } = request;

    try {
      // Determine operation type
      if (parameters?.operation === 'generate_embedding' || input.includes('embed')) {
        return await this.generateEmbedding(parameters?.text as string || input);
      }
      
      if (parameters?.operation === 'calculate_similarity' || input.includes('similar')) {
        return await this.calculateSimilarity(
          parameters?.text1 as string,
          parameters?.text2 as string,
          parameters?.embedding1 as number[],
          parameters?.embedding2 as number[]
        );
      }
      
      if (parameters?.operation === 'batch_embed') {
        return await this.batchEmbedding(parameters?.texts as string[]);
      }
      
      if (parameters?.operation === 'find_similar') {
        return await this.findSimilar(
          parameters?.query as string,
          parameters?.embeddings as Array<{ id: string; embedding: number[]; metadata?: unknown }>
        );
      }

      // Default: generate embedding for input
      return await this.generateEmbedding(input);

    } catch (error) {
      return {
        success: false,
        error: `Embedding operation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Generate embedding for a single text
   */
  private async generateEmbedding(text: string): Promise<AgentResponse> {
    if (!text?.trim()) {
      return {
        success: false,
        error: 'Text is required for embedding generation'
      };
    }

    // Check cache first
    const cacheKey = this.getCacheKey(text);
    if (this.cache.has(cacheKey)) {
      return {
        success: true,
        data: {
          embedding: this.cache.get(cacheKey),
          text,
          cached: true,
          dimensions: this.cache.get(cacheKey)?.length || 0
        }
      };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: text
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const embedding = data.data[0].embedding;

      // Cache the result
      this.cache.set(cacheKey, embedding);

      return {
        success: true,
        data: {
          embedding,
          text,
          cached: false,
          dimensions: embedding.length,
          model: this.embeddingModel
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Calculate cosine similarity between two texts or embeddings
   */
  private async calculateSimilarity(
    text1?: string, 
    text2?: string, 
    embedding1?: number[], 
    embedding2?: number[]
  ): Promise<AgentResponse> {
    try {
      let vec1 = embedding1;
      let vec2 = embedding2;

      // Generate embeddings if not provided
      if (!vec1 && text1) {
        const result1 = await this.generateEmbedding(text1);
        if (!result1.success) return result1;
        vec1 = (result1.data as { embedding: number[] }).embedding;
      }

      if (!vec2 && text2) {
        const result2 = await this.generateEmbedding(text2);
        if (!result2.success) return result2;
        vec2 = (result2.data as { embedding: number[] }).embedding;
      }

      if (!vec1 || !vec2) {
        return {
          success: false,
          error: 'Two embeddings or texts are required for similarity calculation'
        };
      }

      const similarity = this.cosineSimilarity(vec1, vec2);

      return {
        success: true,
        data: {
          similarity,
          text1,
          text2,
          interpretation: this.interpretSimilarity(similarity)
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Similarity calculation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  private async batchEmbedding(texts: string[]): Promise<AgentResponse> {
    if (!Array.isArray(texts) || texts.length === 0) {
      return {
        success: false,
        error: 'Array of texts is required for batch embedding'
      };
    }

    const results: Array<{ text: string; embedding: number[]; cached: boolean }> = [];
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];

    // Check cache for all texts
    texts.forEach((text, index) => {
      const cacheKey = this.getCacheKey(text);
      if (this.cache.has(cacheKey)) {
        const cachedEmbedding = this.cache.get(cacheKey);
        if (cachedEmbedding) {
          results[index] = {
            text,
            embedding: cachedEmbedding,
            cached: true
          };
        }
      } else {
        uncachedTexts.push(text);
        uncachedIndices.push(index);
      }
    });

    // Generate embeddings for uncached texts
    if (uncachedTexts.length > 0) {
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.embeddingModel,
            input: uncachedTexts
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        
        data.data.forEach((item: { embedding: number[] }, i: number) => {
          const text = uncachedTexts[i];
          const index = uncachedIndices[i];
          const embedding = item.embedding;
          
          // Cache the result - ensure text is defined
          if (text && index !== undefined) {
            this.cache.set(this.getCacheKey(text), embedding);
            
            results[index] = {
              text,
              embedding,
              cached: false
            };
          }
        });

      } catch (error) {
        return {
          success: false,
          error: `Batch embedding failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }

    return {
      success: true,
      data: {
        embeddings: results,
        total_count: results.length,
        cached_count: results.filter(r => r.cached).length,
        model: this.embeddingModel
      }
    };
  }

  /**
   * Find most similar embeddings to a query
   */
  private async findSimilar(
    query: string,
    embeddings: Array<{ id: string; embedding: number[]; metadata?: unknown }>
  ): Promise<AgentResponse> {
    if (!query || !Array.isArray(embeddings)) {
      return {
        success: false,
        error: 'Query text and embeddings array are required'
      };
    }

    try {
      // Generate embedding for query
      const queryResult = await this.generateEmbedding(query);
      if (!queryResult.success) return queryResult;

      const queryEmbedding = (queryResult.data as { embedding: number[] }).embedding;

      // Calculate similarity with all embeddings
      const similarities = embeddings.map(item => ({
        id: item.id,
        similarity: this.cosineSimilarity(queryEmbedding, item.embedding),
        metadata: item.metadata
      }));

      // Sort by similarity (descending)
      similarities.sort((a, b) => b.similarity - a.similarity);

      return {
        success: true,
        data: {
          query,
          results: similarities,
          count: similarities.length,
          best_match: similarities[0] || null
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Similar search failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      const a = vecA[i] ?? 0;
      const b = vecB[i] ?? 0;
      dotProduct += a * b;
      normA += a * a;
      normB += b * b;
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Interpret similarity score
   */
  private interpretSimilarity(score: number): string {
    if (score >= 0.9) return 'Nearly identical';
    if (score >= 0.8) return 'Highly similar';
    if (score >= 0.7) return 'Similar';
    if (score >= 0.6) return 'Moderately similar';
    if (score >= 0.5) return 'Somewhat similar';
    if (score >= 0.3) return 'Slightly similar';
    return 'Not similar';
  }

  /**
   * Generate cache key for text
   */
  private getCacheKey(text: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `${this.embeddingModel}_${hash}`;
  }

  /**
   * Clear embedding cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      model: this.embeddingModel
    };
  }
}