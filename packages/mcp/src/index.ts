/**
 * @symbiont/mcp - MCP client for workflow execution and management
 */

// Re-export MCP types from @symbiont/types for convenience
export * from '@symbiont/types';

// Export main MCP client
export { McpClient } from './McpClient';

// Default export is the main client
export { McpClient as default } from './McpClient';