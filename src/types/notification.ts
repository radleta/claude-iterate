import { WorkspaceStatus } from './status.js';

/**
 * Notification event types
 */
export type NotificationEvent =
  | 'setup_complete'
  | 'execution_start'
  | 'iteration'
  | 'iteration_milestone'
  | 'completion'
  | 'error'
  | 'status_update'
  | 'all';

/**
 * Default notification events (enabled by default)
 */
export const DEFAULT_NOTIFY_EVENTS: NotificationEvent[] = [
  'iteration',
  'completion',
  'error',
  'status_update',
];

/**
 * Status change delta information
 */
export interface StatusDelta {
  progressChanged: boolean;
  completedDelta: number;
  totalDelta: number;
  completionStatusChanged: boolean;
  summaryChanged: boolean;
}

/**
 * Status changed event payload
 */
export interface StatusChangedEvent {
  previous: WorkspaceStatus | null;
  current: WorkspaceStatus;
  delta: StatusDelta;
  timestamp: Date;
}

/**
 * StatusFileWatcher options
 */
export interface StatusFileWatcherOptions {
  debounceMs?: number;
  notifyOnlyMeaningful?: boolean;
}
