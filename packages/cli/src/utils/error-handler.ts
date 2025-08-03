import chalk from 'chalk';

export class CliError extends Error {
  constructor(
    message: string,
    public code: string = 'CLI_ERROR',
    public exitCode: number = 1
  ) {
    super(message);
    this.name = 'CliError';
  }
}

export class AuthenticationError extends CliError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 1);
  }
}

export class ConfigurationError extends CliError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR', 1);
  }
}

export class ValidationError extends CliError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 1);
  }
}

export function handleError(error: unknown): void {
  let message: string;
  let exitCode = 1;

  if (error instanceof CliError) {
    message = error.message;
    exitCode = error.exitCode;
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = 'An unknown error occurred';
  }

  // Check if we're in verbose mode
  const isVerbose = process.env.SYMBIONT_DEBUG === 'true';

  console.error(chalk.red('Error:'), message);

  if (isVerbose && error instanceof Error && error.stack) {
    console.error(chalk.gray('\nStack trace:'));
    console.error(chalk.gray(error.stack));
  }

  process.exit(exitCode);
}

export function logVerbose(message: string): void {
  if (process.env.SYMBIONT_DEBUG === 'true') {
    console.error(chalk.gray('[DEBUG]'), message);
  }
}

export function logWarning(message: string): void {
  console.warn(chalk.yellow('Warning:'), message);
}

export function logSuccess(message: string): void {
  console.log(chalk.green('✓'), message);
}

export function logInfo(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}