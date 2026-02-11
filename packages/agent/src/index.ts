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
  SchedulerHealthResponse,
} from './ScheduleClient';

// Export the ChannelClient
export { ChannelClient } from './ChannelClient';
export type {
  RegisterChannelRequest,
  RegisterChannelResponse,
  UpdateChannelRequest,
  ChannelSummary,
  ChannelDetail,
  ChannelActionResponse,
  DeleteChannelResponse,
  ChannelHealthResponse,
  IdentityMappingEntry,
  AddIdentityMappingRequest,
  ChannelAuditResponse,
} from './ChannelClient';

// Export the AgentPinClient
export { AgentPinClient } from './AgentPinClient';
export type {
  AgentPinVerificationResult,
  AgentPinDiscoveryDocument,
  AgentPinTrustBundle,
  AgentPinVerifierConfig,
  AgentPinCredentialRequest,
} from './AgentPinClient';

// Export the WorkflowClient
export { WorkflowClient } from './WorkflowClient';
export type { WorkflowExecutionRequest } from '@symbiont/types';

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