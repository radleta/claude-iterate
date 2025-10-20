import { z } from 'zod';
import { ExecutionMode } from './mode.js';

/**
 * Metadata schema for workspace state tracking
 */
export const MetadataSchema = z.object({
  name: z.string().min(1, 'Workspace name is required'),
  created: z.string().datetime(),
  lastRun: z.string().datetime().optional(),
  status: z.enum(['in_progress', 'completed', 'error']).default('in_progress'),
  mode: z.nativeEnum(ExecutionMode).default(ExecutionMode.LOOP),
  totalIterations: z.number().int().min(0).default(0),
  setupIterations: z.number().int().min(0).default(0),
  executionIterations: z.number().int().min(0).default(0),
  maxIterations: z.number().int().min(1).default(50),
  delay: z.number().int().min(0).default(2),
  stagnationThreshold: z.number().int().min(0).default(2),
  notifyUrl: z.string().url().optional(),
  notifyEvents: z
    .array(
      z.enum([
        'setup_complete',
        'execution_start',
        'iteration',
        'iteration_milestone',
        'completion',
        'error',
        'all',
      ])
    )
    .optional(),
  verification: z
    .object({
      verificationAttempts: z.number().int().min(0).default(0),
      lastVerificationStatus: z
        .enum(['pass', 'fail', 'needs_review', 'not_run'])
        .default('not_run'),
      lastVerificationTime: z.string().datetime().optional(),
      verifyResumeCycles: z.number().int().min(0).default(0),
    })
    .optional(),
});

export type Metadata = z.infer<typeof MetadataSchema>;
