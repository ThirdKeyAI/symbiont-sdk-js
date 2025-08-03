import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { SymbiontConfig } from '@symbiont/types';
import { ConfigurationError, logVerbose } from './error-handler';

export interface CliConfig extends SymbiontConfig {
  profileName?: string;
  credentialsFile?: string;
}

let globalConfig: CliConfig | null = null;

export async function loadConfig(configPath?: string): Promise<CliConfig> {
  if (globalConfig) {
    return globalConfig;
  }

  const config: CliConfig = {
    validationMode: 'development',
    environment: 'development',
    timeout: 30000,
    debug: process.env.SYMBIONT_DEBUG === 'true',
  };

  // Load from environment variables
  loadFromEnvironment(config);

  // Load from config file
  if (configPath || existsSync(getDefaultConfigPath())) {
    const fileConfig = loadFromFile(configPath || getDefaultConfigPath());
    Object.assign(config, fileConfig);
  }

  // Load from credentials file
  loadCredentials(config);

  globalConfig = config;
  
  logVerbose(`Loaded configuration: ${JSON.stringify(config, null, 2)}`);
  
  return config;
}

export function getConfig(): CliConfig {
  if (!globalConfig) {
    throw new ConfigurationError('Configuration not loaded. Call loadConfig() first.');
  }
  return globalConfig;
}

export function setConfig(config: Partial<CliConfig>): void {
  globalConfig = { ...getConfig(), ...config };
}

function loadFromEnvironment(config: CliConfig): void {
  if (process.env.SYMBIONT_API_KEY) {
    config.apiKey = process.env.SYMBIONT_API_KEY;
  }
  
  if (process.env.SYMBIONT_JWT) {
    config.jwt = process.env.SYMBIONT_JWT;
  }
  
  if (process.env.SYMBIONT_API_URL) {
    config.runtimeApiUrl = process.env.SYMBIONT_API_URL;
  }
  
  if (process.env.SYMBIONT_TOOL_REVIEW_URL) {
    config.toolReviewApiUrl = process.env.SYMBIONT_TOOL_REVIEW_URL;
  }
  
  if (process.env.SYMBIONT_ENVIRONMENT) {
    config.environment = process.env.SYMBIONT_ENVIRONMENT as any;
  }
  
  if (process.env.SYMBIONT_PROFILE) {
    config.profileName = process.env.SYMBIONT_PROFILE;
  }
}

function loadFromFile(configPath: string): Partial<CliConfig> {
  try {
    if (!existsSync(configPath)) {
      return {};
    }
    
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new ConfigurationError(`Failed to load config from ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function loadCredentials(config: CliConfig): void {
  const credentialsPath = config.credentialsFile || getDefaultCredentialsPath();
  
  if (existsSync(credentialsPath)) {
    try {
      const content = readFileSync(credentialsPath, 'utf-8');
      const credentials = JSON.parse(content);
      
      const profileName = config.profileName || 'default';
      const profile = credentials[profileName];
      
      if (profile) {
        if (profile.apiKey && !config.apiKey) {
          config.apiKey = profile.apiKey;
        }
        if (profile.jwt && !config.jwt) {
          config.jwt = profile.jwt;
        }
        if (profile.runtimeApiUrl && !config.runtimeApiUrl) {
          config.runtimeApiUrl = profile.runtimeApiUrl;
        }
        if (profile.toolReviewApiUrl && !config.toolReviewApiUrl) {
          config.toolReviewApiUrl = profile.toolReviewApiUrl;
        }
      }
    } catch (error) {
      logVerbose(`Failed to load credentials from ${credentialsPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

function getDefaultConfigPath(): string {
  return join(homedir(), '.symbiont', 'config.json');
}

function getDefaultCredentialsPath(): string {
  return join(homedir(), '.symbiont', 'credentials.json');
}

export function getCredentialsPath(): string {
  return getConfig().credentialsFile || getDefaultCredentialsPath();
}

export function getConfigPath(): string {
  return getDefaultConfigPath();
}