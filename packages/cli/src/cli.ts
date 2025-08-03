#!/usr/bin/env node

import { Command } from 'commander';
import { CliError, handleError } from './utils/error-handler';
import { setupAuthCommands } from './commands/auth';
import { setupAgentCommands } from './commands/agent';
import { setupDevCommands } from './commands/dev';
import { loadConfig } from './utils/config';

const program = new Command();

async function main() {
  try {
    // Load configuration
    await loadConfig();

    program
      .name('symbiont')
      .description('Symbiont SDK Command Line Interface')
      .version('1.0.0')
      .option('-v, --verbose', 'Enable verbose output')
      .option('-c, --config <path>', 'Path to configuration file')
      .hook('preAction', (thisCommand) => {
        // Set global verbosity
        const opts = thisCommand.optsWithGlobals();
        if (opts.verbose) {
          process.env.SYMBIONT_DEBUG = 'true';
        }
      });

    // Setup command groups
    setupAuthCommands(program);
    setupAgentCommands(program);
    setupDevCommands(program);

    // Parse command line arguments
    await program.parseAsync(process.argv);

  } catch (error) {
    handleError(error);
    process.exit(1);
  }
}

// Only run if this file is being executed directly
if (require.main === module) {
  main();
}

export { program };