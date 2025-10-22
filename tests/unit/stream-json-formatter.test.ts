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

      expect(formatted).toContain('🔧 Read tool');
      expect(formatted).toContain('   File: /workspace/repo/TODO.md');
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

      expect(formatted).toContain('🔧 Write tool');
      expect(formatted).toContain('   File: /workspace/repo/test.txt');
      expect(formatted).toContain('   Content size:');
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

      expect(formatted).toContain('🔧 Bash tool');
      expect(formatted).toContain('   Command: npm test');
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

      expect(formatted).toContain('🔧 Edit tool');
      expect(formatted).toContain('   File: /workspace/repo/TODO.md');
      expect(formatted).toContain('   Replacing: "- [ ] Task 1"');
      expect(formatted).toContain('   With: "- [x] Task 1"');
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

      expect(formatted).toContain('🔧 Grep tool');
      expect(formatted).toContain('   Pattern: TODO');
      expect(formatted).toContain('   Path: /workspace/repo');
    });

    it('should format multi-line commands with proper indentation', () => {
      const multiLineCommand = 'echo "line 1"\necho "line 2"\necho "line 3"';
      const event = {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Bash',
              input: { command: multiLineCommand },
            },
          ],
        },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toContain('🔧 Bash tool');
      expect(formatted).toContain('   Command:');
      expect(formatted).toContain('     echo "line 1"');
      expect(formatted).toContain('     echo "line 2"');
      expect(formatted).toContain('     echo "line 3"');
    });

    it('should format multi-line Edit strings without truncation', () => {
      const multiLineString = 'line 1\nline 2\nline 3';
      const event = {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Edit',
              input: {
                file_path: '/test.txt',
                old_string: multiLineString,
                new_string: 'replacement\ntext',
              },
            },
          ],
        },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toContain('🔧 Edit tool');
      expect(formatted).toContain('   Searching for:');
      expect(formatted).toContain('     "line 1"');
      expect(formatted).toContain('     "line 2"');
      expect(formatted).toContain('     "line 3"');
      expect(formatted).toContain('   Replacing with:');
      expect(formatted).toContain('     "replacement"');
      expect(formatted).toContain('     "text"');
    });

    it('should format tool_result success with generic message', () => {
      const event = {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              content: 'Operation completed',
            },
          ],
        },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toContain('✓');
      expect(formatted).toContain('Operation completed');
    });

    it('should format tool_result error with full message', () => {
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
                  text: 'Operation completed',
                },
              ],
            },
          ],
        },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toContain('✓');
      expect(formatted).toContain('Operation completed');
    });

    it('should format Read result with line numbers', () => {
      const readResult = '     1→# Header\n     2→\n     3→Content line';
      const event = {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              content: readResult,
            },
          ],
        },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toContain('✓ Read successfully');
      expect(formatted).toContain('Showing');
      expect(formatted).toContain('|'); // Line number separator
      expect(formatted).toMatch(/\d+ \|/); // Format: "  15 | content"
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

    it('should format Edit failure with helpful tips', () => {
      const event = {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              content: 'String to replace not found in file',
            },
          ],
        },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toContain('❌ Edit failed: String not found in file');
      expect(formatted).toContain('Tip: Use the Read tool');
    });

    it('should format Bash result with exit code', () => {
      const event = {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              content: 'Command output\nexit code: 0',
            },
          ],
        },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toContain('✓ Command completed successfully');
      expect(formatted).toContain('Exit code: 0');
      expect(formatted).toContain('Output');
    });

    it('should format Write result with success message', () => {
      const event = {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              content: 'File created successfully at: /test.txt',
            },
          ],
        },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(event);

      expect(formatted).toContain('✓ File created successfully');
    });

    it('should add blank lines between operations when state changes', () => {
      // Reset state before this test
      (StreamJsonFormatter as any).lastEventType = null;

      // First operation: tool_use
      const toolUseEvent = {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Read',
              input: { file_path: '/test.txt' },
            },
          ],
        },
      };

      const firstFormatted = (StreamJsonFormatter as any).formatEvent(
        toolUseEvent
      );
      expect(firstFormatted).toContain('🔧 Read tool');
      expect(firstFormatted?.startsWith('\n\n')).toBe(false); // First operation, no double blank line

      // Second operation: tool_result
      const toolResultEvent = {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              content: 'Success',
            },
          ],
        },
      };

      const secondFormatted = (StreamJsonFormatter as any).formatEvent(
        toolResultEvent
      );
      expect(secondFormatted).toContain('✓');

      // Third operation: tool_use (should have blank line after tool_result)
      const thirdFormatted = (StreamJsonFormatter as any).formatEvent(
        toolUseEvent
      );
      expect(thirdFormatted?.startsWith('\n\n')).toBe(true); // Should have blank line
    });

    it('should add blank line before text response after tool_result', () => {
      // Tool result
      const toolResultEvent = {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              content: 'Success',
            },
          ],
        },
      };

      (StreamJsonFormatter as any).formatEvent(toolResultEvent);

      // Text response after tool_result
      const textEvent = {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'text',
              text: 'Now let me do the next step',
            },
          ],
        },
      };

      const formatted = (StreamJsonFormatter as any).formatEvent(textEvent);
      expect(formatted).toContain('📝');
      expect(formatted?.startsWith('\n\n')).toBe(true); // Should have blank line
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
      expect(toolEvents[0]).toContain('Read tool');
      expect(toolEvents[1]).toContain('✓');
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
      expect(toolEvents[0]).toContain('Write tool');
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
