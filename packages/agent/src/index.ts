/**
 * @symbiont/agent - Agent management and execution for the Symbiont SDK
 */

// Export the main AgentClient
export { AgentClient } from './AgentClient';

// Export the ScheduleClient
export { ScheduleClient } from './ScheduleClient';
export type {
  CreateScheduleRequest,
  CreateScheduleResponse,
  UpdateScheduleRequest,
  ScheduleSummary,
  ScheduleDetail,
  ScheduleRunEntry,
  ScheduleHistoryResponse,
  NextRunsResponse,
  ScheduleActionResponse,
  DeleteScheduleResponse,
} from './ScheduleClient';

// Re-export agent-related types from @symbiont/types for convenience
export type {
  Agent,
  AgentCreatePayload,
  AgentUpdatePayload,
  AgentDefinition,
  AgentStatus,
  AgentStatusResponse,
  ExecutionResult,
  AgentHistoryResponse,
  AgentListResponse,
  ExecutionOptions,
  AgentMetadata,
  Parameter,
  TypeDefinition,
  PolicyDefinition,
  ExecutionConfig,
  AgentHistoryItem,
} from '@symbiont/types';