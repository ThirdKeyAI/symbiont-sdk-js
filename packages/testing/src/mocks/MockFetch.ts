/**
 * Mock fetch implementation for testing HTTP requests
 */

// Type definitions for fetch API
type RequestInfo = string | URL | Request;
type HeadersInit = Headers | string[][] | Record<string, string>;

export class MockFetch {
  private responses = new Map<string, MockResponse>();
  private defaultResponse: MockResponse | null = null;
  private callLog: MockFetchCall[] = [];

  /**
   * Set a mock response for a specific URL pattern
   */
  mockResponse(urlPattern: string | RegExp, response: Partial<MockResponse>): void {
    const key = urlPattern instanceof RegExp ? urlPattern.source : urlPattern;
    this.responses.set(key, {
      status: 200,
      statusText: 'OK',
      headers: {},
      body: '',
      delay: 0,
      ...response
    });
  }

  /**
   * Set a default response for any unmatched requests
   */
  mockDefaultResponse(response: Partial<MockResponse>): void {
    this.defaultResponse = {
      status: 200,
      statusText: 'OK',
      headers: {},
      body: '',
      delay: 0,
      ...response
    };
  }

  /**
   * Clear all mocked responses
   */
  clearMocks(): void {
    this.responses.clear();
    this.defaultResponse = null;
    this.callLog = [];
  }

  /**
   * Get the mock fetch function
   */
  getFetch(): typeof fetch {
    return this.mockFetch.bind(this);
  }

  /**
   * Get call log for verification
   */
  getCallLog(): readonly MockFetchCall[] {
    return [...this.callLog];
  }

  /**
   * Get calls matching a URL pattern
   */
  getCallsFor(urlPattern: string | RegExp): MockFetchCall[] {
    return this.callLog.filter(call => {
      if (urlPattern instanceof RegExp) {
        return urlPattern.test(call.url);
      }
      return call.url.includes(urlPattern);
    });
  }

  /**
   * Mock fetch implementation
   */
  private async mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';
    const headers = init?.headers || {};
    const body = init?.body;

    // Log the call
    this.callLog.push({
      url,
      method,
      headers: this.normalizeHeaders(headers),
      body: body ? body.toString() : undefined,
      timestamp: new Date()
    });

    // Find matching response
    const mockResponse = this.findMatchingResponse(url);
    
    if (!mockResponse) {
      throw new Error(`No mock response configured for URL: ${url}`);
    }

    // Simulate network delay if specified
    if (mockResponse.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, mockResponse.delay));
    }

    // Create mock Response object
    // Note: 204 No Content responses cannot have a body
    const responseBody = mockResponse.status === 204 ? null :
      (typeof mockResponse.body === 'string' ? mockResponse.body : JSON.stringify(mockResponse.body));
    
    return new Response(responseBody, {
      status: mockResponse.status,
      statusText: mockResponse.statusText,
      headers: mockResponse.headers
    });
  }

  /**
   * Find a matching mock response for the given URL
   */
  private findMatchingResponse(url: string): MockResponse | null {
    // Extract path from URL (remove query parameters for matching)
    const urlPath = url.split('?')[0];
    
    // Try exact path matches first
    for (const [pattern, response] of this.responses) {
      if (urlPath.includes(pattern) || url.includes(pattern)) {
        return response;
      }
    }

    // Try regex patterns
    for (const [pattern, response] of this.responses) {
      try {
        const regex = new RegExp(pattern);
        if (regex.test(url) || regex.test(urlPath)) {
          return response;
        }
      } catch {
        // Not a valid regex, skip
      }
    }

    return this.defaultResponse;
  }

  /**
   * Normalize headers to a simple object
   */
  private normalizeHeaders(headers: HeadersInit): Record<string, string> {
    if (headers instanceof Headers) {
      const result: Record<string, string> = {};
      headers.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }

    if (Array.isArray(headers)) {
      const result: Record<string, string> = {};
      headers.forEach(([key, value]) => {
        result[key] = value;
      });
      return result;
    }

    return headers as Record<string, string>;
  }
}

export interface MockResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string | object;
  delay: number;
}

export interface MockFetchCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: Date;
}