/**
 * Zod Validation Schemas for Stream API
 */

import { z } from 'zod';

/**
 * Stream extraction query parameters
 */
export const extractQuerySchema = z.object({
  tmdbId: z.string().min(1, 'TMDB ID is required'),
  mediaType: z.enum(['movie', 'tv'], {
    message: 'Media type must be either "movie" or "tv"',
  }),
  season: z.coerce.number().int().min(1).optional(),
  episode: z.coerce.number().int().min(1).optional(),
}).refine(
  (data) => {
    // If mediaType is 'tv', season and episode are required
    if (data.mediaType === 'tv') {
      return data.season !== undefined && data.episode !== undefined;
    }
    return true;
  },
  {
    message: 'Season and episode are required for TV shows',
    path: ['season'],
  }
);

export type ExtractQuery = z.infer<typeof extractQuerySchema>;

/**
 * Validate query parameters from URL
 */
export function validateQuery<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams
): { success: true; data: T } | { success: false; error: string } {
  try {
    const params: Record<string, any> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const result = schema.safeParse(params);
    
    if (!result.success) {
      const errors = result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: errors };
    }

    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: 'Invalid query parameters' };
  }
}
