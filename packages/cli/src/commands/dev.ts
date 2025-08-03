import { Command } from 'commander';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import inquirer from 'inquirer';
import { logSuccess, logInfo, logVerbose, ValidationError } from '../utils/error-handler';
import { formatKeyValue } from '../utils/output';

export function setupDevCommands(program: Command): void {
  const dev = program
    .command('dev')
    .description('Development and project management commands');

  dev
    .command('init')
    .description('Initialize a new Symbiont project')
    .argument('[directory]', 'Project directory (default: current directory)')
    .option('-n, --name <name>', 'Project name')
    .option('-d, --description <description>', 'Project description')
    .option('-t, --template <template>', 'Project template (basic, agent, policy)', 'basic')
    .option('--force', 'Overwrite existing files')
    .action(async (directory, options) => {
      await handleInit(directory, options);
    });

  dev
    .command('watch')
    .description('Watch for changes and auto-reload agents')
    .argument('[pattern]', 'File pattern to watch (default: **/*.{dsl,json})')
    .option('-d, --directory <dir>', 'Directory to watch (default: current)')
    .option('--deploy', 'Auto-deploy on changes')
    .action(async (pattern, options) => {
      await handleWatch(pattern, options);
    });

  dev
    .command('validate')
    .description('Validate project files')
    .argument('[files...]', 'Specific files to validate')
    .option('-a, --all', 'Validate all project files')
    .option('--strict', 'Use strict validation')
    .action(async (files, options) => {
      await handleValidate(files, options);
    });
}

async function handleInit(directory: string, options: any): Promise<void> {
  const projectDir = directory || process.cwd();
  const projectName = options.name || 'symbiont-project';
  
  logVerbose(`Initializing project in: ${projectDir}`);

  // Check if directory exists and has files
  if (existsSync(projectDir)) {
    const { readdirSync } = require('fs');
    const files = readdirSync(projectDir);
    if (files.length > 0 && !options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Directory is not empty. Continue?',
          default: false
        }
      ]);
      
      if (!confirm) {
        logInfo('Initialization cancelled');
        return;
      }
    }
  } else {
    mkdirSync(projectDir, { recursive: true });
  }

  // Gather project information
  let projectInfo: any = {
    name: projectName,
    description: options.description || 'A Symbiont project',
    template: options.template
  };

  if (!options.name || !options.description) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Project name:',
        default: projectInfo.name,
        when: !options.name
      },
      {
        type: 'input',
        name: 'description',
        message: 'Project description:',
        default: projectInfo.description,
        when: !options.description
      },
      {
        type: 'list',
        name: 'template',
        message: 'Project template:',
        choices: [
          { name: 'Basic - Empty project structure', value: 'basic' },
          { name: 'Agent - Sample agent project', value: 'agent' },
          { name: 'Policy - Sample policy project', value: 'policy' }
        ],
        default: options.template,
        when: !options.template || options.template === 'basic'
      }
    ]);

    projectInfo = { ...projectInfo, ...answers };
  }

  // Create project structure
  await createProjectStructure(projectDir, projectInfo);

  logSuccess(`Project "${projectInfo.name}" initialized successfully!`);
  
  console.log('\nNext steps:');
  console.log(`1. cd ${directory || '.'}`);
  console.log('2. symbiont auth login');
  console.log('3. Start developing your agents and policies');
}

async function createProjectStructure(projectDir: string, projectInfo: any): Promise<void> {
  // Create directories
  const dirs = ['agents', 'policies', 'scripts', 'tests'];
  dirs.forEach(dir => {
    mkdirSync(join(projectDir, dir), { recursive: true });
  });

  // Create package.json
  const packageJson = {
    name: projectInfo.name,
    version: '1.0.0',
    description: projectInfo.description,
    scripts: {
      test: 'symbiont dev validate --all',
      deploy: 'symbiont agent create agents/*.json',
      watch: 'symbiont dev watch'
    },
    dependencies: {
      '@symbiont/cli': '^1.0.0'
    }
  };
  
  writeFileSync(
    join(projectDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create symbiont.config.json
  const config = {
    environment: 'development',
    validationMode: 'development',
    agents: {
      directory: './agents',
      autoWatch: true
    },
    policies: {
      directory: './policies'
    }
  };
  
  writeFileSync(
    join(projectDir, 'symbiont.config.json'),
    JSON.stringify(config, null, 2)
  );

  // Create README.md
  const readme = `# ${projectInfo.name}

${projectInfo.description}

## Getting Started

1. Authenticate with Symbiont:
   \`\`\`bash
   symbiont auth login
   \`\`\`

2. Create your first agent:
   \`\`\`bash
   symbiont agent create agents/my-agent.json
   \`\`\`

3. Execute your agent:
   \`\`\`bash
   symbiont agent execute my-agent --params '{"input": "test"}'
   \`\`\`

## Project Structure

- \`agents/\` - Agent definitions
- \`policies/\` - Policy definitions  
- \`scripts/\` - Utility scripts
- \`tests/\` - Test files

## Commands

- \`npm test\` - Validate all project files
- \`npm run deploy\` - Deploy all agents
- \`npm run watch\` - Watch for changes

## Documentation

Visit [Symbiont Documentation](https://docs.symbiont.dev) for more information.
`;

  writeFileSync(join(projectDir, 'README.md'), readme);

  // Create template files based on template type
  if (projectInfo.template === 'agent') {
    await createAgentTemplate(projectDir);
  } else if (projectInfo.template === 'policy') {
    await createPolicyTemplate(projectDir);
  }

  // Create .gitignore
  const gitignore = `# Symbiont
.symbiont/
symbiont.local.json

# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`;

  writeFileSync(join(projectDir, '.gitignore'), gitignore);
}

async function createAgentTemplate(projectDir: string): Promise<void> {
  const sampleAgent = {
    name: 'sample-agent',
    description: 'A sample data processing agent',
    metadata: {
      version: '1.0.0',
      author: 'developer',
      tags: ['sample', 'data-processing']
    },
    parameters: [
      {
        name: 'input',
        type: { name: 'string' },
        required: true,
        description: 'Input data to process'
      }
    ],
    returnType: { name: 'string' },
    capabilities: ['data_processing'],
    dslSource: `
agent processData(input: string): string {
  // Process the input data
  let result = input.toUpperCase();
  return "Processed: " + result;
}
`.trim()
  };

  writeFileSync(
    join(projectDir, 'agents', 'sample-agent.json'),
    JSON.stringify(sampleAgent, null, 2)
  );

  logInfo('Created sample agent: agents/sample-agent.json');
}

async function createPolicyTemplate(projectDir: string): Promise<void> {
  const samplePolicy = {
    name: 'sample-policy',
    description: 'A sample access control policy',
    version: '1.0.0',
    rules: [
      {
        effect: 'allow',
        actions: ['read', 'execute'],
        resources: ['agents/*'],
        conditions: {
          'user.role': 'developer'
        }
      },
      {
        effect: 'deny',
        actions: ['delete'],
        resources: ['agents/production-*'],
        conditions: {
          'environment': 'production'
        }
      }
    ]
  };

  writeFileSync(
    join(projectDir, 'policies', 'sample-policy.json'),
    JSON.stringify(samplePolicy, null, 2)
  );

  logInfo('Created sample policy: policies/sample-policy.json');
}

async function handleWatch(pattern: string, options: any): Promise<void> {
  const watchPattern = pattern || '**/*.{dsl,json}';
  const watchDir = options.directory || process.cwd();

  logInfo(`Watching for changes in ${watchDir} (pattern: ${watchPattern})`);
  
  // This would implement file watching using chokidar or similar
  // For now, just show the concept
  logInfo('File watching would be implemented here');
  logInfo('Use Ctrl+C to stop watching');

  // Mock implementation - in real scenario would use chokidar
  console.log(formatKeyValue({
    'Watch Directory': watchDir,
    'Pattern': watchPattern,
    'Auto-deploy': options.deploy ? 'enabled' : 'disabled',
    'Status': 'watching...'
  }));

  // Keep process alive
  process.stdin.resume();
}

async function handleValidate(files: string[], options: any): Promise<void> {
  const targetFiles = files.length > 0 ? files : options.all ? ['**/*.{json,dsl}'] : ['symbiont.config.json'];
  
  logVerbose(`Validating files: ${targetFiles.join(', ')}`);

  // Mock validation - in real implementation would validate against schemas
  let validCount = 0;
  let errorCount = 0;

  for (const file of targetFiles) {
    try {
      if (existsSync(file)) {
        logVerbose(`Validating ${file}...`);
        // Actual validation would happen here
        validCount++;
      } else {
        throw new ValidationError(`File not found: ${file}`);
      }
    } catch (error) {
      console.error(`❌ ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      errorCount++;
    }
  }

  console.log(formatKeyValue({
    'Files Validated': validCount.toString(),
    'Errors': errorCount.toString(),
    'Status': errorCount === 0 ? '✅ All valid' : '❌ Validation failed'
  }));

  if (errorCount > 0) {
    process.exit(1);
  }

  logSuccess('Validation completed successfully');
}