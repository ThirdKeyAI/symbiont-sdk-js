import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmbeddingManager } from '../EmbeddingManager';
import { VectorConfig } from '../../../config/VectorConfig';

// Define interfaces locally for testing
interface EmbeddingProvider {
  provider: 'openai' | 'huggingface' | 'cohere' | 'custom';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  dimension: number;
}

interface EmbeddingRequest {
  text: string;
  model?: string;
}

interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('EmbeddingManager', () => {
  let config: VectorConfig;
  let embeddingManager: EmbeddingManager;

  beforeEach(() => {
    config = {
      provider: 'qdrant',
      timeout: 60000,
      batchSize: 100,
      maxRetries: 3,
      retryDelayMs: 1000,
      defaultLimit: 10,
      defaultWithPayload: true,
      defaultWithVectors: false,
      parallelism: 1,
      connectionPoolSize: 10,
      collections: {},
    };

    embeddingManager = new EmbeddingManager(config);

    // Clear environment variables
    delete process.env.OPENAI_API_KEY;
    delete process.env.COHERE_API_KEY;
    delete process.env.HUGGINGFACE_API_KEY;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('provider management', () => {
    it('should register and retrieve providers', () => {
      const provider: EmbeddingProvider = {
        provider: 'openai',
        model: 'text-embedding-ada-002',
        apiKey: 'test-key',
        dimension: 1536,
      };

      embeddingManager.registerProvider('test-provider', provider);

      const retrieved = embeddingManager.getProvider('test-provider');
      expect(retrieved).toEqual(provider);
    });

    it('should list all registered providers', () => {
      const provider1: EmbeddingProvider = {
        provider: 'openai',
        model: 'text-embedding-ada-002',
        dimension: 1536,
      };

      const provider2: EmbeddingProvider = {
        provider: 'cohere',
        model: 'embed-english-v3.0',
        dimension: 1024,
      };

      embeddingManager.registerProvider('openai-provider', provider1);
      embeddingManager.registerProvider('cohere-provider', provider2);

      const providers = embeddingManager.listProviders();
      expect(providers).toContain('openai-provider');
      expect(providers).toContain('cohere-provider');
      expect(providers).toHaveLength(2);
    });

    it('should return undefined for non-existent provider', () => {
      const provider = embeddingManager.getProvider('non-existent');
      expect(provider).toBeUndefined();
    });
  });

  describe('generateWithOpenAI', () => {
    it('should generate embedding with OpenAI successfully', async () => {
      const mockResponse = {
        data: [
          {
            embedding: [0.1, 0.2, 0.3, 0.4],
          },
        ],
        usage: {
          prompt_tokens: 10,
          total_tokens: 10,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await embeddingManager.generateWithOpenAI('test text', {
        apiKey: 'test-key',
      });

      expect(result).toEqual({
        embedding: [0.1, 0.2, 0.3, 0.4],
        model: 'text-embedding-ada-002',
        usage: {
          prompt_tokens: 10,
          total_tokens: 10,
        },
      });

      expect(mockFetch).toHaveBeenCalledWith('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: 'test text',
          model: 'text-embedding-ada-002',
        }),
      });
    });

    it('should use custom model and API URL', async () => {
      const mockResponse = {
        data: [{ embedding: [0.1, 0.2] }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await embeddingManager.generateWithOpenAI('test text', {
        model: 'text-embedding-3-small',
        apiKey: 'test-key',
        baseUrl: 'https://custom.openai.com/v1',
      });

      expect(mockFetch).toHaveBeenCalledWith('https://custom.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: 'test text',
          model: 'text-embedding-3-small',
        }),
      });
    });

    it('should use environment variable for API key', async () => {
      process.env.OPENAI_API_KEY = 'env-key';

      const mockResponse = {
        data: [{ embedding: [0.1, 0.2] }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await embeddingManager.generateWithOpenAI('test text');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer env-key',
          }),
        })
      );
    });

    it('should throw error when API key is missing', async () => {
      await expect(
        embeddingManager.generateWithOpenAI('test text')
      ).rejects.toThrow('OpenAI API key is required');
    });

    it('should throw error when API response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({
          error: { message: 'Invalid API key' },
        }),
      });

      await expect(
        embeddingManager.generateWithOpenAI('test text', { apiKey: 'invalid-key' })
      ).rejects.toThrow('OpenAI API error: Invalid API key');
    });

    it('should handle response without usage data', async () => {
      const mockResponse = {
        data: [{ embedding: [0.1, 0.2] }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await embeddingManager.generateWithOpenAI('test text', {
        apiKey: 'test-key',
      });

      expect(result.usage).toBeUndefined();
    });

    it('should throw error when no embedding returned', async () => {
      const mockResponse = {
        data: [],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await expect(
        embeddingManager.generateWithOpenAI('test text', { apiKey: 'test-key' })
      ).rejects.toThrow('No embedding returned from OpenAI API');
    });
  });

  describe('generateWithHuggingFace', () => {
    it('should generate embedding with Hugging Face successfully', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockEmbedding),
      });

      const result = await embeddingManager.generateWithHuggingFace('test text', {
        apiKey: 'hf-key',
      });

      expect(result).toEqual({
        embedding: mockEmbedding,
        model: 'sentence-transformers/all-MiniLM-L6-v2',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer hf-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: 'test text',
          }),
        }
      );
    });

    it('should handle nested array response', async () => {
      const mockEmbedding = [[0.1, 0.2, 0.3]];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockEmbedding),
      });

      const result = await embeddingManager.generateWithHuggingFace('test text', {
        apiKey: 'hf-key',
      });

      expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
    });

    it('should use custom model and base URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([0.1, 0.2]),
      });

      await embeddingManager.generateWithHuggingFace('test text', {
        model: 'custom/model',
        apiKey: 'hf-key',
        baseUrl: 'https://custom.hf.co',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.hf.co/pipeline/feature-extraction/custom/model',
        expect.any(Object)
      );
    });

    it('should throw error when API key is missing', async () => {
      await expect(
        embeddingManager.generateWithHuggingFace('test text')
      ).rejects.toThrow('Hugging Face API key is required');
    });

    it('should throw error for invalid embedding format', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve('invalid'),
      });

      await expect(
        embeddingManager.generateWithHuggingFace('test text', { apiKey: 'hf-key' })
      ).rejects.toThrow('Invalid embedding format from Hugging Face API');
    });
  });

  describe('generateWithCohere', () => {
    it('should generate embedding with Cohere successfully', async () => {
      const mockResponse = {
        embeddings: [[0.1, 0.2, 0.3]],
        meta: {
          billed_units: {
            input_tokens: 5,
          },
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await embeddingManager.generateWithCohere('test text', {
        apiKey: 'cohere-key',
      });

      expect(result).toEqual({
        embedding: [0.1, 0.2, 0.3],
        model: 'embed-english-v3.0',
        usage: {
          prompt_tokens: 5,
          total_tokens: 5,
        },
      });

      expect(mockFetch).toHaveBeenCalledWith('https://api.cohere.ai/v1/embed', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer cohere-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: ['test text'],
          model: 'embed-english-v3.0',
          input_type: 'search_document',
        }),
      });
    });

    it('should use custom input type', async () => {
      const mockResponse = {
        embeddings: [[0.1, 0.2]],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await embeddingManager.generateWithCohere('test text', {
        apiKey: 'cohere-key',
        inputType: 'search_query',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            texts: ['test text'],
            model: 'embed-english-v3.0',
            input_type: 'search_query',
          }),
        })
      );
    });

    it('should throw error when API key is missing', async () => {
      await expect(
        embeddingManager.generateWithCohere('test text')
      ).rejects.toThrow('Cohere API key is required');
    });

    it('should throw error when no embedding returned', async () => {
      const mockResponse = {
        embeddings: [],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await expect(
        embeddingManager.generateWithCohere('test text', { apiKey: 'cohere-key' })
      ).rejects.toThrow('No embedding returned from Cohere API');
    });
  });

  describe('generateWithCustomProvider', () => {
    it('should generate embedding with custom provider', async () => {
      const provider: EmbeddingProvider = {
        provider: 'custom',
        model: 'custom-model',
        dimension: 128,
      };

      embeddingManager.registerProvider('custom-provider', provider);

      const customFunction = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);

      const result = await embeddingManager.generateWithCustomProvider(
        'custom-provider',
        'test text',
        customFunction
      );

      expect(result).toEqual({
        embedding: [0.1, 0.2, 0.3],
        model: 'custom-model',
      });

      expect(customFunction).toHaveBeenCalledWith('test text', provider);
    });

    it('should throw error for non-existent provider', async () => {
      const customFunction = vi.fn();

      await expect(
        embeddingManager.generateWithCustomProvider(
          'non-existent',
          'test text',
          customFunction
        )
      ).rejects.toThrow('Provider \'non-existent\' not found');
    });
  });

  describe('generate', () => {
    it('should use OpenAI when API key is available', async () => {
      process.env.OPENAI_API_KEY = 'openai-key';

      const mockResponse = {
        data: [{ embedding: [0.1, 0.2] }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const request: EmbeddingRequest = {
        text: 'test text',
        model: 'custom-model',
      };

      const result = await embeddingManager.generate(request);

      expect(result.embedding).toEqual([0.1, 0.2]);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('openai'),
        expect.objectContaining({
          body: JSON.stringify({
            input: 'test text',
            model: 'custom-model',
          }),
        })
      );
    });

    it('should use Cohere when OpenAI unavailable but Cohere available', async () => {
      process.env.COHERE_API_KEY = 'cohere-key';

      const mockResponse = {
        embeddings: [[0.3, 0.4]],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const request: EmbeddingRequest = {
        text: 'test text',
      };

      const result = await embeddingManager.generate(request);

      expect(result.embedding).toEqual([0.3, 0.4]);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('cohere'),
        expect.any(Object)
      );
    });

    it('should use Hugging Face when others unavailable', async () => {
      process.env.HUGGINGFACE_API_KEY = 'hf-key';

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([0.5, 0.6]),
      });

      const request: EmbeddingRequest = {
        text: 'test text',
      };

      const result = await embeddingManager.generate(request);

      expect(result.embedding).toEqual([0.5, 0.6]);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('huggingface'),
        expect.any(Object)
      );
    });

    it('should use specified provider when available', async () => {
      const provider: EmbeddingProvider = {
        provider: 'openai',
        model: 'custom-openai-model',
        apiKey: 'custom-key',
        dimension: 1536,
      };

      embeddingManager.registerProvider('custom-openai', provider);

      const mockResponse = {
        data: [{ embedding: [0.7, 0.8] }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const request: EmbeddingRequest = {
        text: 'test text',
      };

      const result = await embeddingManager.generate(request, 'custom-openai');

      expect(result.embedding).toEqual([0.7, 0.8]);
    });

    it('should throw error when no providers configured', async () => {
      const request: EmbeddingRequest = {
        text: 'test text',
      };

      await expect(embeddingManager.generate(request)).rejects.toThrow(
        'No embedding provider configured. Please set up an API key or register a custom provider.'
      );
    });

    it('should throw error for non-existent specified provider', async () => {
      const request: EmbeddingRequest = {
        text: 'test text',
      };

      await expect(
        embeddingManager.generate(request, 'non-existent')
      ).rejects.toThrow('Provider \'non-existent\' not found');
    });
  });

  describe('generateBatch', () => {
    it('should generate embeddings in batch', async () => {
      process.env.OPENAI_API_KEY = 'openai-key';

      const mockResponse = {
        data: [{ embedding: [0.1, 0.2] }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const texts = ['text 1', 'text 2', 'text 3'];

      const result = await embeddingManager.generateBatch(texts);

      expect(result).toHaveLength(3);
      expect(result[0].embedding).toEqual([0.1, 0.2]);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should process in smaller batches', async () => {
      process.env.OPENAI_API_KEY = 'openai-key';

      const mockResponse = {
        data: [{ embedding: [0.1, 0.2] }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const texts = ['text 1', 'text 2', 'text 3', 'text 4', 'text 5'];

      const result = await embeddingManager.generateBatch(texts, {
        batchSize: 2,
      });

      expect(result).toHaveLength(5);
      // Should process 3 batches: [1,2], [3,4], [5]
      expect(mockFetch).toHaveBeenCalledTimes(5);
    });

    it('should add delay between batches', async () => {
      process.env.OPENAI_API_KEY = 'openai-key';

      const mockResponse = {
        data: [{ embedding: [0.1, 0.2] }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation((fn) => {
        fn();
        return {} as any;
      });

      const texts = ['text 1', 'text 2', 'text 3'];

      await embeddingManager.generateBatch(texts, {
        batchSize: 1,
      });

      // Should have 2 delays (between 3 batches)
      expect(setTimeoutSpy).toHaveBeenCalledTimes(2);

      setTimeoutSpy.mockRestore();
    });
  });

  describe('utility functions', () => {
    describe('validateEmbedding', () => {
      it('should validate correct embedding', () => {
        const embedding = [0.1, 0.2, 0.3, 0.4];
        const result = embeddingManager.validateEmbedding(embedding);
        expect(result).toBe(true);
      });

      it('should validate embedding with expected dimension', () => {
        const embedding = [0.1, 0.2, 0.3];
        const result = embeddingManager.validateEmbedding(embedding, 3);
        expect(result).toBe(true);
      });

      it('should invalidate embedding with wrong dimension', () => {
        const embedding = [0.1, 0.2];
        const result = embeddingManager.validateEmbedding(embedding, 3);
        expect(result).toBe(false);
      });

      it('should invalidate empty array', () => {
        const result = embeddingManager.validateEmbedding([]);
        expect(result).toBe(false);
      });

      it('should invalidate non-array', () => {
        const result = embeddingManager.validateEmbedding('not an array' as any);
        expect(result).toBe(false);
      });

      it('should invalidate array with non-numbers', () => {
        const result = embeddingManager.validateEmbedding([0.1, 'not a number', 0.3] as any);
        expect(result).toBe(false);
      });

      it('should invalidate array with NaN', () => {
        const result = embeddingManager.validateEmbedding([0.1, NaN, 0.3]);
        expect(result).toBe(false);
      });
    });

    describe('normalizeEmbedding', () => {
      it('should normalize embedding to unit length', () => {
        const embedding = [3, 4]; // magnitude = 5
        const normalized = embeddingManager.normalizeEmbedding(embedding);
        expect(normalized).toEqual([0.6, 0.8]);
      });

      it('should handle zero vector', () => {
        const embedding = [0, 0, 0];
        const normalized = embeddingManager.normalizeEmbedding(embedding);
        expect(normalized).toEqual([0, 0, 0]);
      });

      it('should normalize already unit vector', () => {
        const embedding = [1, 0];
        const normalized = embeddingManager.normalizeEmbedding(embedding);
        expect(normalized).toEqual([1, 0]);
      });
    });

    describe('cosineSimilarity', () => {
      it('should calculate cosine similarity correctly', () => {
        const embedding1 = [1, 0, 0];
        const embedding2 = [0, 1, 0];
        const similarity = embeddingManager.cosineSimilarity(embedding1, embedding2);
        expect(similarity).toBe(0);
      });

      it('should calculate similarity for identical vectors', () => {
        const embedding1 = [1, 2, 3];
        const embedding2 = [1, 2, 3];
        const similarity = embeddingManager.cosineSimilarity(embedding1, embedding2);
        expect(similarity).toBeCloseTo(1, 5);
      });

      it('should calculate similarity for opposite vectors', () => {
        const embedding1 = [1, 2, 3];
        const embedding2 = [-1, -2, -3];
        const similarity = embeddingManager.cosineSimilarity(embedding1, embedding2);
        expect(similarity).toBeCloseTo(-1, 5);
      });

      it('should throw error for different dimensions', () => {
        const embedding1 = [1, 2];
        const embedding2 = [1, 2, 3];
        expect(() => {
          embeddingManager.cosineSimilarity(embedding1, embedding2);
        }).toThrow('Embeddings must have the same dimension');
      });

      it('should handle zero vectors', () => {
        const embedding1 = [0, 0, 0];
        const embedding2 = [1, 2, 3];
        const similarity = embeddingManager.cosineSimilarity(embedding1, embedding2);
        expect(similarity).toBe(0);
      });
    });
  });
});