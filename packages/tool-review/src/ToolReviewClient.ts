import {
  ToolSubmission,
  SubmitForReviewResponse,
  PaginationParams,
  ListReviewSessionsResponse,
  ReviewSession,
  SecurityAnalysis,
  ReviewQueueResponse,
  DecisionSubmission,
  DecisionSubmissionResponse,
  SigningStatus,
  StatsResponse,
  RequestOptions,
  SymbiontConfig,
} from '@symbiont/types';

/**
 * Simple interface to avoid circular dependency with SymbiontClient
 */
interface ClientDependency {
  getAuthHeaders(endpoint: string): Promise<Record<string, string>>;
  configuration: Readonly<SymbiontConfig>;
}

/**
 * Client for managing tool review workflows via the Tool Review API
 */
export class ToolReviewClient {
  private client: ClientDependency;

  constructor(client: ClientDependency) {
    this.client = client;
  }

  /**
   * Submit a tool for review
   * POST /sessions
   */
  async submitForReview(submission: ToolSubmission): Promise<SubmitForReviewResponse> {
    if (!submission) {
      throw new Error('Tool submission is required');
    }

    return this.makeRequest<SubmitForReviewResponse>('/sessions', {
      method: 'POST',
      body: submission,
    });
  }

  /**
   * List review sessions with pagination and filtering
   * GET /sessions
   */
  async listReviewSessions(params?: PaginationParams): Promise<ListReviewSessionsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      if (params.page) queryParams.set('page', params.page.toString());
      if (params.pageSize) queryParams.set('pageSize', params.pageSize.toString());
      if (params.sortBy) queryParams.set('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
      if (params.status) queryParams.set('status', params.status);
      if (params.priority) queryParams.set('priority', params.priority);
      if (params.submitter) queryParams.set('submitter', params.submitter);
    }

    const endpoint = queryParams.toString() 
      ? `/sessions?${queryParams.toString()}`
      : '/sessions';

    return this.makeRequest<ListReviewSessionsResponse>(endpoint, {
      method: 'GET',
    });
  }

  /**
   * Get a specific review session by ID
   * GET /sessions/{reviewId}
   */
  async getReviewSession(reviewId: string): Promise<ReviewSession> {
    if (!reviewId) {
      throw new Error('Review ID is required');
    }

    return this.makeRequest<ReviewSession>(`/sessions/${reviewId}`, {
      method: 'GET',
    });
  }

  /**
   * Get security analysis by analysis ID
   * GET /analysis/{analysisId}
   */
  async getAnalysis(analysisId: string): Promise<SecurityAnalysis> {
    if (!analysisId) {
      throw new Error('Analysis ID is required');
    }

    return this.makeRequest<SecurityAnalysis>(`/analysis/${analysisId}`, {
      method: 'GET',
    });
  }

  /**
   * Get the current review queue
   * GET /review/queue
   */
  async getReviewQueue(): Promise<ReviewQueueResponse> {
    return this.makeRequest<ReviewQueueResponse>('/review/queue', {
      method: 'GET',
    });
  }

  /**
   * Submit a review decision for a tool
   * POST /review/{reviewId}/decision
   */
  async submitDecision(
    reviewId: string,
    decision: DecisionSubmission
  ): Promise<DecisionSubmissionResponse> {
    if (!reviewId) {
      throw new Error('Review ID is required');
    }
    if (!decision) {
      throw new Error('Decision is required');
    }

    return this.makeRequest<DecisionSubmissionResponse>(`/review/${reviewId}/decision`, {
      method: 'POST',
      body: decision,
    });
  }

  /**
   * Get signing status for a review
   * GET /signing/{reviewId}
   */
  async getSigningStatus(reviewId: string): Promise<SigningStatus> {
    if (!reviewId) {
      throw new Error('Review ID is required');
    }

    return this.makeRequest<SigningStatus>(`/signing/${reviewId}`, {
      method: 'GET',
    });
  }

  /**
   * Download signed tool package
   * GET /signing/{reviewId}/download
   */
  async downloadSignedTool(reviewId: string): Promise<Blob> {
    if (!reviewId) {
      throw new Error('Review ID is required');
    }

    // Special handling for file download
    return this.makeFileRequest(`/signing/${reviewId}/download`);
  }

  /**
   * Get Tool Review API statistics
   * GET /stats
   */
  async getStats(): Promise<StatsResponse> {
    return this.makeRequest<StatsResponse>('/stats', {
      method: 'GET',
    });
  }

  /**
   * Make an HTTP request using the underlying client
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestOptions
  ): Promise<T> {
    try {
      // Get authentication headers from the parent client
      const authHeaders = await this.client.getAuthHeaders(endpoint);
      
      // Build the full URL using toolReviewApiUrl
      const config = this.client.configuration;
      const baseUrl = config.toolReviewApiUrl;
      const fullUrl = `${baseUrl}${endpoint}`;

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options.headers || {}),
      };

      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method: options.method || 'GET',
        headers,
        ...(options.timeout && { signal: AbortSignal.timeout(options.timeout) }),
      };

      // Add body for non-GET requests
      if (options.body && options.method !== 'GET') {
        fetchOptions.body = JSON.stringify(options.body);
      }

      // Make the request
      const response = await fetch(fullUrl, fetchOptions);

      // Handle response
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Tool Review API request failed: ${response.status} ${response.statusText}. ${errorText}`
        );
      }

      // Return empty for DELETE requests
      if (options.method === 'DELETE') {
        return undefined as T;
      }

      // Parse JSON response
      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`ToolReviewClient request failed: ${error.message}`);
      }
      throw new Error('ToolReviewClient request failed: Unknown error');
    }
  }

  /**
   * Make a file download request
   */
  private async makeFileRequest(endpoint: string): Promise<Blob> {
    try {
      // Get authentication headers from the parent client
      const authHeaders = await this.client.getAuthHeaders(endpoint);
      
      // Build the full URL using toolReviewApiUrl
      const config = this.client.configuration;
      const baseUrl = config.toolReviewApiUrl;
      const fullUrl = `${baseUrl}${endpoint}`;

      // Prepare headers (no Content-Type for file downloads)
      const headers: Record<string, string> = {
        ...authHeaders,
      };

      // Make the request
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers,
      });

      // Handle response
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Tool Review file download failed: ${response.status} ${response.statusText}. ${errorText}`
        );
      }

      // Return blob for file downloads
      return await response.blob();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`ToolReviewClient file download failed: ${error.message}`);
      }
      throw new Error('ToolReviewClient file download failed: Unknown error');
    }
  }
}