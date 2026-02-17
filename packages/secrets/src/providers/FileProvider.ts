import * as fs from 'fs';
import * as path from 'path';
import {
  SecretProvider,
  SecretResolutionResult,
  FileProviderConfig,
  SecretProviderError
} from '@symbi/types';

/**
 * Provider that resolves secrets from files (JSON or .env format)
 */
export class FileProvider implements SecretProvider {
  readonly name = 'file';
  readonly priority: number;
  private config: FileProviderConfig;
  private secrets: Record<string, string> = {};
  private lastModified: number = 0;

  constructor(config: FileProviderConfig) {
    this.config = {
      format: 'json',
      encoding: 'utf8',
      ...config
    };
    this.priority = config.priority ?? 50; // Default medium priority
  }

  /**
   * Get secret from loaded file data
   */
  async getSecret(key: string): Promise<SecretResolutionResult> {
    await this.ensureLoaded();

    const value = this.secrets[key];
    return {
      value: value || '',
      source: `file:${this.config.filePath}`,
      found: value !== undefined
    };
  }

  /**
   * Check if the file exists and is readable
   */
  async isAvailable(): Promise<boolean> {
    try {
      await fs.promises.access(this.config.filePath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize by loading the file
   */
  async initialize(): Promise<void> {
    await this.loadFile();
  }

  /**
   * Ensure file is loaded and up-to-date
   */
  private async ensureLoaded(): Promise<void> {
    try {
      const stats = await fs.promises.stat(this.config.filePath);
      const fileModified = stats.mtime.getTime();

      // Reload if file has been modified since last load
      if (fileModified > this.lastModified) {
        await this.loadFile();
        this.lastModified = fileModified;
      }
    } catch (error) {
      throw new SecretProviderError(
        `Failed to check file stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name
      );
    }
  }

  /**
   * Load secrets from the file
   */
  private async loadFile(): Promise<void> {
    try {
      const content = await fs.promises.readFile(
        this.config.filePath,
        this.config.encoding || 'utf8'
      );

      if (this.config.format === 'json') {
        this.secrets = this.parseJsonSecrets(content.toString());
      } else if (this.config.format === 'env') {
        this.secrets = this.parseEnvSecrets(content.toString());
      } else {
        throw new SecretProviderError(
          `Unsupported file format: ${this.config.format}`,
          this.name
        );
      }

      const stats = await fs.promises.stat(this.config.filePath);
      this.lastModified = stats.mtime.getTime();
    } catch (error) {
      if (error instanceof SecretProviderError) {
        throw error;
      }

      throw new SecretProviderError(
        `Failed to load secrets file '${this.config.filePath}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name
      );
    }
  }

  /**
   * Parse JSON format secrets file
   */
  private parseJsonSecrets(content: string): Record<string, string> {
    try {
      const parsed = JSON.parse(content);

      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('JSON content must be an object');
      }

      // Flatten nested objects with dot notation
      return this.flattenObject(parsed);
    } catch (error) {
      throw new SecretProviderError(
        `Failed to parse JSON secrets: ${error instanceof Error ? error.message : 'Parse error'}`,
        this.name
      );
    }
  }

  /**
   * Parse .env format secrets file
   */
  private parseEnvSecrets(content: string): Record<string, string> {
    const secrets: Record<string, string> = {};
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith('#')) {
        continue;
      }

      const equalIndex = line.indexOf('=');
      if (equalIndex === -1) {
        continue; // Skip lines without '='
      }

      const key = line.substring(0, equalIndex).trim();
      let value = line.substring(equalIndex + 1).trim();

      // Handle quoted values
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (key) {
        secrets[key] = value;
      }
    }

    return secrets;
  }

  /**
   * Flatten nested object to dot notation
   */
  private flattenObject(
    obj: Record<string, any>,
    prefix = '',
    result: Record<string, string> = {}
  ): Record<string, string> {
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        this.flattenObject(value, newKey, result);
      } else {
        result[newKey] = String(value);
      }
    }

    return result;
  }
}