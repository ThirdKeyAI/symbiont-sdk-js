import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { SymbiontClient } from '@symbi/core';
import { getConfig } from '../utils/config';
import { AuthenticationError, ValidationError, logSuccess, logInfo, logVerbose } from '../utils/error-handler';
import { formatTable, formatKeyValue, formatJson } from '../utils/output';

export function setupAgentCommands(program: Command): void {
  const agent = program
    .command('agent')
    .description('Agent management commands');

  agent
    .command('create')
    .description('Create a new agent')
    .argument('<file>', 'Agent definition file (.json or .dsl)')
    .option('-n, --name <name>', 'Override agent name')
    .option('-d, --description <desc>', 'Override agent description')
    .option('--dry-run', 'Validate without creating')
    .option('--json', 'Output as JSON')
    .action(async (file, options) => {
      await handleAgentCreate(file, options);
    });

  agent
    .command('list')
    .description('List agents')
    .option('-f, --filter <pattern>', 'Filter agents by name pattern')
    .option('-t, --tag <tag>', 'Filter by tag')
    .option('--json', 'Output as JSON')
    .option('--limit <n>', 'Limit number of results', '50')
    .action(async (options) => {
      await handleAgentList(options);
    });

  agent
    .command('get')
    .description('Get agent details')
    .argument('<id-or-name>', 'Agent ID or name')
    .option('--json', 'Output as JSON')
    .option('--include-source', 'Include DSL source code')
    .action(async (idOrName, options) => {
      await handleAgentGet(idOrName, options);
    });

  agent
    .command('execute')
    .description('Execute an agent')
    .argument('<id-or-name>', 'Agent ID or name')
    .option('-p, --params <json>', 'Execution parameters as JSON string')
    .option('-f, --params-file <file>', 'Load parameters from JSON file')
    .option('--timeout <ms>', 'Execution timeout in milliseconds')
    .option('--async', 'Run asynchronously and return execution ID')
    .option('--json', 'Output as JSON')
    .action(async (idOrName, options) => {
      await handleAgentExecute(idOrName, options);
    });

  agent
    .command('delete')
    .description('Delete an agent')
    .argument('<id-or-name>', 'Agent ID or name')
    .option('-f, --force', 'Skip confirmation prompt')
    .action(async (idOrName, options) => {
      await handleAgentDelete(idOrName, options);
    });

  agent
    .command('status')
    .description('Get execution status')
    .argument('<execution-id>', 'Execution ID')
    .option('--json', 'Output as JSON')
    .action(async (executionId, options) => {
      await handleExecutionStatus(executionId, options);
    });
}

async function handleAgentCreate(file: string, options: any): Promise<void> {
  if (!existsSync(file)) {
    throw new ValidationError(`Agent definition file not found: ${file}`);
  }

  logVerbose(`Loading agent definition from ${file}`);
  
  let agentDefinition: any;
  try {
    const content = readFileSync(file, 'utf-8');
    
    if (file.endsWith('.json')) {
      agentDefinition = JSON.parse(content);
    } else if (file.endsWith('.dsl')) {
      // For DSL files, we would need to parse the DSL
      // For now, treat as plain text source
      agentDefinition = {
        name: options.name || 'unnamed-agent',
        description: options.description || 'Agent created from DSL',
        dslSource: content
      };
    } else {
      throw new ValidationError('Agent definition must be a .json or .dsl file');
    }
  } catch (error) {
    throw new ValidationError(`Failed to parse agent definition: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Override with command line options
  if (options.name) {
    agentDefinition.name = options.name;
  }
  if (options.description) {
    agentDefinition.description = options.description;
  }

  if (options.dryRun) {
    logInfo('Dry run mode - validation only');
    console.log('Agent definition:', formatJson(agentDefinition));
    logSuccess('Agent definition is valid');
    return;
  }

  const client = new SymbiontClient(getConfig());
  await client.connect();

  try {
    logVerbose('Creating agent...');
    const agent = await client.agents.create(agentDefinition);
    
    if (options.json) {
      console.log(formatJson(agent));
    } else {
      logSuccess(`Agent created successfully`);
      console.log(formatKeyValue({
        'ID': agent.id,
        'Name': agent.name,
        'Description': agent.description,
        'Status': agent.status,
        'Created': new Date(agent.createdAt).toLocaleString()
      }));
    }
  } catch (error) {
    throw new Error(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function handleAgentList(options: any): Promise<void> {
  const client = new SymbiontClient(getConfig());
  await client.connect();

  try {
    logVerbose('Fetching agents...');
    
    const filters: any = {};
    if (options.filter) {
      filters.namePattern = options.filter;
    }
    if (options.tag) {
      filters.tag = options.tag;
    }
    
    const agents = await client.agents.list({
      ...filters,
      limit: parseInt(options.limit, 10)
    });

    if (options.json) {
      console.log(formatJson(agents));
      return;
    }

    if (agents.length === 0) {
      logInfo('No agents found');
      return;
    }

    const columns = [
      { key: 'id', label: 'ID', width: 36 },
      { key: 'name', label: 'Name', width: 20 },
      { key: 'description', label: 'Description', width: 40 },
      { key: 'status', label: 'Status', width: 10 },
      { key: 'createdAt', label: 'Created', width: 20 }
    ];

    const tableData = agents.map((agent: any) => ({
      ...agent,
      createdAt: new Date(agent.createdAt).toLocaleDateString(),
      description: agent.description?.substring(0, 37) + (agent.description?.length > 37 ? '...' : '')
    }));

    console.log(formatTable(tableData, columns));
    logInfo(`Found ${agents.length} agent(s)`);
    
  } catch (error) {
    throw new Error(`Failed to list agents: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function handleAgentGet(idOrName: string, options: any): Promise<void> {
  const client = new SymbiontClient(getConfig());
  await client.connect();

  try {
    logVerbose(`Fetching agent: ${idOrName}`);
    const agent = await client.agents.get(idOrName);

    if (options.json) {
      console.log(formatJson(agent));
      return;
    }

    const displayData: any = {
      'ID': agent.id,
      'Name': agent.name,
      'Description': agent.description,
      'Status': agent.status,
      'Created': new Date(agent.createdAt).toLocaleString(),
      'Updated': new Date(agent.updatedAt).toLocaleString(),
      'Version': agent.version || 'N/A',
      'Author': agent.metadata?.author || 'N/A'
    };

    if (agent.capabilities?.length > 0) {
      displayData['Capabilities'] = agent.capabilities.join(', ');
    }

    if (agent.tags?.length > 0) {
      displayData['Tags'] = agent.tags.join(', ');
    }

    console.log(formatKeyValue(displayData));

    if (options.includeSource && agent.dslSource) {
      console.log('\n--- DSL Source ---');
      console.log(agent.dslSource);
    }

  } catch (error) {
    throw new Error(`Failed to get agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function handleAgentExecute(idOrName: string, options: any): Promise<void> {
  let parameters: any = {};

  // Load parameters
  if (options.paramsFile) {
    if (!existsSync(options.paramsFile)) {
      throw new ValidationError(`Parameters file not found: ${options.paramsFile}`);
    }
    try {
      const content = readFileSync(options.paramsFile, 'utf-8');
      parameters = JSON.parse(content);
    } catch (error) {
      throw new ValidationError(`Failed to parse parameters file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else if (options.params) {
    try {
      parameters = JSON.parse(options.params);
    } catch (error) {
      throw new ValidationError(`Failed to parse parameters JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const client = new SymbiontClient(getConfig());
  await client.connect();

  try {
    logVerbose(`Executing agent: ${idOrName}`);
    
    const executionOptions: any = {};
    if (options.timeout) {
      executionOptions.timeout = parseInt(options.timeout, 10);
    }
    if (options.async) {
      executionOptions.async = true;
    }

    const result = await client.agents.execute(idOrName, parameters, executionOptions);

    if (options.json) {
      console.log(formatJson(result));
      return;
    }

    if (options.async) {
      logSuccess('Agent execution started');
      console.log(formatKeyValue({
        'Execution ID': result.executionId,
        'Status': result.status,
        'Started': new Date(result.startedAt).toLocaleString()
      }));
      logInfo(`Use "symbiont agent status ${result.executionId}" to check progress`);
    } else {
      logSuccess('Agent execution completed');
      console.log(formatKeyValue({
        'Status': result.status,
        'Duration': `${result.duration}ms`,
        'Result': typeof result.result === 'object' ? JSON.stringify(result.result, null, 2) : result.result
      }));
    }

  } catch (error) {
    throw new Error(`Failed to execute agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function handleAgentDelete(idOrName: string, options: any): Promise<void> {
  if (!options.force) {
    const inquirer = require('inquirer');
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to delete agent "${idOrName}"?`,
        default: false
      }
    ]);

    if (!confirm) {
      logInfo('Delete cancelled');
      return;
    }
  }

  const client = new SymbiontClient(getConfig());
  await client.connect();

  try {
    logVerbose(`Deleting agent: ${idOrName}`);
    await client.agents.delete(idOrName);
    logSuccess(`Agent "${idOrName}" deleted successfully`);
  } catch (error) {
    throw new Error(`Failed to delete agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function handleExecutionStatus(executionId: string, options: any): Promise<void> {
  const client = new SymbiontClient(getConfig());
  await client.connect();

  try {
    logVerbose(`Fetching execution status: ${executionId}`);
    const status = await client.agents.getExecutionStatus(executionId);

    if (options.json) {
      console.log(formatJson(status));
      return;
    }

    console.log(formatKeyValue({
      'Execution ID': status.executionId,
      'Status': status.status,
      'Agent': status.agentName,
      'Started': new Date(status.startedAt).toLocaleString(),
      'Duration': status.duration ? `${status.duration}ms` : 'N/A',
      'Progress': status.progress ? `${Math.round(status.progress * 100)}%` : 'N/A'
    }));

    if (status.result) {
      console.log('\n--- Result ---');
      console.log(typeof status.result === 'object' ? JSON.stringify(status.result, null, 2) : status.result);
    }

    if (status.error) {
      console.log('\n--- Error ---');
      console.log(status.error);
    }

  } catch (error) {
    throw new Error(`Failed to get execution status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}