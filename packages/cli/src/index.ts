/**
 * @symbiont/cli - Command-line interface for Symbiont SDK
 */

// Export main CLI program for programmatic usage
export { program } from './cli';

// Export utilities for extending the CLI
export * from './utils/config';
export * from './utils/error-handler';
export * from './utils/output';

// Export command setup functions for custom CLI builds
export { setupAuthCommands } from './commands/auth';
export { setupAgentCommands } from './commands/agent';
export { setupDevCommands } from './commands/dev';