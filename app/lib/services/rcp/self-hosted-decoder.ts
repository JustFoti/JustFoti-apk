/**
 * SELF-HOSTED DECODER
 * 
 * Decodes ProRCP hidden divs using Puppeteer with the actual decoder script.
 * This allows us to decode ProRCP hidden divs reliably on Vercel.
 * 
 * Key Benefits:
 * - Works with ANY encoding (uses actual decoder script)
 * - No reverse engineering needed
 * - Handles obfuscation changes automatically
 * - Works on Vercel with @sparticuz/chromium
 */

import { decode as puppeteerDecode } from './puppeteer-decoder';
import { logger } from './logger';

interface DecodeResult {
  success: boolean;
  value?: string;
  error?: string;
  executionTime: number;
}

class SelfHostedDecoder {
  private cache: Map<string, string> = new Map();
  private readonly MAX_CACHE_SIZE = 1000;

  /**
   * Decode a hidden div using the self-hosted decoder
   */
  async decode(
    divContent: string,
    dataI: string,
    divId: string,
    requestId?: string,
    proRcpHash?: string
  ): Promise<DecodeResult> {
    const startTime = Date.now();
    const logContext = { requestId, divId, dataI };

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(divContent, dataI);
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        logger.debug(requestId || 'unknown', 'Decoder cache hit', logContext);
        return {
          success: true,
          value: cached,
          executionTime: Date.now() - startTime
        };
      }

      logger.debug(requestId || 'unknown', 'Executing decoder in VM', logContext);

      // Execute decoder
      const result = await this.executeDecoder(divContent, dataI, divId, proRcpHash);

      // Cache successful result
      if (result) {
        this.cacheResult(cacheKey, result);
        logger.info(
          requestId || 'unknown',
          'Decoder success',
          {
            ...logContext,
            resultLength: result.length,
            executionTime: Date.now() - startTime
          }
        );

        return {
          success: true,
          value: result,
          executionTime: Date.now() - startTime
        };
      }

      logger.warn(requestId || 'unknown', 'Decoder returned no value', logContext);
      return {
        success: false,
        error: 'No decoded value found',
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        requestId || 'unknown',
        'Decoder execution failed',
        {
          ...logContext,
          error: errorMessage,
          executionTime: Date.now() - startTime
        }
      );

      return {
        success: false,
        error: errorMessage,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute the Puppeteer decoder (uses actual decoder script)
   */
  private async executeDecoder(
    divContent: string,
    dataI: string,
    divId: string,
    proRcpHash?: string
  ): Promise<string | null> {
    try {
      // Use Puppeteer to execute the actual decoder script
      const decoded = await puppeteerDecode(divContent, dataI, divId, proRcpHash);
      
      if (decoded && typeof decoded === 'string') {
        return decoded;
      }

      return null;
    } catch (error) {
      // Re-throw to be caught by the caller
      throw error;
    }
  }

  /**
   * Generate cache key from div content and dataI
   */
  private getCacheKey(divContent: string, dataI: string): string {
    // Use first 100 chars of divContent + dataI as key
    // This is enough to uniquely identify the content
    return `${dataI}:${divContent.substring(0, 100)}`;
  }

  /**
   * Cache a decoded result
   */
  private cacheResult(key: string, value: string): void {
    // Implement simple LRU by clearing cache when it gets too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }



  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('cache-clear', 'Decoder cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE
    };
  }
}

// Export singleton instance
export const selfHostedDecoder = new SelfHostedDecoder();

// Export for testing
export { SelfHostedDecoder };
