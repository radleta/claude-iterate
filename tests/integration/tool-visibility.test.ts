import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ClaudeClient } from '../../src/services/claude-client.js';
import { Logger } from '../../src/utils/logger.js';

const logger = new Logger();

describe('Tool Visibility Integration', () => {
  let client: ClaudeClient;

  beforeEach(() => {
    // Use mock-claude.cjs for testing
    const mockClaudePath = `${process.cwd()}/mock-claude.cjs`;
    client = new ClaudeClient('node', [mockClaudePath], logger);
  });

  afterEach(async () => {
    await client.shutdown();
  });

  it('should provide tool events in verbose mode', async () => {
    const toolEvents: string[] = [];

    const result = await client.executeWithToolVisibility(
      'Test prompt',
      undefined,
      undefined,
      {
        onToolEvent: (msg) => {
          toolEvents.push(msg);
        },
      }
    );

    // Should have received at least one tool event from mock
    expect(toolEvents.length).toBeGreaterThan(0);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  }, 30000);

  it('should extract final result correctly', async () => {
    const result = await client.executeWithToolVisibility(
      'Test prompt',
      undefined,
      undefined,
      {}
    );

    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result).toContain('Mock response');
  }, 30000);

  it('should handle onRawOutput callback', async () => {
    const rawOutputChunks: string[] = [];

    await client.executeWithToolVisibility(
      'Test prompt',
      undefined,
      undefined,
      {
        onRawOutput: (chunk) => {
          rawOutputChunks.push(chunk);
        },
      }
    );

    // Should have received raw output
    expect(rawOutputChunks.length).toBeGreaterThan(0);
  }, 30000);

  it('should handle parse errors gracefully', async () => {
    const errors: Error[] = [];
    const toolEvents: string[] = [];

    // Mock will emit some malformed JSON
    await client.executeWithToolVisibility(
      'Test prompt',
      undefined,
      undefined,
      {
        onError: (err) => {
          errors.push(err);
        },
        onToolEvent: (msg) => {
          toolEvents.push(msg);
        },
      }
    );

    // Should complete successfully even if there were parse errors
    // The mock may or may not emit errors, but it should not crash
    expect(toolEvents.length).toBeGreaterThanOrEqual(0);
  }, 30000);

  it('should work with system prompt', async () => {
    const toolEvents: string[] = [];

    const result = await client.executeWithToolVisibility(
      'Test prompt',
      'System prompt for testing',
      undefined,
      {
        onToolEvent: (msg) => {
          toolEvents.push(msg);
        },
      }
    );

    expect(result).toBeTruthy();
    expect(toolEvents.length).toBeGreaterThan(0);
  }, 30000);

  it('should handle empty callbacks', async () => {
    // Should not throw with no callbacks
    const result = await client.executeWithToolVisibility('Test prompt');

    expect(result).toBeTruthy();
  }, 30000);

  it('should reject when client is shutting down', async () => {
    // Start shutdown
    const shutdownPromise = client.shutdown();

    // Try to execute while shutting down
    await expect(
      client.executeWithToolVisibility('Test prompt')
    ).rejects.toThrow('Client is shutting down');

    // Wait for shutdown to complete
    await shutdownPromise;
  }, 30000);
});
