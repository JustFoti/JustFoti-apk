/**
 * Zod Validation Schemas for Analytics API
 */

import { z } from 'zod';

/**
 * Event type enum
 */
const eventTypeSchema = z.enum([
  'page_view',
  'search',
  'content_view',
  'play',
  'pause',
  'seek',
  'complete',
]);

/**
 * Base analytics event schema
 */
export const analyticsEventSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  timestamp: z.number().int().positive(),
  eventType: eventTypeSchema,
  metadata: z.record(z.string(), z.any()),
});

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

/**
 * Batch event tracking request
 */
export const trackEventsSchema = z.object({
  events: z.array(analyticsEventSchema).min(1).max(50),
});

export type TrackEventsRequest = z.infer<typeof trackEventsSchema>;

/**
 * Metrics query parameters
 */
export const metricsQuerySchema = z.object({
  range: z.enum(['24h', '7d', '30d', '90d']).optional().default('7d'),
});

export type MetricsQuery = z.infer<typeof metricsQuerySchema>;

/**
 * Export query parameters
 */
export const exportQuerySchema = z.object({
  format: z.enum(['csv', 'json']).optional().default('json'),
  type: z.enum(['events', 'metrics', 'content']).optional().default('events'),
  start: z.string().optional(),
  end: z.string().optional(),
});

export type ExportQuery = z.infer<typeof exportQuerySchema>;

/**
 * Validate request body
 */
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: any
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.safeParse(body);
    
    if (!result.success) {
      const errors = result.error.issues
        .map((e: any) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      return { success: false, error: errors };
    }

    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: 'Invalid request body' };
  }
}

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
      const errors = result.error.issues
        .map((e: any) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      return { success: false, error: errors };
    }

    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: 'Invalid query parameters' };
  }
}
