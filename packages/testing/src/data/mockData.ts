import { HealthStatus } from '@symbiont/types';

/**
 * Mock data for API responses and testing
 */

export const mockHealthStatus: HealthStatus = {
  status: 'healthy',
  timestamp: '2024-01-01T00:00:00.000Z',
  version: '1.0.0',
  uptime: 86400000 // 24 hours in milliseconds
};

export const mockUnhealthyStatus: HealthStatus = {
  status: 'unhealthy',
  timestamp: '2024-01-01T00:00:00.000Z'
};

export const mockAgents = [
  {
    id: 'agent-1',
    name: 'Test Agent 1',
    description: 'A test agent for development',
    status: 'active',
    capabilities: ['chat', 'search', 'analysis'],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T12:00:00.000Z'
  },
  {
    id: 'agent-2',
    name: 'Test Agent 2',
    description: 'Another test agent',
    status: 'inactive',
    capabilities: ['chat', 'code-generation'],
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T12:00:00.000Z'
  }
];

export const mockSessions = [
  {
    id: 'session-1',
    agentId: 'agent-1',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    lastActivity: '2024-01-01T12:00:00.000Z',
    messageCount: 5
  },
  {
    id: 'session-2',
    agentId: 'agent-2',
    status: 'completed',
    createdAt: '2024-01-02T00:00:00.000Z',
    lastActivity: '2024-01-02T12:00:00.000Z',
    messageCount: 12
  }
];

export const mockToolReviews = [
  {
    id: 'review-1',
    toolName: 'file_read',
    status: 'approved',
    submittedAt: '2024-01-01T00:00:00.000Z',
    reviewedAt: '2024-01-01T00:30:00.000Z',
    reviewer: 'admin',
    comments: 'Approved for safe file reading operations'
  },
  {
    id: 'review-2',
    toolName: 'network_request',
    status: 'pending',
    submittedAt: '2024-01-01T01:00:00.000Z',
    comments: 'Requires additional review for external network access'
  }
];

export const mockSecrets = {
  environment: {
    'SYMBIONT_API_KEY': 'env-api-key-12345',
    'SYMBIONT_JWT_TOKEN': 'env-jwt-token-67890',
    'DATABASE_URL': 'postgresql://localhost:5432/symbiont',
    'REDIS_URL': 'redis://localhost:6379'
  },
  file: {
    'SYMBIONT_API_KEY': 'file-api-key-abcde',
    'SYMBIONT_JWT_TOKEN': 'file-jwt-token-fghij',
    'SECRET_KEY': 'super-secret-key-for-encryption'
  },
  vault: {
    'SYMBIONT_API_KEY': 'vault-api-key-xyz123',
    'SYMBIONT_JWT_TOKEN': 'vault-jwt-token-456789',
    'ENCRYPTION_KEY': 'vault-encryption-key-advanced'
  }
};

export const mockApiResponses = {
  healthCheck: {
    success: mockHealthStatus,
    failure: mockUnhealthyStatus
  },
  
  agents: {
    list: {
      data: mockAgents,
      total: mockAgents.length,
      page: 1,
      limit: 10
    },
    single: mockAgents[0],
    created: {
      ...mockAgents[0],
      id: 'new-agent-id',
      createdAt: new Date().toISOString()
    }
  },

  sessions: {
    list: {
      data: mockSessions,
      total: mockSessions.length,
      page: 1,
      limit: 10
    },
    single: mockSessions[0],
    created: {
      ...mockSessions[0],
      id: 'new-session-id',
      createdAt: new Date().toISOString()
    }
  },

  toolReviews: {
    list: {
      data: mockToolReviews,
      total: mockToolReviews.length,
      page: 1,
      limit: 10
    },
    single: mockToolReviews[0],
    submitted: {
      id: 'new-review-id',
      toolName: 'test_tool',
      status: 'pending',
      submittedAt: new Date().toISOString()
    }
  },

  auth: {
    tokenRefresh: {
      token: 'new-access-token-12345',
      refreshToken: 'new-refresh-token-67890',
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    },
    
    jwtRefresh: {
      jwt: 'new-jwt-token-abcdef',
      expiresAt: new Date(Date.now() + 7200000).toISOString()
    }
  }
};

export const mockErrorResponses = {
  notFound: {
    error: 'Not Found',
    message: 'The requested resource was not found',
    statusCode: 404
  },
  
  unauthorized: {
    error: 'Unauthorized',
    message: 'Authentication credentials are invalid or missing',
    statusCode: 401
  },
  
  forbidden: {
    error: 'Forbidden',
    message: 'You do not have permission to access this resource',
    statusCode: 403
  },
  
  serverError: {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    statusCode: 500
  },
  
  validationError: {
    error: 'Validation Error',
    message: 'The request data is invalid',
    statusCode: 400,
    details: {
      field: 'name',
      message: 'Name is required'
    }
  }
};