/**
 * Video Stream Extractor Service
 * Handles extraction of video stream URLs from various sources
 */

import type { VideoData, StreamSource, SubtitleTrack } from '@/types/media';
import type { APIResponse, RequestConfig } from '@/types/api';
import { cacheManager, CACHE_DURATIONS, generateCacheKey } from '@/lib/utils/cache';
import { APIErrorHandler, fetchWithTimeout, createAPIError } from '@/lib/utils/error-handler';

/**
 * Get extractor service URL from environment
 */
function getExtractorURL(): string {
  return process.env.NEXT_PUBLIC_VM_EXTRACTOR_URL || 'http://35.188.123.210:3001';
}

/**
 * Transform extractor response to VideoData
 */
function transformToVideoData(data: any): VideoData {
  const sources: StreamSource[] = [];
  const subtitles: SubtitleTrack[] = [];

  // Parse sources
  if (data.sources && Array.isArray(data.sources)) {
    data.sources.forEach((source: any) => {
      sources.push({
        url: source.url || source.file,
        quality: source.quality || 'auto',
        type: source.type || (source.url?.includes('.m3u8') ? 'hls' : 'mp4'),
      });
    });
  } else if (data.source) {
    // Single source format
    sources.push({
      url: data.source,
      quality: 'auto',
      type: data.source.includes('.m3u8') ? 'hls' : 'mp4',
    });
  }

  // Parse subtitles
  if (data.subtitles && Array.isArray(data.subtitles)) {
    data.subtitles.forEach((subtitle: any) => {
      subtitles.push({
        label: subtitle.label || subtitle.lang || 'Unknown',
        language: subtitle.language || subtitle.lang || 'en',
        url: subtitle.url || subtitle.file,
      });
    });
  }

  return {
    sources,
    subtitles,
    poster: data.poster,
    duration: data.duration,
  };
}

/**
 * Make a request to the extractor service
 */
async function extractorRequest<T>(
  endpoint: string,
  params: Record<string, any> = {},
  config: RequestConfig = {}
): Promise<APIResponse<T>> {
  const baseURL = getExtractorURL();
  const url = new URL(`${baseURL}${endpoint}`);

  // Add query params
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value.toString());
    }
  });

  // Check cache if enabled
  if (config.cache !== false) {
    const cacheKey = generateCacheKey(`extractor:${endpoint}`, params);
    const cached = await cacheManager.get<T>(cacheKey);
    if (cached) {
      return {
        data: cached,
        cached: true,
        timestamp: Date.now(),
      };
    }
  }

  // Make request with retry logic
  try {
    const data = await APIErrorHandler.executeWithRetry(async () => {
      const response = await fetchWithTimeout(
        url.toString(),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        config.timeout || 30000 // 30s timeout for stream extraction
      );

      if (!response.ok) {
        throw createAPIError(
          `EXTRACTOR_${response.status}`,
          `Stream extraction failed: ${response.statusText}`,
          response.status,
          response.status >= 500
        );
      }

      return await response.json();
    }, config.retry);

    // Cache the result
    if (config.cache !== false) {
      const cacheKey = generateCacheKey(`extractor:${endpoint}`, params);
      const ttl = config.cacheTTL || CACHE_DURATIONS.streams;
      await cacheManager.set(cacheKey, data, ttl);
    }

    return {
      data,
      cached: false,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      error: APIErrorHandler.handle(error),
      timestamp: Date.now(),
    };
  }
}

/**
 * Extractor Service
 */
export const extractorService = {
  /**
   * Extract video stream for a movie
   */
  async extractMovie(tmdbId: string): Promise<VideoData> {
    const response = await extractorRequest<any>(
      '/extract/movie',
      { tmdbId },
      { 
        cacheTTL: CACHE_DURATIONS.streams,
        timeout: 30000,
      }
    );

    if (response.error || !response.data) {
      throw response.error || createAPIError(
        'EXTRACTION_FAILED',
        'Failed to extract video stream',
        500,
        true
      );
    }

    return transformToVideoData(response.data);
  },

  /**
   * Extract video stream for a TV episode
   */
  async extractEpisode(
    tmdbId: string,
    season: number,
    episode: number
  ): Promise<VideoData> {
    const response = await extractorRequest<any>(
      '/extract/tv',
      { tmdbId, season, episode },
      { 
        cacheTTL: CACHE_DURATIONS.streams,
        timeout: 30000,
      }
    );

    if (response.error || !response.data) {
      throw response.error || createAPIError(
        'EXTRACTION_FAILED',
        'Failed to extract video stream',
        500,
        true
      );
    }

    return transformToVideoData(response.data);
  },

  /**
   * Extract video stream (auto-detect movie or episode)
   */
  async extract(
    tmdbId: string,
    mediaType: 'movie' | 'tv',
    season?: number,
    episode?: number
  ): Promise<VideoData> {
    if (mediaType === 'movie') {
      return this.extractMovie(tmdbId);
    } else {
      if (season === undefined || episode === undefined) {
        throw createAPIError(
          'INVALID_PARAMS',
          'Season and episode are required for TV shows',
          400,
          false
        );
      }
      return this.extractEpisode(tmdbId, season, episode);
    }
  },

  /**
   * Check if extractor service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${getExtractorURL()}/health`,
        { method: 'GET' },
        5000
      );
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get available sources for content
   */
  async getSources(
    tmdbId: string,
    mediaType: 'movie' | 'tv',
    season?: number,
    episode?: number
  ): Promise<string[]> {
    const response = await extractorRequest<any>(
      '/sources',
      { tmdbId, mediaType, season, episode },
      { cacheTTL: CACHE_DURATIONS.details }
    );

    if (response.error || !response.data) {
      return [];
    }

    return response.data.sources || [];
  },
};
