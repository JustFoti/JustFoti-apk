/**
 * Performance Monitoring for Decoder System
 * 
 * Tracks and reports performance metrics for the decoder system.
 * Helps identify bottlenecks and optimization opportunities.
 */

import { PatternType } from './types';
import { getAllCacheStats } from './cache';

/**
 * Performance metrics for a decode operation
 */
interface DecodeMetrics {
  timestamp: number;
  pattern: PatternType;
  decoderUsed: string;
  decodeTime: number;
  success: boolean;
  urlCount: number;
  encodedLength: number;
  attemptedDecoders: string[];
}

/**
 * Performance statistics aggregator
 */
class PerformanceMonitor {
  private metrics: DecodeMetrics[] = [];
  private maxMetrics: number = 1000;

  /**
   * Record a decode operation
   */
  record(metrics: DecodeMetrics): void {
    this.metrics.push(metrics);
    
    // Trim if exceeds max size
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    totalOperations: number;
    successRate: number;
    averageDecodeTime: number;
    medianDecodeTime: number;
    p95DecodeTime: number;
    p99DecodeTime: number;
    byPattern: Record<string, {
      count: number;
      successRate: number;
      averageTime: number;
    }>;
    byDecoder: Record<string, {
      count: number;
      successRate: number;
      averageTime: number;
    }>;
    cacheStats: ReturnType<typeof getAllCacheStats>;
  } {
    if (this.metrics.length === 0) {
      return {
        totalOperations: 0,
        successRate: 0,
        averageDecodeTime: 0,
        medianDecodeTime: 0,
        p95DecodeTime: 0,
        p99DecodeTime: 0,
        byPattern: {},
        byDecoder: {},
        cacheStats: getAllCacheStats(),
      };
    }

    // Calculate overall statistics
    const totalOperations = this.metrics.length;
    const successfulOps = this.metrics.filter(m => m.success).length;
    const successRate = successfulOps / totalOperations;

    // Calculate decode time statistics
    const decodeTimes = this.metrics.map(m => m.decodeTime).sort((a, b) => a - b);
    const averageDecodeTime = decodeTimes.reduce((sum, t) => sum + t, 0) / decodeTimes.length;
    const medianDecodeTime = decodeTimes[Math.floor(decodeTimes.length / 2)];
    const p95Index = Math.floor(decodeTimes.length * 0.95);
    const p99Index = Math.floor(decodeTimes.length * 0.99);
    const p95DecodeTime = decodeTimes[p95Index] || decodeTimes[decodeTimes.length - 1];
    const p99DecodeTime = decodeTimes[p99Index] || decodeTimes[decodeTimes.length - 1];

    // Calculate statistics by pattern
    const byPattern: Record<string, { count: number; successRate: number; averageTime: number }> = {};
    for (const pattern of Object.values(PatternType)) {
      const patternMetrics = this.metrics.filter(m => m.pattern === pattern);
      if (patternMetrics.length > 0) {
        const successCount = patternMetrics.filter(m => m.success).length;
        const avgTime = patternMetrics.reduce((sum, m) => sum + m.decodeTime, 0) / patternMetrics.length;
        byPattern[pattern] = {
          count: patternMetrics.length,
          successRate: successCount / patternMetrics.length,
          averageTime: avgTime,
        };
      }
    }

    // Calculate statistics by decoder
    const byDecoder: Record<string, { count: number; successRate: number; averageTime: number }> = {};
    const decoderNames = Array.from(new Set(this.metrics.map(m => m.decoderUsed)));
    for (const decoder of decoderNames) {
      const decoderMetrics = this.metrics.filter(m => m.decoderUsed === decoder);
      const successCount = decoderMetrics.filter(m => m.success).length;
      const avgTime = decoderMetrics.reduce((sum, m) => sum + m.decodeTime, 0) / decoderMetrics.length;
      byDecoder[decoder] = {
        count: decoderMetrics.length,
        successRate: successCount / decoderMetrics.length,
        averageTime: avgTime,
      };
    }

    return {
      totalOperations,
      successRate,
      averageDecodeTime,
      medianDecodeTime,
      p95DecodeTime,
      p99DecodeTime,
      byPattern,
      byDecoder,
      cacheStats: getAllCacheStats(),
    };
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(count: number = 10): DecodeMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * Get slow operations (above threshold)
   */
  getSlowOperations(thresholdMs: number = 1000): DecodeMetrics[] {
    return this.metrics.filter(m => m.decodeTime > thresholdMs);
  }

  /**
   * Get failed operations
   */
  getFailedOperations(): DecodeMetrics[] {
    return this.metrics.filter(m => !m.success);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Export metrics as JSON
   */
  exportToJson(): string {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      totalMetrics: this.metrics.length,
      statistics: this.getStats(),
      recentMetrics: this.getRecentMetrics(20),
    }, null, 2);
  }

  /**
   * Check if performance meets requirements
   * - 95% of operations should complete within 5 seconds
   * - Overall success rate should be >= 95%
   */
  meetsRequirements(): {
    meets: boolean;
    issues: string[];
  } {
    const stats = this.getStats();
    const issues: string[] = [];

    // Check p95 decode time (should be < 5000ms)
    if (stats.p95DecodeTime > 5000) {
      issues.push(`P95 decode time (${stats.p95DecodeTime.toFixed(0)}ms) exceeds 5000ms requirement`);
    }

    // Check success rate (should be >= 0.95)
    if (stats.successRate < 0.95) {
      issues.push(`Success rate (${(stats.successRate * 100).toFixed(1)}%) is below 95% requirement`);
    }

    // Check OLD format success rate (should be 100%)
    if (stats.byPattern[PatternType.OLD_FORMAT]) {
      const oldFormatRate = stats.byPattern[PatternType.OLD_FORMAT].successRate;
      if (oldFormatRate < 1.0) {
        issues.push(`OLD format success rate (${(oldFormatRate * 100).toFixed(1)}%) is below 100% requirement`);
      }
    }

    return {
      meets: issues.length === 0,
      issues,
    };
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Helper function to record decode metrics
 */
export function recordDecodeMetrics(
  pattern: PatternType,
  decoderUsed: string,
  decodeTime: number,
  success: boolean,
  urlCount: number,
  encodedLength: number,
  attemptedDecoders: string[]
): void {
  performanceMonitor.record({
    timestamp: Date.now(),
    pattern,
    decoderUsed,
    decodeTime,
    success,
    urlCount,
    encodedLength,
    attemptedDecoders,
  });
}

/**
 * Get performance statistics
 */
export function getPerformanceStats() {
  return performanceMonitor.getStats();
}

/**
 * Check if performance meets requirements
 */
export function checkPerformanceRequirements() {
  return performanceMonitor.meetsRequirements();
}

/**
 * Export performance metrics
 */
export function exportPerformanceMetrics(): string {
  return performanceMonitor.exportToJson();
}
