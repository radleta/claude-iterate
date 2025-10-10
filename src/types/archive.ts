import { z } from 'zod';

/**
 * Archive metadata schema
 */
export const ArchiveMetadataSchema = z.object({
  originalName: z.string(),
  archiveName: z.string(),
  archivedAt: z.string().datetime(),
  archivedFrom: z.string(),
});

/**
 * Archive metadata type
 */
export type ArchiveMetadata = z.infer<typeof ArchiveMetadataSchema>;
