import { Logger } from '../utils/logger.js';
import { Metadata } from '../types/metadata.js';

/**
 * Notification options for HTTP POST
 */
export interface NotificationOptions {
  url: string;
  title?: string;
  priority?: 'low' | 'default' | 'high' | 'urgent';
  tags?: string[];
}

/**
 * Service for sending notifications via HTTP POST (ntfy.sh compatible)
 */
export class NotificationService {
  constructor(
    private logger?: Logger,
    private verbose: boolean = false
  ) {}

  /**
   * Send notification via HTTP POST
   */
  async send(message: string, options: NotificationOptions): Promise<boolean> {
    try {
      const response = await fetch(options.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          ...(options.title && { Title: options.title }),
          ...(options.priority && { Priority: options.priority }),
          ...(options.tags && { Tags: options.tags.join(',') }),
        },
        body: message,
      });

      if (!response.ok) {
        this.logger?.warn(
          `Notification failed: ${response.status} ${response.statusText}`
        );
        return false;
      }

      this.logger?.debug('Notification sent successfully', this.verbose);
      return true;
    } catch (error) {
      this.logger?.warn(`Notification error: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Check if notifications are configured
   */
  isConfigured(metadata: Metadata): boolean {
    return !!metadata.notifyUrl && metadata.notifyUrl.trim().length > 0;
  }

  /**
   * Should notify for this event
   */
  shouldNotify(event: string, metadata: Metadata): boolean {
    if (!metadata.notifyEvents || metadata.notifyEvents.length === 0) {
      // Default events: iteration, completion, error, and status_update
      return ['iteration', 'completion', 'error', 'status_update'].includes(
        event
      );
    }

    // Check if 'all' is specified
    if (metadata.notifyEvents.includes('all')) {
      return true;
    }

    // Check if specific event is enabled
    return metadata.notifyEvents.includes(
      event as
        | 'setup_complete'
        | 'execution_start'
        | 'iteration'
        | 'iteration_milestone'
        | 'completion'
        | 'error'
        | 'status_update'
        | 'all'
    );
  }
}
