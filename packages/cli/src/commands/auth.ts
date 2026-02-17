import { Command } from 'commander';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import inquirer from 'inquirer';
import { SymbiontClient } from '@symbi/core';
import { getConfig, setConfig, getCredentialsPath } from '../utils/config';
import { AuthenticationError, logSuccess, logInfo, logVerbose } from '../utils/error-handler';
import { formatKeyValue } from '../utils/output';

export function setupAuthCommands(program: Command): void {
  const auth = program
    .command('auth')
    .description('Authentication commands');

  auth
    .command('login')
    .description('Authenticate with Symbiont')
    .option('-k, --api-key <key>', 'API key for Runtime API')
    .option('-j, --jwt <token>', 'JWT token for Tool Review API')
    .option('-u, --runtime-url <url>', 'Runtime API URL')
    .option('-t, --tool-review-url <url>', 'Tool Review API URL')
    .option('-p, --profile <name>', 'Profile name (default: "default")')
    .option('--interactive', 'Interactive login flow')
    .action(async (options) => {
      await handleLogin(options);
    });

  auth
    .command('logout')
    .description('Remove stored authentication credentials')
    .option('-p, --profile <name>', 'Profile name (default: "default")')
    .action(async (options) => {
      await handleLogout(options);
    });

  auth
    .command('whoami')
    .description('Display current authentication status')
    .option('-p, --profile <name>', 'Profile name (default: "default")')
    .action(async (options) => {
      await handleWhoami(options);
    });
}

async function handleLogin(options: any): Promise<void> {
  const profile = options.profile || 'default';
  
  let credentials: any = {};

  if (options.interactive || (!options.apiKey && !options.jwt)) {
    // Interactive login
    logInfo('Interactive authentication setup');
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiKey',
        message: 'Enter your Runtime API key (optional):',
        default: options.apiKey
      },
      {
        type: 'input',
        name: 'jwt',
        message: 'Enter your Tool Review JWT token (optional):',
        default: options.jwt
      },
      {
        type: 'input',
        name: 'runtimeUrl',
        message: 'Runtime API URL (optional):',
        default: options.runtimeUrl
      },
      {
        type: 'input',
        name: 'toolReviewUrl',
        message: 'Tool Review API URL (optional):',
        default: options.toolReviewUrl
      }
    ]);

    credentials = {
      ...(answers.apiKey && { apiKey: answers.apiKey }),
      ...(answers.jwt && { jwt: answers.jwt }),
      ...(answers.runtimeUrl && { runtimeApiUrl: answers.runtimeUrl }),
      ...(answers.toolReviewUrl && { toolReviewApiUrl: answers.toolReviewUrl })
    };
  } else {
    // Non-interactive login
    credentials = {
      ...(options.apiKey && { apiKey: options.apiKey }),
      ...(options.jwt && { jwt: options.jwt }),
      ...(options.runtimeUrl && { runtimeApiUrl: options.runtimeUrl }),
      ...(options.toolReviewUrl && { toolReviewApiUrl: options.toolReviewUrl })
    };
  }

  if (!credentials.apiKey && !credentials.jwt) {
    throw new AuthenticationError('At least one authentication method (API key or JWT) must be provided');
  }

  // Validate credentials by creating a client and testing connection
  try {
    logVerbose('Validating credentials...');
    
    const config = getConfig();
    const testClient = new SymbiontClient({
      ...config,
      ...credentials
    });
    
    await testClient.connect();
    logVerbose('Credentials validated successfully');
  } catch (error) {
    throw new AuthenticationError(`Invalid credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Save credentials
  await saveCredentials(profile, credentials);
  
  logSuccess(`Authenticated successfully as profile "${profile}"`);
  
  // Update current config
  setConfig({ profileName: profile, ...credentials });
}

async function handleLogout(options: any): Promise<void> {
  const profile = options.profile || 'default';
  
  try {
    const credentialsPath = getCredentialsPath();
    
    if (existsSync(credentialsPath)) {
      const { readFileSync } = require('fs');
      const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
      
      if (credentials[profile]) {
        delete credentials[profile];
        
        // Ensure directory exists
        mkdirSync(dirname(credentialsPath), { recursive: true });
        writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
        
        logSuccess(`Logged out from profile "${profile}"`);
      } else {
        logInfo(`Profile "${profile}" was not logged in`);
      }
    } else {
      logInfo('No stored credentials found');
    }
  } catch (error) {
    throw new AuthenticationError(`Failed to logout: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function handleWhoami(options: any): Promise<void> {
  const profile = options.profile || 'default';
  
  try {
    const config = getConfig();
    
    if (!config.apiKey && !config.jwt) {
      logInfo('Not authenticated. Run "symbiont auth login" to authenticate.');
      return;
    }

    // Try to connect and get user info
    const client = new SymbiontClient(config);
    await client.connect();
    
    const authInfo: any = {
      profile: config.profileName || profile,
      hasApiKey: !!config.apiKey,
      hasJwt: !!config.jwt,
      runtimeApiUrl: config.runtimeApiUrl,
      toolReviewApiUrl: config.toolReviewApiUrl,
      environment: config.environment
    };

    console.log(formatKeyValue(authInfo));
    
  } catch (error) {
    throw new AuthenticationError(`Failed to verify authentication: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function saveCredentials(profile: string, credentials: any): Promise<void> {
  const credentialsPath = getCredentialsPath();
  
  let existingCredentials: any = {};
  
  if (existsSync(credentialsPath)) {
    try {
      const { readFileSync } = require('fs');
      existingCredentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
    } catch (error) {
      logVerbose(`Failed to read existing credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  existingCredentials[profile] = credentials;
  
  // Ensure directory exists
  mkdirSync(dirname(credentialsPath), { recursive: true });
  
  writeFileSync(credentialsPath, JSON.stringify(existingCredentials, null, 2), { mode: 0o600 });
  
  logVerbose(`Credentials saved to ${credentialsPath}`);
}