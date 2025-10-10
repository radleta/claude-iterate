/**
 * Base error for claude-iterate
 */
export class ClaudeIterateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClaudeIterateError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Workspace not found error
 */
export class WorkspaceNotFoundError extends ClaudeIterateError {
  constructor(name: string) {
    super(`Workspace not found: ${name}`);
    this.name = 'WorkspaceNotFoundError';
  }
}

/**
 * Workspace already exists error
 */
export class WorkspaceExistsError extends ClaudeIterateError {
  constructor(name: string) {
    super(`Workspace already exists: ${name}`);
    this.name = 'WorkspaceExistsError';
  }
}

/**
 * Template not found error
 */
export class TemplateNotFoundError extends ClaudeIterateError {
  constructor(name: string) {
    super(`Template not found: ${name}`);
    this.name = 'TemplateNotFoundError';
  }
}

/**
 * Template already exists error
 */
export class TemplateExistsError extends ClaudeIterateError {
  constructor(name: string) {
    super(`Template already exists: ${name}`);
    this.name = 'TemplateExistsError';
  }
}

/**
 * Invalid metadata error
 */
export class InvalidMetadataError extends ClaudeIterateError {
  constructor(message: string) {
    super(`Invalid metadata: ${message}`);
    this.name = 'InvalidMetadataError';
  }
}

/**
 * Invalid config error
 */
export class InvalidConfigError extends ClaudeIterateError {
  constructor(message: string) {
    super(`Invalid configuration: ${message}`);
    this.name = 'InvalidConfigError';
  }
}

/**
 * Claude execution error
 */
export class ClaudeExecutionError extends ClaudeIterateError {
  constructor(message: string, public exitCode?: number) {
    super(`Claude execution failed: ${message}`);
    this.name = 'ClaudeExecutionError';
  }
}

/**
 * File system error
 */
export class FileSystemError extends ClaudeIterateError {
  constructor(message: string, public path?: string) {
    super(message);
    this.name = 'FileSystemError';
  }
}
