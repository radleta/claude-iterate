import { describe, it, expect, vi } from 'vitest';
import { StreamJsonFormatter } from '../../src/utils/stream-json-formatter.js';
import { Readable } from 'stream';
import { ChildProcess } from 'child_process';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: Test file uses 'any' for dynamic test data structures

describe('StreamJsonFormatter', () => {
  describe('formatEvent', () => {
    it('should format tool_use event for Read tool', () => {
      const event = {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Read',
              input: {
                file_path: '/workspace/repo/TODO.md',
              },
            },
          ],
        },
      };

      // Access private method via any cast for testing
      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toContain('🔧 Using Read tool');
      expect(formatted).toContain('File: /workspace/repo/TODO.md');
    });

    it('should format tool_use event for Write tool', () => {
      const event = {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Write',
              input: {
                file_path: '/workspace/repo/test.txt',
                content: 'Hello World',
              },
            },
          ],
        },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toContain('🔧 Using Write tool');
      expect(formatted).toContain('File: /workspace/repo/test.txt');
    });

    it('should format tool_use event for Bash tool', () => {
      const event = {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Bash',
              input: {
                command: 'npm test',
              },
            },
          ],
        },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toContain('🔧 Using Bash tool');
      expect(formatted).toContain('Command: npm test');
    });

    it('should format tool_use event for Edit tool', () => {
      const event = {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Edit',
              input: {
                file_path: '/workspace/repo/TODO.md',
                old_string: '- [ ] Task 1',
                new_string: '- [x] Task 1',
              },
            },
          ],
        },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toContain('🔧 Using Edit tool');
      expect(formatted).toContain('File: /workspace/repo/TODO.md');
      expect(formatted).toContain('Replacing: "- [ ] Task 1"');
    });

    it('should format tool_use event for Grep tool', () => {
      const event = {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Grep',
              input: {
                pattern: 'TODO',
                path: '/workspace/repo',
              },
            },
          ],
        },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toContain('🔧 Using Grep tool');
      expect(formatted).toContain('Pattern: TODO');
    });

    it('should truncate long commands', () => {
      const longCommand = 'a'.repeat(100);
      const event = {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Bash',
              input: { command: longCommand },
            },
          ],
        },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toContain('...');
      expect(formatted.length).toBeLessThan(longCommand.length + 50);
    });

    it('should truncate long old_string in Edit tool', () => {
      const longString = 'x'.repeat(100);
      const event = {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Edit',
              input: {
                file_path: '/test.txt',
                old_string: longString,
                new_string: 'replacement',
              },
            },
          ],
        },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toContain('...');
      expect(formatted).toContain('Replacing:');
    });

    it('should format tool_result success', () => {
      const event = {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              content: 'File read successfully: 45 lines',
            },
          ],
        },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toContain('✓');
      expect(formatted).toContain('File read successfully');
    });

    it('should format tool_result error', () => {
      const event = {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              content: 'Error: File not found',
            },
          ],
        },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toContain('❌');
      expect(formatted).toContain('Error: File not found');
    });

    it('should format tool_result with array content', () => {
      const event = {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              content: [
                {
                  type: 'text',
                  text: 'Operation completed successfully',
                },
              ],
            },
          ],
        },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toContain('✓');
      expect(formatted).toContain('Operation completed successfully');
    });

    it('should truncate long tool results', () => {
      const longResult = 'x'.repeat(150);
      const event = {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              content: longResult,
            },
          ],
        },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toContain('...');
      expect(formatted.length).toBeLessThan(longResult.length);
    });

    it('should format text response', () => {
      const event = {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'text',
              text: "I've completed the task successfully",
            },
          ],
        },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toContain('📝');
      expect(formatted).toContain("I've completed the task successfully");
    });

    it('should return null for non-tool events', () => {
      const event = {
        type: 'metadata',
        data: { foo: 'bar' },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toBeNull();
    });

    it('should return null for empty content', () => {
      const event = {
        type: 'assistant',
        message: {
          content: [],
        },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toBeNull();
    });
  });

  describe('attach', () => {
    it('should parse NDJSON stream and emit tool events', async () => {
      const mockStdout = new Readable({
        read() {},
      });

      const mockChild = {
        stdout: mockStdout,
      } as unknown as ChildProcess;

      const toolEvents: string[] = [];
      const onToolEvent = vi.fn((msg: string) => {
        toolEvents.push(msg);
      });

      StreamJsonFormatter.attach(mockChild, { onToolEvent });

      // Emit NDJSON lines
      mockStdout.push(
        '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Read","input":{"file_path":"/test.txt"}}]}}\n'
      );
      mockStdout.push(
        '{"type":"user","message":{"content":[{"type":"tool_result","content":"Success"}]}}\n'
      );
      mockStdout.push(null); // End stream

      // Wait for stream to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onToolEvent).toHaveBeenCalledTimes(2);
      expect(toolEvents[0]).toContain('Using Read tool');
      expect(toolEvents[1]).toContain('✓ Success');
    });

    it('should handle malformed JSON gracefully', async () => {
      const mockStdout = new Readable({
        read() {},
      });

      const mockChild = {
        stdout: mockStdout,
      } as unknown as ChildProcess;

      const errors: Error[] = [];
      const onError = vi.fn((err: Error) => {
        errors.push(err);
      });

      const toolEvents: string[] = [];
      const onToolEvent = vi.fn((msg: string) => {
        toolEvents.push(msg);
      });

      StreamJsonFormatter.attach(mockChild, { onError, onToolEvent });

      // Emit malformed JSON
      mockStdout.push('not valid json\n');
      // Valid JSON but ignored event type
      mockStdout.push('{"valid":"json","type":"metadata"}\n');
      // Valid tool event
      mockStdout.push(
        '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Write","input":{"file_path":"/test.txt"}}]}}\n'
      );
      mockStdout.push(null);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // ndjson parser with strict: false may not trigger errors for malformed lines
      // The key behavior is that it doesn't crash and continues processing
      // So we just verify valid events were processed
      expect(toolEvents.length).toBeGreaterThan(0);
      expect(toolEvents[0]).toContain('Using Write tool');
    });

    it('should handle no stdout gracefully', () => {
      const mockChild = {
        stdout: null,
      } as unknown as ChildProcess;

      const onToolEvent = vi.fn();

      // Should not throw
      expect(() => {
        StreamJsonFormatter.attach(mockChild, { onToolEvent });
      }).not.toThrow();

      expect(onToolEvent).not.toHaveBeenCalled();
    });
  });

  describe('extractFinalResult', () => {
    it('should extract result from result event', () => {
      const event = {
        type: 'result',
        result: 'Final response from Claude',
      };

      const result = StreamJsonFormatter.extractFinalResult(event);

      expect(result).toBe('Final response from Claude');
    });

    it('should return null for non-result events', () => {
      const event = {
        type: 'assistant',
        message: { content: [] },
      };

      const result = StreamJsonFormatter.extractFinalResult(event);

      expect(result).toBeNull();
    });

    it('should return null for result event without result field', () => {
      const event = {
        type: 'result',
      };

      const result = StreamJsonFormatter.extractFinalResult(event);

      expect(result).toBeNull();
    });
  });
});
