import {
  HealthStatus,
  ScheduleSummary,
  ScheduleDetail,
  CreateScheduleResponse,
  ScheduleHistoryResponse,
  NextRunsResponse,
  ScheduleActionResponse,
  DeleteScheduleResponse,
  SchedulerHealthResponse,
} from '@symbiont/types';

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

// Schedule mock data
export const mockScheduleSummaries: ScheduleSummary[] = [
  {
    job_id: 'job-1',
    name: 'Daily Report',
    cron_expression: '0 9 * * *',
    timezone: 'UTC',
    status: 'active',
    enabled: true,
    next_run: '2024-01-02T09:00:00Z',
    run_count: 10,
  },
  {
    job_id: 'job-2',
    name: 'Hourly Sync',
    cron_expression: '0 * * * *',
    timezone: 'America/New_York',
    status: 'active',
    enabled: true,
    next_run: '2024-01-01T13:00:00Z',
    run_count: 24,
  },
];

export const mockScheduleDetail: ScheduleDetail = {
  job_id: 'job-1',
  name: 'Daily Report',
  cron_expression: '0 9 * * *',
  timezone: 'UTC',
  status: 'active',
  enabled: true,
  one_shot: false,
  next_run: '2024-01-02T09:00:00Z',
  last_run: '2024-01-01T09:00:00Z',
  run_count: 10,
  failure_count: 1,
  created_at: '2023-12-01T00:00:00Z',
  updated_at: '2024-01-01T09:00:00Z',
};

export const mockCreateScheduleResponse: CreateScheduleResponse = {
  job_id: 'job-new',
  next_run: '2024-01-02T09:00:00Z',
  status: 'active',
};

export const mockScheduleHistory: ScheduleHistoryResponse = {
  job_id: 'job-1',
  history: [
    {
      run_id: 'run-1',
      started_at: '2024-01-01T09:00:00Z',
      completed_at: '2024-01-01T09:01:30Z',
      status: 'success',
      error: null,
      execution_time_ms: 90000,
    },
    {
      run_id: 'run-2',
      started_at: '2023-12-31T09:00:00Z',
      completed_at: '2023-12-31T09:00:45Z',
      status: 'success',
      error: null,
      execution_time_ms: 45000,
    },
  ],
};

export const mockNextRuns: NextRunsResponse = {
  job_id: 'job-1',
  next_runs: [
    '2024-01-02T09:00:00Z',
    '2024-01-03T09:00:00Z',
    '2024-01-04T09:00:00Z',
  ],
};

export const mockScheduleAction: ScheduleActionResponse = {
  job_id: 'job-1',
  action: 'pause',
  status: 'ok',
};

export const mockDeleteSchedule: DeleteScheduleResponse = {
  job_id: 'job-1',
  deleted: true,
};

export const mockSchedulerHealth: SchedulerHealthResponse = {
  is_running: true,
  store_accessible: true,
  jobs_total: 5,
  jobs_active: 3,
  jobs_paused: 1,
  jobs_dead_letter: 1,
  global_active_runs: 2,
  max_concurrent: 10,
  runs_total: 150,
  runs_succeeded: 140,
  runs_failed: 10,
  average_execution_time_ms: 5000,
  longest_run_ms: 30000,
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