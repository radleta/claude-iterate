import { z } from 'zod';

/**
 * Template metadata schema (.template.json)
 */
export const TemplateMetadataSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  version: z.string().optional(),
  tags: z.array(z.string()).default([]),
  estimatedIterations: z.number().int().min(1).optional(),
  author: z.string().optional(),
  created: z.string().datetime().optional(),
});

export type TemplateMetadata = z.infer<typeof TemplateMetadataSchema>;

/**
 * Template structure
 */
export interface Template {
  name: string;
  path: string;
  instructionsPath: string;
  readmePath?: string;
  metadata?: TemplateMetadata;
  source: 'project' | 'global';
}

/**
 * Template list item for display
 */
export interface TemplateListItem {
  name: string;
  description?: string;
  source: 'project' | 'global';
  tags: string[];
  estimatedIterations?: number;
}
