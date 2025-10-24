import { z } from 'zod';
import { ExecutionMode } from './mode.js';

/**
 * Workspace configuration overrides schema
 * Optional per-workspace config that overrides project/user defaults
 */
export const WorkspaceConfigSchema = z
  .object({
    verification: z
      .object({
        depth: z.enum(['quick', 'standard', 'deep']).optional(),
        autoVerify: z.boolean().optional(),
        resumeOnFail: z.boolean().optional(),
        maxAttempts: z.number().int().min(1).max(10).optional(),
        reportFilename: z.string().optional(),
        notifyOnVerification: z.boolean().optional(),
      })
      .optional(),
    outputLevel: z.enum(['quiet', 'progress', 'verbose']).optional(),
    claude: z
      .object({
        command: z.string().optional(),
        args: z.array(z.string()).optional(),
      })
      .optional(),
  })
  .optional();

export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;

/**
 * Metadata schema for workspace state tracking
 */
export const MetadataSchema = z.object({
  // === STATE TRACKING (system-managed) ===
  name: z.string().min(1, 'Workspace name is required'),
  created: z.string().datetime(),
  lastRun: z.string().datetime().optional(),
  status: z.enum(['in_progress', 'completed', 'error']).default('in_progress'),
  totalIterations: z.number().int().min(0).default(0),
  setupIterations: z.number().int().min(0).default(0),
  executionIterations: z.number().int().min(0).default(0),

  // === EXECUTION CONFIG (backward compat - kept at top level) ===
  mode: z.nativeEnum(ExecutionMode).default(ExecutionMode.LOOP),
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
        'status_update',
        'all',
      ])
    )
    .default(['all']),

  // === VERIFICATION TRACKING (state) ===
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

  // === WORKSPACE CONFIG OVERRIDES (opt-in) ===
  config: WorkspaceConfigSchema,
});

export type Metadata = z.infer<typeof MetadataSchema>;
