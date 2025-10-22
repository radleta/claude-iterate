import ndjson from 'ndjson';
import { ChildProcess } from 'child_process';
import { Logger } from './logger.js';

const logger = new Logger();

/**
 * Formatter for Claude CLI's --output-format stream-json output.
 * Parses NDJSON events and extracts tool usage for real-time visibility.
 */
export class StreamJsonFormatter {
  /**
   * Attaches to a child process stdout and parses stream-json events.
   *
   * @param child - The spawned Claude CLI child process
   * @param callbacks - Event handlers for tool events and errors
   */
  static attach(
    child: ChildProcess,
    callbacks: {
      onToolEvent?: (formatted: string) => void;
      onError?: (err: Error) => void;
    }
  ): void {
    if (!child.stdout) {
      logger.debug('StreamJsonFormatter: No stdout to attach', true);
      return;
    }

    child.stdout
      .pipe(ndjson.parse({ strict: false }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('data', (obj: any) => {
        const formatted = this.formatEvent(obj);
        if (formatted && callbacks.onToolEvent) {
          callbacks.onToolEvent(formatted);
        }
      })
      .on('error', (err: Error) => {
        // Don't crash on parse errors, just log and continue
        logger.debug(`StreamJsonFormatter parse error: ${err.message}`, true);
        if (callbacks.onError) {
          callbacks.onError(err);
        }
      });
  }

  /**
   * Formats a stream-json event into a human-readable string.
   * Returns null if event is not interesting (no tool use/result).
   *
   * Note: Uses 'any' type for dynamic NDJSON data from Claude CLI
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static formatEvent(obj: any): string | null {
    // Tool use event - Claude is calling a tool
    if (obj.type === 'assistant' && obj.message?.content) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolUse = obj.message.content.find(
        (c: any) => c.type === 'tool_use'
      );
      if (toolUse) {
        return this.formatToolUse(toolUse);
      }

      // Text response - Claude's thinking/explanation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const textContent = obj.message.content.find(
        (c: any) => c.type === 'text'
      );
      if (textContent?.text) {
        return `📝 ${textContent.text.trim()}`;
      }
    }

    // Tool result event - Result from tool execution
    if (obj.type === 'user' && obj.message?.content) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = obj.message.content.find(
        (c: any) => c.type === 'tool_result'
      );
      if (result) {
        return this.formatToolResult(result);
      }
    }

    return null;
  }

  /**
   * Formats tool_use events (Claude calling a tool)
   *
   * Note: Uses 'any' type for dynamic tool input from Claude CLI
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static formatToolUse(toolUse: any): string {
    const toolName = toolUse.name || 'Unknown';
    const input = toolUse.input || {};

    let msg = `🔧 Using ${toolName} tool`;

    // Add relevant input details based on tool type
    if (input.file_path) {
      msg += `\n   File: ${input.file_path}`;
    }
    if (input.command) {
      // Truncate long commands
      const cmd =
        input.command.length > 80
          ? input.command.substring(0, 80) + '...'
          : input.command;
      msg += `\n   Command: ${cmd}`;
    }
    if (input.pattern) {
      msg += `\n   Pattern: ${input.pattern}`;
    }
    if (input.old_string && toolName === 'Edit') {
      const preview =
        input.old_string.length > 50
          ? input.old_string.substring(0, 50) + '...'
          : input.old_string;
      msg += `\n   Replacing: "${preview}"`;
    }

    return msg;
  }

  /**
   * Formats tool_result events (results from tool execution)
   *
   * Note: Uses 'any' type for dynamic tool result from Claude CLI
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static formatToolResult(result: any): string {
    const content = result.content;

    // Handle array content (multiple content blocks)
    if (Array.isArray(content)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const textContent = content.find((c: any) => c.type === 'text');
      if (textContent?.text) {
        return this.formatResultText(textContent.text);
      }
    }

    // Handle string content
    if (typeof content === 'string') {
      return this.formatResultText(content);
    }

    // Handle object content
    if (typeof content === 'object') {
      return this.formatResultText(JSON.stringify(content));
    }

    return '✓ Tool executed';
  }

  /**
   * Formats tool result text (truncate if too long)
   */
  private static formatResultText(text: string): string {
    const truncated = text.length > 100 ? text.substring(0, 100) + '...' : text;

    // Check for error patterns
    if (
      text.toLowerCase().includes('error') ||
      text.toLowerCase().includes('failed')
    ) {
      return `❌ ${truncated}`;
    }

    return `✓ ${truncated}`;
  }

  /**
   * Extracts the final result from a stream-json event.
   * The Claude CLI emits a final result event with the complete response.
   *
   * Note: Uses 'any' type for dynamic NDJSON data from Claude CLI
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static extractFinalResult(obj: any): string | null {
    if (obj.type === 'result' && obj.result) {
      return obj.result;
    }
    return null;
  }
}
