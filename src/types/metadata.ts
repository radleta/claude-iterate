import { z } from 'zod';

/**
 * Metadata schema for workspace state tracking
 */
export const MetadataSchema = z.object({
  name: z.string().min(1, 'Workspace name is required'),
  created: z.string().datetime(),
  lastRun: z.string().datetime().optional(),
  status: z.enum(['in_progress', 'completed', 'error']).default('in_progress'),
  totalIterations: z.number().int().min(0).default(0),
  setupIterations: z.number().int().min(0).default(0),
  executionIterations: z.number().int().min(0).default(0),
  setupComplete: z.boolean().default(false),
  instructionsFile: z.string().default('INSTRUCTIONS.md'),
  completionMarkers: z.array(z.string()).default([
    'Remaining: 0',
    '**Remaining**: 0',
    'TASK COMPLETE',
    '✅ TASK COMPLETE',
  ]),
  maxIterations: z.number().int().min(1).default(50),
  delay: z.number().int().min(0).default(2),
  notifyUrl: z.string().url().optional(),
  notifyEvents: z.array(z.enum(['setup_complete', 'execution_start', 'iteration_milestone', 'completion', 'error', 'all'])).optional(),
});

export type Metadata = z.infer<typeof MetadataSchema>;

/**
 * Workspace status enum
 */
export enum WorkspaceStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ERROR = 'error',
}

/**
 * Notification event types
 */
export enum NotifyEvent {
  SETUP_COMPLETE = 'setup_complete',
  EXECUTION_START = 'execution_start',
  ITERATION_MILESTONE = 'iteration_milestone',
  COMPLETION = 'completion',
  ERROR = 'error',
  ALL = 'all',
}
