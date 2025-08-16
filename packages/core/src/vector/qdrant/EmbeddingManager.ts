import { VectorConfig } from '../../config/VectorConfig';
import {
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
} from '@symbiont/types';

/**
 * Manages embedding generation and storage
 */
export class EmbeddingManager {
  private providers: Map<string, EmbeddingProvider> = new Map();

  constructor(private config: VectorConfig) {}

  /**
   * Registers an embedding provider
   */
  registerProvider(name: string, provider: EmbeddingProvider): void {
    this.providers.set(name, provider);
  }

  /**
   * Gets a registered embedding provider
   */
  getProvider(name: string): EmbeddingProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Lists all registered providers
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Generates embeddings using OpenAI API
   */
  async generateWithOpenAI(
    text: string,
    options?: {
      model?: string;
      apiKey?: string;
      baseUrl?: string;
    }
  ): Promise<EmbeddingResponse> {
    try {
      const model = options?.model || 'text-embedding-ada-002';
      const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;
      const baseUrl = options?.baseUrl || 'https://api.openai.com/v1';

      if (!apiKey) {
        throw new Error('OpenAI API key is required');
      }

      const response = await fetch(`${baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
          model,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const embedding = data.data[0]?.embedding;

      if (!embedding) {
        throw new Error('No embedding returned from OpenAI API');
      }

      return {
        embedding,
        model,
        usage: data.usage ? {
          prompt_tokens: data.usage.prompt_tokens,
          total_tokens: data.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to generate OpenAI embedding: ${err.message}`);
    }
  }

  /**
   * Generates embeddings using Hugging Face API
   */
  async generateWithHuggingFace(
    text: string,
    options?: {
      model?: string;
      apiKey?: string;
      baseUrl?: string;
    }
  ): Promise<EmbeddingResponse> {
    try {
      const model = options?.model || 'sentence-transformers/all-MiniLM-L6-v2';
      const apiKey = options?.apiKey || process.env.HUGGINGFACE_API_KEY;
      const baseUrl = options?.baseUrl || 'https://api-inference.huggingface.co';

      if (!apiKey) {
        throw new Error('Hugging Face API key is required');
      }

      const response = await fetch(`${baseUrl}/pipeline/feature-extraction/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: text,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Hugging Face API error: ${error.error || response.statusText}`);
      }

      const embedding = await response.json();

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Invalid embedding format from Hugging Face API');
      }

      // Hugging Face returns nested arrays, flatten if needed
      const flatEmbedding = Array.isArray(embedding[0]) ? embedding[0] : embedding;

      return {
        embedding: flatEmbedding,
        model,
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to generate Hugging Face embedding: ${err.message}`);
    }
  }

  /**
   * Generates embeddings using Cohere API
   */
  async generateWithCohere(
    text: string,
    options?: {
      model?: string;
      apiKey?: string;
      baseUrl?: string;
      inputType?: 'search_document' | 'search_query' | 'classification' | 'clustering';
    }
  ): Promise<EmbeddingResponse> {
    try {
      const model = options?.model || 'embed-english-v3.0';
      const apiKey = options?.apiKey || process.env.COHERE_API_KEY;
      const baseUrl = options?.baseUrl || 'https://api.cohere.ai/v1';
      const inputType = options?.inputType || 'search_document';

      if (!apiKey) {
        throw new Error('Cohere API key is required');
      }

      const response = await fetch(`${baseUrl}/embed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: [text],
          model,
          input_type: inputType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Cohere API error: ${error.message || response.statusText}`);
      }

      const data = await response.json();
      const embedding = data.embeddings?.[0];

      if (!embedding) {
        throw new Error('No embedding returned from Cohere API');
      }

      return {
        embedding,
        model,
        usage: data.meta?.billed_units ? {
          prompt_tokens: data.meta.billed_units.input_tokens || 0,
          total_tokens: data.meta.billed_units.input_tokens || 0,
        } : undefined,
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to generate Cohere embedding: ${err.message}`);
    }
  }

  /**
   * Generates embeddings using a custom provider function
   */
  async generateWithCustomProvider(
    providerName: string,
    text: string,
    customFunction: (text: string, provider: EmbeddingProvider) => Promise<number[]>
  ): Promise<EmbeddingResponse> {
    try {
      const provider = this.providers.get(providerName);
      if (!provider) {
        throw new Error(`Provider '${providerName}' not found`);
      }

      const embedding = await customFunction(text, provider);

      return {
        embedding,
        model: provider.model,
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to generate embedding with custom provider '${providerName}': ${err.message}`);
    }
  }

  /**
   * Generates embeddings using the default or specified provider
   */
  async generate(
    request: EmbeddingRequest,
    providerName?: string
  ): Promise<EmbeddingResponse> {
    try {
      // Use specified provider or try to determine from environment
      if (providerName) {
        const provider = this.providers.get(providerName);
        if (!provider) {
          throw new Error(`Provider '${providerName}' not found`);
        }
        return this.generateWithProvider(request.text, provider);
      }

      // Try OpenAI first if API key is available
      if (process.env.OPENAI_API_KEY) {
        return this.generateWithOpenAI(request.text, { model: request.model });
      }

      // Try Cohere if API key is available
      if (process.env.COHERE_API_KEY) {
        return this.generateWithCohere(request.text, { model: request.model });
      }

      // Try Hugging Face if API key is available
      if (process.env.HUGGINGFACE_API_KEY) {
        return this.generateWithHuggingFace(request.text, { model: request.model });
      }

      throw new Error('No embedding provider configured. Please set up an API key or register a custom provider.');
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to generate embedding: ${err.message}`);
    }
  }

  /**
   * Generates embeddings in batch
   */
  async generateBatch(
    texts: string[],
    options?: {
      providerName?: string;
      model?: string;
      batchSize?: number;
    }
  ): Promise<EmbeddingResponse[]> {
    try {
      const batchSize = options?.batchSize || 10;
      const results: EmbeddingResponse[] = [];

      // Process in batches to avoid rate limits
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchPromises = batch.map(text => 
          this.generate({ text, model: options?.model }, options?.providerName)
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Add delay between batches to respect rate limits
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return results;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to generate batch embeddings: ${err.message}`);
    }
  }

  /**
   * Generates embeddings using a specific provider configuration
   */
  private async generateWithProvider(
    text: string,
    provider: EmbeddingProvider
  ): Promise<EmbeddingResponse> {
    switch (provider.provider) {
      case 'openai':
        return this.generateWithOpenAI(text, {
          model: provider.model,
          apiKey: provider.apiKey,
          baseUrl: provider.baseUrl,
        });
      
      case 'huggingface':
        return this.generateWithHuggingFace(text, {
          model: provider.model,
          apiKey: provider.apiKey,
          baseUrl: provider.baseUrl,
        });
      
      case 'cohere':
        return this.generateWithCohere(text, {
          model: provider.model,
          apiKey: provider.apiKey,
          baseUrl: provider.baseUrl,
        });
      
      case 'custom':
        throw new Error('Custom providers must be handled via generateWithCustomProvider method');
      
      default:
        throw new Error(`Unsupported provider: ${provider.provider}`);
    }
  }

  /**
   * Validates an embedding vector
   */
  validateEmbedding(embedding: number[], expectedDimension?: number): boolean {
    if (!Array.isArray(embedding) || embedding.length === 0) {
      return false;
    }

    if (expectedDimension && embedding.length !== expectedDimension) {
      return false;
    }

    return embedding.every(value => typeof value === 'number' && !isNaN(value));
  }

  /**
   * Normalizes an embedding vector to unit length
   */
  normalizeEmbedding(embedding: number[]): number[] {
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) {
      return embedding;
    }
    return embedding.map(val => val / magnitude);
  }

  /**
   * Calculates cosine similarity between two embeddings
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0);
    const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }
}