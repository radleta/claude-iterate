import { vi } from 'vitest';
import { ClaudeClient } from '../../src/services/claude-client.js';
import { Logger } from '../../src/utils/logger.js';

/**
 * Mock Claude client for testing
 */
export class MockClaudeClient extends ClaudeClient {
  // Track calls
  public interactiveCalls: Array<{ prompt: string; cwd?: string }> = [];
  public nonInteractiveCalls: Array<{ prompt: string; cwd?: string }> = [];

  // Mock responses
  private interactiveResponses: Array<() => Promise<void>> = [];
  private nonInteractiveResponses: Array<() => Promise<string>> = [];

  constructor() {
    // Create a mock logger that doesn't output
    const mockLogger = new Logger(false);
    super('mock-claude', [], mockLogger);
  }

  /**
   * Mock interactive execution
   */
  override async executeInteractive(prompt: string, cwd?: string): Promise<void> {
    this.interactiveCalls.push({ prompt, cwd });

    // Execute next queued response or do nothing
    const response = this.interactiveResponses.shift();
    if (response) {
      await response();
    }
  }

  /**
   * Mock non-interactive execution
   */
  override async executeNonInteractive(prompt: string, cwd?: string): Promise<string> {
    this.nonInteractiveCalls.push({ prompt, cwd });

    // Return next queued response or default
    const response = this.nonInteractiveResponses.shift();
    if (response) {
      return await response();
    }

    return 'Mock Claude response';
  }

  /**
   * Mock Claude availability check
   */
  override async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * Mock version check
   */
  override async getVersion(): Promise<string | null> {
    return '1.0.0-mock';
  }

  /**
   * Queue interactive response
   */
  queueInteractiveResponse(fn: () => Promise<void>): void {
    this.interactiveResponses.push(fn);
  }

  /**
   * Queue non-interactive response
   */
  queueNonInteractiveResponse(fn: () => Promise<string>): void {
    this.nonInteractiveResponses.push(fn);
  }

  /**
   * Reset mock state
   */
  reset(): void {
    this.interactiveCalls = [];
    this.nonInteractiveCalls = [];
    this.interactiveResponses = [];
    this.nonInteractiveResponses = [];
  }
}

/**
 * Create mock Claude client
 */
export function createMockClaudeClient(): MockClaudeClient {
  return new MockClaudeClient();
}

/**
 * Spy on ClaudeClient constructor
 */
export function spyOnClaudeClient() {
  const mock = createMockClaudeClient();

  vi.spyOn(ClaudeClient.prototype, 'executeInteractive').mockImplementation(
    (prompt: string, cwd?: string) => mock.executeInteractive(prompt, cwd)
  );

  vi.spyOn(ClaudeClient.prototype, 'executeNonInteractive').mockImplementation(
    (prompt: string, cwd?: string) => mock.executeNonInteractive(prompt, cwd)
  );

  vi.spyOn(ClaudeClient.prototype, 'isAvailable').mockImplementation(
    () => mock.isAvailable()
  );

  vi.spyOn(ClaudeClient.prototype, 'getVersion').mockImplementation(
    () => mock.getVersion()
  );

  return mock;
}
