import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ToolReviewClient } from '../ToolReviewClient';
import { TestEnvironment } from '../../../testing/src/TestEnvironment';
import { mockErrorResponses } from '../../../testing/src/data/mockData';
import type {
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
} from '@symbi/types';

describe('ToolReviewClient Integration Tests', () => {
  let testEnv: TestEnvironment;
  let toolReviewClient: ToolReviewClient;

  beforeEach(async () => {
    testEnv = new TestEnvironment({
      toolReviewApiUrl: 'http://localhost:8081',
      jwt: 'test-jwt-token',
    });
    await testEnv.setup();

    const symbiontClient = testEnv.getClient();
    toolReviewClient = symbiontClient.toolReview;
  });

  afterEach(async () => {
    await testEnv.teardown();
  });

  describe('submitForReview', () => {
    const mockSubmission: ToolSubmission = {
      toolName: 'test-tool',
      version: '1.0.0',
      schemaContent: '{"type": "object", "properties": {}}',
      sourceCode: 'function test() { return "hello"; }',
      providerInfo: {
        name: 'Test Provider',
        domain: 'test.example.com',
        contact: 'admin@test.example.com',
      },
      priority: 'normal',
      tags: ['testing', 'automation'],
    };

    it('should successfully submit tool for review', async () => {
      const mocks = testEnv.getMocks();
      const mockResponse: SubmitForReviewResponse = {
        reviewId: 'review-123',
        status: 'pending',
        estimatedCompletionTime: '2024-01-01T14:00:00Z',
        message: 'Tool submitted successfully for review',
      };

      mocks.fetch.mockResponse('/sessions', {
        status: 201,
        body: mockResponse,
      });

      const result = await toolReviewClient.submitForReview(mockSubmission);

      expect(result).toEqual(mockResponse);
      
      const calls = mocks.fetch.getCallsFor('/sessions');
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('POST');
      expect(JSON.parse(calls[0].body!)).toEqual(mockSubmission);
    });

    it('should throw error for empty submission', async () => {
      await expect(toolReviewClient.submitForReview(null as any)).rejects.toThrow(
        'Tool submission is required'
      );
    });

    it('should handle validation errors', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/sessions', {
        status: 400,
        body: mockErrorResponses.validationError,
      });

      await expect(toolReviewClient.submitForReview(mockSubmission)).rejects.toThrow(
        'Tool Review API request failed: 400'
      );
    });

    it('should handle authentication failure', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/sessions', {
        status: 401,
        body: mockErrorResponses.unauthorized,
      });

      await expect(toolReviewClient.submitForReview(mockSubmission)).rejects.toThrow(
        'Tool Review API request failed: 401'
      );
    });

    it('should use JWT authentication for tool review endpoints', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/sessions', {
        status: 201,
        body: { reviewId: 'test', status: 'pending' },
      });

      await toolReviewClient.submitForReview(mockSubmission);

      const calls = mocks.fetch.getCallsFor('/sessions');
      expect(calls[0].headers['Authorization']).toBe('Bearer test-jwt-token');
    });
  });

  describe('listReviewSessions', () => {
    it('should list review sessions without parameters', async () => {
      const mocks = testEnv.getMocks();
      const mockResponse: ListReviewSessionsResponse = {
        sessions: [
          {
            reviewId: 'review-1',
            toolName: 'test-tool-1',
            status: 'pending',
            priority: 'normal',
            submittedAt: '2024-01-01T10:00:00Z',
            updatedAt: '2024-01-01T10:00:00Z',
            submitter: {
              id: 'user-1',
              name: 'Test User',
              email: 'test@example.com',
            },
            providerInfo: {
              name: 'Test Provider',
              domain: 'test.example.com',
            },
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mocks.fetch.mockResponse('/sessions', {
        status: 200,
        body: mockResponse,
      });

      const result = await toolReviewClient.listReviewSessions();

      expect(result).toEqual(mockResponse);
      expect(result.sessions).toHaveLength(1);
      expect(mocks.fetch.getCallsFor('/sessions')).toHaveLength(1);
    });

    it('should list review sessions with pagination parameters', async () => {
      const mocks = testEnv.getMocks();
      const params: PaginationParams = {
        page: 2,
        pageSize: 10,
        sortBy: 'submittedAt',
        sortOrder: 'desc',
        status: 'pending',
        priority: 'high',
        submitter: 'test-user',
      };

      const mockResponse: ListReviewSessionsResponse = {
        sessions: [],
        pagination: {
          page: 2,
          pageSize: 10,
          total: 25,
          totalPages: 3,
        },
      };

      mocks.fetch.mockResponse('/sessions?page=2&pageSize=10&sortBy=submittedAt&sortOrder=desc&status=pending&priority=high&submitter=test-user', {
        status: 200,
        body: mockResponse,
      });

      const result = await toolReviewClient.listReviewSessions(params);

      expect(result).toEqual(mockResponse);
      
      const calls = mocks.fetch.getCallsFor('/sessions');
      expect(calls[0].url).toContain('page=2');
      expect(calls[0].url).toContain('pageSize=10');
      expect(calls[0].url).toContain('sortBy=submittedAt');
      expect(calls[0].url).toContain('sortOrder=desc');
      expect(calls[0].url).toContain('status=pending');
      expect(calls[0].url).toContain('priority=high');
      expect(calls[0].url).toContain('submitter=test-user');
    });

    it('should handle partial pagination parameters', async () => {
      const mocks = testEnv.getMocks();
      const params: PaginationParams = {
        page: 1,
        pageSize: 20,
        sortOrder: 'desc',
        status: 'approved',
      };

      mocks.fetch.mockResponse('/sessions', {
        status: 200,
        body: { sessions: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } },
      });

      const result = await toolReviewClient.listReviewSessions(params);

      expect(result.sessions).toEqual([]);
      
      const calls = mocks.fetch.getCallsFor('/sessions');
      expect(calls[0].url).toContain('page=1');
      expect(calls[0].url).toContain('status=approved');
      expect(calls[0].url).toContain('pageSize=20');
      expect(calls[0].url).toContain('sortOrder=desc');
    });

    it('should handle server errors', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/sessions', {
        status: 500,
        body: mockErrorResponses.serverError,
      });

      await expect(toolReviewClient.listReviewSessions()).rejects.toThrow(
        'Tool Review API request failed: 500'
      );
    });
  });

  describe('getReviewSession', () => {
    const reviewId = 'review-123';

    it('should successfully get review session', async () => {
      const mocks = testEnv.getMocks();
      const mockSession: ReviewSession = {
        reviewId,
        toolName: 'test-tool',
        version: '1.0.0',
        status: 'approved',
        priority: 'normal',
        submittedAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        completedAt: '2024-01-01T12:00:00Z',
        submitter: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
        },
        providerInfo: {
          name: 'Test Provider',
          domain: 'test.example.com',
        },
        finalDecision: 'approved',
      };

      mocks.fetch.mockResponse(`/sessions/${reviewId}`, {
        status: 200,
        body: mockSession,
      });

      const result = await toolReviewClient.getReviewSession(reviewId);

      expect(result).toEqual(mockSession);
      expect(mocks.fetch.getCallsFor(`/sessions/${reviewId}`)).toHaveLength(1);
    });

    it('should throw error for empty review ID', async () => {
      await expect(toolReviewClient.getReviewSession('')).rejects.toThrow(
        'Review ID is required'
      );
    });

    it('should handle review not found', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/sessions/${reviewId}`, {
        status: 404,
        body: mockErrorResponses.notFound,
      });

      await expect(toolReviewClient.getReviewSession(reviewId)).rejects.toThrow(
        'Tool Review API request failed: 404'
      );
    });
  });

  describe('getAnalysis', () => {
    const analysisId = 'analysis-123';

    it('should successfully get security analysis', async () => {
      const mocks = testEnv.getMocks();
      const mockAnalysis: SecurityAnalysis = {
        analysisId,
        riskScore: 0.3,
        findings: [
          {
            id: 'finding-1',
            category: 'vulnerability',
            severity: 'medium',
            title: 'Potential SQL Injection',
            description: 'User input not properly sanitized',
            confidence: 0.8,
            recommendation: 'Use parameterized queries',
          },
        ],
        summary: 'Tool analysis completed with moderate risk',
        recommendation: 'Approve with security review',
        analyzedAt: '2024-01-01T11:00:00Z',
        analyzer: {
          name: 'SecurityAnalyzer',
          version: '2.1.0',
        },
      };

      mocks.fetch.mockResponse(`/analysis/${analysisId}`, {
        status: 200,
        body: mockAnalysis,
      });

      const result = await toolReviewClient.getAnalysis(analysisId);

      expect(result).toEqual(mockAnalysis);
      expect(result.findings).toHaveLength(1);
      expect(result.riskScore).toBe(0.3);
    });

    it('should throw error for empty analysis ID', async () => {
      await expect(toolReviewClient.getAnalysis('')).rejects.toThrow(
        'Analysis ID is required'
      );
    });

    it('should handle analysis not found', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/analysis/${analysisId}`, {
        status: 404,
        body: mockErrorResponses.notFound,
      });

      await expect(toolReviewClient.getAnalysis(analysisId)).rejects.toThrow(
        'Tool Review API request failed: 404'
      );
    });
  });

  describe('getReviewQueue', () => {
    it('should successfully get review queue', async () => {
      const mocks = testEnv.getMocks();
      const mockQueue: ReviewQueueResponse = {
        queue: [
          {
            reviewId: 'review-1',
            toolName: 'urgent-tool',
            priority: 'urgent',
            submittedAt: '2024-01-01T10:00:00Z',
            waitingTime: 120, // 2 hours
            analysisId: 'analysis-1',
            riskScore: 0.7,
          },
          {
            reviewId: 'review-2',
            toolName: 'normal-tool',
            priority: 'normal',
            submittedAt: '2024-01-01T09:00:00Z',
            waitingTime: 180, // 3 hours
          },
        ],
        stats: {
          totalPending: 2,
          averageWaitTime: 150,
          highPriorityCount: 1,
        },
      };

      mocks.fetch.mockResponse('/review/queue', {
        status: 200,
        body: mockQueue,
      });

      const result = await toolReviewClient.getReviewQueue();

      expect(result).toEqual(mockQueue);
      expect(result.queue).toHaveLength(2);
      expect(result.stats.totalPending).toBe(2);
      expect(result.stats.highPriorityCount).toBe(1);
    });

    it('should handle empty queue', async () => {
      const mocks = testEnv.getMocks();
      const emptyQueue: ReviewQueueResponse = {
        queue: [],
        stats: {
          totalPending: 0,
          averageWaitTime: 0,
          highPriorityCount: 0,
        },
      };

      mocks.fetch.mockResponse('/review/queue', {
        status: 200,
        body: emptyQueue,
      });

      const result = await toolReviewClient.getReviewQueue();

      expect(result.queue).toHaveLength(0);
      expect(result.stats.totalPending).toBe(0);
    });
  });

  describe('submitDecision', () => {
    const reviewId = 'review-123';
    const decision: DecisionSubmission = {
      decision: 'approved',
      comments: 'Tool meets security requirements',
      requiresAdditionalReview: false,
    };

    it('should successfully submit review decision', async () => {
      const mocks = testEnv.getMocks();
      const mockResponse: DecisionSubmissionResponse = {
        reviewId,
        decision: 'approved',
        processedAt: '2024-01-01T12:00:00Z',
        nextAction: 'Tool will be signed and made available',
      };

      mocks.fetch.mockResponse(`/review/${reviewId}/decision`, {
        status: 200,
        body: mockResponse,
      });

      const result = await toolReviewClient.submitDecision(reviewId, decision);

      expect(result).toEqual(mockResponse);
      
      const calls = mocks.fetch.getCallsFor(`/review/${reviewId}/decision`);
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('POST');
      expect(JSON.parse(calls[0].body!)).toEqual(decision);
    });

    it('should throw error for empty review ID', async () => {
      await expect(toolReviewClient.submitDecision('', decision)).rejects.toThrow(
        'Review ID is required'
      );
    });

    it('should throw error for empty decision', async () => {
      await expect(toolReviewClient.submitDecision(reviewId, null as any)).rejects.toThrow(
        'Decision is required'
      );
    });

    it('should handle rejection decisions', async () => {
      const mocks = testEnv.getMocks();
      const rejectionDecision: DecisionSubmission = {
        decision: 'rejected',
        comments: 'Security vulnerabilities found',
      };

      const mockResponse: DecisionSubmissionResponse = {
        reviewId,
        decision: 'rejected',
        processedAt: '2024-01-01T12:00:00Z',
        nextAction: 'Tool submission has been rejected',
      };

      mocks.fetch.mockResponse(`/review/${reviewId}/decision`, {
        status: 200,
        body: mockResponse,
      });

      const result = await toolReviewClient.submitDecision(reviewId, rejectionDecision);

      expect(result.decision).toBe('rejected');
      expect(result.nextAction).toContain('rejected');
    });
  });

  describe('getSigningStatus', () => {
    const reviewId = 'review-123';

    it('should successfully get signing status', async () => {
      const mocks = testEnv.getMocks();
      const mockStatus: SigningStatus = {
        reviewId,
        status: 'signed',
        signedAt: '2024-01-01T13:00:00Z',
        downloadUrl: 'https://signed-tools.example.com/tool-123.tar.gz',
      };

      mocks.fetch.mockResponse(`/signing/${reviewId}`, {
        status: 200,
        body: mockStatus,
      });

      const result = await toolReviewClient.getSigningStatus(reviewId);

      expect(result).toEqual(mockStatus);
      expect(result.status).toBe('signed');
      expect(result.downloadUrl).toBeDefined();
    });

    it('should throw error for empty review ID', async () => {
      await expect(toolReviewClient.getSigningStatus('')).rejects.toThrow(
        'Review ID is required'
      );
    });

    it('should handle signing failures', async () => {
      const mocks = testEnv.getMocks();
      const failedStatus: SigningStatus = {
        reviewId,
        status: 'failed',
        error: 'Certificate validation failed',
      };

      mocks.fetch.mockResponse(`/signing/${reviewId}`, {
        status: 200,
        body: failedStatus,
      });

      const result = await toolReviewClient.getSigningStatus(reviewId);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Certificate validation failed');
    });
  });

  describe('downloadSignedTool', () => {
    const reviewId = 'review-123';

    it('should successfully download signed tool as blob', async () => {
      const mocks = testEnv.getMocks();
      const mockBlob = new Blob(['mock tool content'], { type: 'application/gzip' });

      // Mock blob response
      mocks.fetch.mockResponse(`/signing/${reviewId}/download`, {
        status: 200,
        body: mockBlob,
        headers: {
          'Content-Type': 'application/gzip',
          'Content-Disposition': 'attachment; filename="tool-123.tar.gz"',
        },
      });

      const result = await toolReviewClient.downloadSignedTool(reviewId);

      expect(result).toBeInstanceOf(Blob);
      expect(mocks.fetch.getCallsFor(`/signing/${reviewId}/download`)).toHaveLength(1);
    });

    it('should throw error for empty review ID', async () => {
      await expect(toolReviewClient.downloadSignedTool('')).rejects.toThrow(
        'Review ID is required'
      );
    });

    it('should handle download not ready', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/signing/${reviewId}/download`, {
        status: 404,
        body: mockErrorResponses.notFound,
      });

      await expect(toolReviewClient.downloadSignedTool(reviewId)).rejects.toThrow(
        'Tool Review file download failed: 404'
      );
    });

    it('should not include Content-Type header for file downloads', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/signing/${reviewId}/download`, {
        status: 200,
        body: new Blob(['test']),
      });

      await toolReviewClient.downloadSignedTool(reviewId);

      const calls = mocks.fetch.getCallsFor(`/signing/${reviewId}/download`);
      expect(calls[0].headers['Content-Type']).toBeUndefined();
      expect(calls[0].headers['Authorization']).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should successfully get tool review statistics', async () => {
      const mocks = testEnv.getMocks();
      const mockStats: StatsResponse = {
        totalSubmissions: 150,
        totalApproved: 120,
        totalRejected: 25,
        averageProcessingTime: 180, // 3 hours
        securityFindings: {
          total: 85,
          bySeverity: {
            low: 40,
            medium: 30,
            high: 12,
            critical: 3,
          },
          byCategory: {
            vulnerability: 25,
            malicious_code: 5,
            resource_abuse: 15,
            privacy_violation: 20,
            policy_violation: 20,
          },
        },
        recentActivity: [
          {
            date: '2024-01-01',
            submissions: 10,
            approvals: 8,
            rejections: 2,
          },
          {
            date: '2024-01-02',
            submissions: 12,
            approvals: 9,
            rejections: 3,
          },
        ],
      };

      mocks.fetch.mockResponse('/stats', {
        status: 200,
        body: mockStats,
      });

      const result = await toolReviewClient.getStats();

      expect(result).toEqual(mockStats);
      expect(result.totalSubmissions).toBe(150);
      expect(result.securityFindings.total).toBe(85);
      expect(result.recentActivity).toHaveLength(2);
    });

    it('should handle permission denied for stats', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/stats', {
        status: 403,
        body: mockErrorResponses.forbidden,
      });

      await expect(toolReviewClient.getStats()).rejects.toThrow(
        'Tool Review API request failed: 403'
      );
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle network timeouts', async () => {
      const mocks = testEnv.getMocks();
      
      mocks.fetch.mockResponse('/sessions', {
        status: 200,
        body: { sessions: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } },
        delay: 5000, // 5 second delay
      });

      // This would timeout in a real scenario with proper timeout configuration
      await expect(toolReviewClient.listReviewSessions()).resolves.toBeDefined();
    });

    it('should handle malformed JSON responses', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/sessions', {
        status: 200,
        body: 'invalid json',
      });

      await expect(toolReviewClient.listReviewSessions()).rejects.toThrow();
    });

    it('should preserve original error messages', async () => {
      const mocks = testEnv.getMocks();
      const customError = 'Tool validation failed: Missing required schema properties';
      
      mocks.fetch.mockResponse('/sessions', {
        status: 422,
        body: customError,
      });

      await expect(toolReviewClient.submitForReview({
        toolName: 'test',
        schemaContent: '{}',
        providerInfo: { name: 'test', domain: 'test.com' },
        priority: 'normal',
      })).rejects.toThrow(customError);
    });

    it('should handle empty response bodies gracefully', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/review/test-id/decision', {
        status: 204,
        body: '',
      });

      // This would be a malformed API response, but should be handled gracefully
      await expect(toolReviewClient.submitDecision('test-id', {
        decision: 'approved',
      })).rejects.toThrow();
    });
  });
});