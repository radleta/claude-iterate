import { z } from 'zod';

/**
 * Workspace status schema for machine-readable progress tracking
 * Supports two formats:
 * - Loop mode: Uses progress.completed/total for explicit tracking
 * - Iterative mode: Uses worked flag to indicate if work was done
 */
export const WorkspaceStatusSchema = z.object({
  complete: z.boolean(),
  // Loop mode fields
  progress: z.object({
    completed: z.number().int().min(0),
    total: z.number().int().min(0),
  }).optional(),
  // Iterative mode fields
  worked: z.boolean().optional(),
  // Common fields
  summary: z.string().optional(),
  lastUpdated: z.string().datetime().optional(),
  phase: z.string().optional(),
  blockers: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export type WorkspaceStatus = z.infer<typeof WorkspaceStatusSchema>;

/**
 * Default status when file doesn't exist (loop mode format)
 */
export const DEFAULT_STATUS: WorkspaceStatus = {
  complete: false,
  progress: {
    completed: 0,
    total: 0,
  },
};
