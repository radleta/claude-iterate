import ndjson from 'ndjson';
import { ChildProcess } from 'child_process';
import { Logger } from './logger.js';

const logger = new Logger();

/**
 * Formatter for Claude CLI's --output-format stream-json output.
 * Parses NDJSON events and extracts tool usage for real-time visibility.
 * Enhanced formatting provides better spacing, complete information, and improved error context.
 */
export class StreamJsonFormatter {
  private static lastEventType: 'tool_use' | 'tool_result' | 'text' | null =
    null;

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

    // Reset state for new stream
    this.lastEventType = null;

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
        const text = textContent.text.trim();
        // Add blank line before text if after a tool result
        const needsBlankLine = this.lastEventType === 'tool_result';
        this.lastEventType = 'text';
        return needsBlankLine ? `\n\n📝 ${text}\n` : `\n📝 ${text}\n`;
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

    // Add leading blank line if we just finished a previous operation
    const needsBlankLine =
      this.lastEventType === 'tool_result' || this.lastEventType === 'text';
    this.lastEventType = 'tool_use';

    const parts: string[] = [];

    // Tool header
    parts.push(`🔧 ${toolName} tool`);

    // Add tool-specific parameters with proper indentation
    if (input.file_path) {
      parts.push(`   File: ${input.file_path}`);
    }

    if (input.command) {
      // Don't truncate commands - show full command
      const commandLines = input.command.split('\n');
      if (commandLines.length === 1) {
        parts.push(`   Command: ${input.command}`);
      } else {
        parts.push(`   Command:`);
        commandLines.forEach((line: string) => {
          parts.push(`     ${line}`);
        });
      }
    }

    if (input.pattern) {
      parts.push(`   Pattern: ${input.pattern}`);
    }

    if (input.path && !input.file_path) {
      parts.push(`   Path: ${input.path}`);
    }

    // For Edit tool, show old and new strings (NEVER truncate)
    if (toolName === 'Edit') {
      if (input.old_string) {
        const oldLines = input.old_string.split('\n');
        if (oldLines.length === 1 && input.old_string.length < 80) {
          parts.push(`   Replacing: "${input.old_string}"`);
        } else {
          parts.push(`   Searching for:`);
          // Show as indented block
          oldLines.forEach((line: string) => {
            parts.push(`     "${line}"`);
          });
        }
      }

      if (input.new_string) {
        const newLines = input.new_string.split('\n');
        if (newLines.length === 1 && input.new_string.length < 80) {
          parts.push(`   With: "${input.new_string}"`);
        } else {
          parts.push(`   Replacing with:`);
          newLines.forEach((line: string) => {
            parts.push(`     "${line}"`);
          });
        }
      }

      if (input.replace_all) {
        parts.push(`   Mode: Replace all occurrences`);
      }
    }

    // For Read tool, show range if specified
    if (toolName === 'Read') {
      if (input.offset !== undefined || input.limit !== undefined) {
        const start = input.offset || 0;
        const end = input.limit ? start + input.limit : 'end';
        parts.push(`   Range: Lines ${start}-${end}`);
      }
    }

    // For Write tool, show content size if available
    if (toolName === 'Write' && input.content) {
      const lines = input.content.split('\n').length;
      const bytes = new Blob([input.content]).size;
      const kb = (bytes / 1024).toFixed(1);
      parts.push(`   Content size: ${kb} KB (${lines} lines)`);
    }

    const result = parts.join('\n');
    return needsBlankLine ? `\n\n${result}\n` : `\n${result}\n`;
  }

  /**
   * Formats tool_result events (results from tool execution)
   *
   * Note: Uses 'any' type for dynamic tool result from Claude CLI
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static formatToolResult(result: any): string {
    this.lastEventType = 'tool_result';

    const content = result.content;
    const isError = result.is_error || false;

    // Extract content as string
    let contentStr = '';
    if (Array.isArray(content)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const textContent = content.find((c: any) => c.type === 'text');
      contentStr = textContent?.text || JSON.stringify(content);
    } else if (typeof content === 'string') {
      contentStr = content;
    } else {
      contentStr = JSON.stringify(content);
    }

    // Check if this looks like an error
    const hasErrorMarkers =
      isError ||
      contentStr.toLowerCase().includes('error') ||
      contentStr.toLowerCase().includes('failed') ||
      contentStr.toLowerCase().includes('tool_use_error') ||
      contentStr.toLowerCase().includes('not found');

    if (hasErrorMarkers) {
      return this.formatErrorResult(contentStr);
    } else {
      return this.formatSuccessResult(contentStr);
    }
  }

  /**
   * Format successful tool result with metadata
   */
  private static formatSuccessResult(content: string): string {
    const parts: string[] = [];

    // Try to detect what kind of result this is
    if (content.match(/^\s*\d+\s*→/m)) {
      // Read tool result with line numbers
      return this.formatReadResult(content);
    } else if (
      content.includes('Edit successful') ||
      content.includes('Replaced')
    ) {
      // Edit tool result
      parts.push(`✓ Edit successful`);
      if (content.match(/Line \d+/)) {
        const match = content.match(/Line (\d+)/);
        if (match) {
          parts.push(`   Location: Line ${match[1]}`);
        }
      }
      if (content.includes('occurrence')) {
        parts.push(`   ${content}`);
      }
    } else if (
      content.includes('File created') ||
      content.includes('File updated') ||
      content.includes('successfully')
    ) {
      // Write tool result
      return this.formatWriteResult(content);
    } else if (content.match(/exit code/i) || content.includes('Command')) {
      // Bash tool result
      return this.formatBashResult(content);
    } else {
      // Generic success
      parts.push(`✓ ${content.trim()}`);
    }

    return parts.join('\n') + '\n';
  }

  /**
   * Format error result (NEVER truncate errors!)
   */
  private static formatErrorResult(content: string): string {
    const parts: string[] = [];

    // Check for Edit tool "string not found" errors
    if (
      content.includes('String to replace not found') ||
      content.includes('not found in file')
    ) {
      parts.push(`❌ Edit failed: String not found in file`);
      parts.push('');
      parts.push(
        '   The search string was not found in the file. This could be because:'
      );
      parts.push('   - The string has already been changed');
      parts.push(
        "   - The string contains special characters that don't match exactly"
      );
      parts.push(
        "   - The line breaks or spacing differ from what's in the file"
      );
      parts.push('');
      parts.push(
        '   Tip: Use the Read tool to verify the current file content'
      );
    } else {
      // Generic error - show full content (never truncate!)
      parts.push(`❌ ${content}`);
    }

    return parts.join('\n') + '\n';
  }

  /**
   * Format Read tool result with line numbers and metadata
   */
  private static formatReadResult(content: string): string {
    const lines = content.split('\n');
    const parts: string[] = [];

    parts.push(`✓ Read successfully`);

    // Count lines with line numbers
    const lineMatches = lines.filter((l) => l.match(/^\s*\d+\s*→/));
    const totalLines = lineMatches.length;

    if (totalLines > 0) {
      const showCount = Math.min(totalLines, 15);
      parts.push(
        `   Showing ${showCount} line${showCount !== 1 ? 's' : ''}${totalLines > showCount ? ` (of ${totalLines} total)` : ''}:`
      );

      // Format with proper indentation and convert → to |
      const displayLines = lineMatches.slice(0, 15);
      displayLines.forEach((line) => {
        // Convert "  15→content" to "     15 | content"
        const match = line.match(/^\s*(\d+)\s*→(.*)$/);
        if (match && match[1]) {
          const lineNum = match[1].padStart(5, ' ');
          parts.push(`     ${lineNum} |${match[2] || ''}`);
        }
      });

      if (totalLines > 15) {
        parts.push(`   ... (${totalLines - 15} more lines)`);
      }
    } else {
      // No line numbers found, show raw content
      parts.push('   Content:');
      const contentLines = lines.slice(0, 10);
      contentLines.forEach((line) => {
        parts.push(`     ${line}`);
      });
      if (lines.length > 10) {
        parts.push(`   ... (${lines.length - 10} more lines)`);
      }
    }

    return parts.join('\n') + '\n';
  }

  /**
   * Format Write tool result
   */
  private static formatWriteResult(content: string): string {
    const parts: string[] = [];

    if (content.toLowerCase().includes('created')) {
      parts.push(`✓ File created successfully`);
    } else if (content.toLowerCase().includes('updated')) {
      parts.push(`✓ File updated successfully`);
    } else {
      parts.push(`✓ File written successfully`);
    }

    // Extract path if available
    const pathMatch = content.match(/(?:at|to|Path):\s*([^\n]+)/);
    if (pathMatch && pathMatch[1]) {
      parts.push(`   Path: ${pathMatch[1].trim()}`);
    }

    return parts.join('\n') + '\n';
  }

  /**
   * Format Bash tool result with exit code
   */
  private static formatBashResult(content: string): string {
    const parts: string[] = [];

    // Try to extract exit code
    const exitCodeMatch = content.match(/exit\s+code:?\s*(\d+)/i);
    const exitCode =
      exitCodeMatch && exitCodeMatch[1] ? parseInt(exitCodeMatch[1]) : 0;

    if (exitCode === 0) {
      parts.push(`✓ Command completed successfully`);
    } else {
      parts.push(`❌ Command failed`);
    }

    parts.push(`   Exit code: ${exitCode}`);

    // Show output (remove exit code line if present)
    const outputContent = content.replace(/exit\s+code:?\s*\d+/i, '').trim();
    if (outputContent) {
      const outputLines = outputContent.split('\n');
      parts.push(
        `   Output${outputLines.length > 1 ? ` (${outputLines.length} lines)` : ''}:`
      );

      // Show up to 20 lines
      const displayLines = outputLines.slice(0, 20);
      displayLines.forEach((line) => {
        parts.push(`     ${line}`);
      });

      if (outputLines.length > 20) {
        parts.push(`   ... (${outputLines.length - 20} more lines)`);
      }
    } else {
      parts.push(`   Output:`);
      parts.push(`     (empty)`);
    }

    return parts.join('\n') + '\n';
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
