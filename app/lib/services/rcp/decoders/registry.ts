/**
 * Decoder Registry
 * 
 * Central registry for managing all decoder methods.
 * Tracks performance, success rates, and provides method selection logic.
 */

import { DecoderMethod, DecoderStats, DecoderRegistry as IDecoderRegistry } from './types';
import { CATEGORY_PRIORITIES } from './constants';
import { calculateSuccessRate } from './utils';

/**
 * Statistics storage for each decoder
 */
interface MethodStats {
  attempts: number;
  successes: number;
  totalTime: number;
  lastUsed?: number;
}

/**
 * Decoder Registry Implementation
 */
class DecoderRegistry implements IDecoderRegistry {
  private methods: Map<string, DecoderMethod> = new Map();
  private stats: Map<string, MethodStats> = new Map();

  /**
   * Register a new decoder method
   */
  register(method: DecoderMethod): void {
    if (this.methods.has(method.id)) {
      console.warn(`[Registry] Overwriting existing decoder: ${method.id}`);
    }

    this.methods.set(method.id, method);
    
    // Initialize stats if not exists
    if (!this.stats.has(method.id)) {
      this.stats.set(method.id, {
        attempts: 0,
        successes: 0,
        totalTime: 0,
      });
    }
  }

  /**
   * Get all registered decoders
   */
  getAll(): DecoderMethod[] {
    return Array.from(this.methods.values());
  }

  /**
   * Get decoders by category
   */
  getByCategory(category: DecoderMethod['category']): DecoderMethod[] {
    return this.getAll().filter(m => m.category === category);
  }

  /**
   * Get decoders sorted by priority
   * 
   * Priority is determined by:
   * 1. Method's explicit priority (if set)
   * 2. Category priority
   * 3. Historical success rate
   */
  getByPriority(): DecoderMethod[] {
    return this.getAll().sort((a, b) => {
      // Use explicit priority if set
      if (a.priority !== undefined && b.priority !== undefined) {
        return a.priority - b.priority;
      }
      if (a.priority !== undefined) return -1;
      if (b.priority !== undefined) return 1;

      // Use category priority
      const aCatPriority = CATEGORY_PRIORITIES[a.category] || 999;
      const bCatPriority = CATEGORY_PRIORITIES[b.category] || 999;
      
      if (aCatPriority !== bCatPriority) {
        return aCatPriority - bCatPriority;
      }

      // Use historical success rate
      const aStats = this.getStats(a.id);
      const bStats = this.getStats(b.id);
      
      if (aStats && bStats) {
        return bStats.successRate - aStats.successRate;
      }

      return 0;
    });
  }

  /**
   * Get decoder by ID
   */
  getById(id: string): DecoderMethod | undefined {
    return this.methods.get(id);
  }

  /**
   * Record a decode attempt
   */
  recordAttempt(id: string, success: boolean, time: number): void {
    const stats = this.stats.get(id);
    if (!stats) {
      console.warn(`[Registry] No stats found for decoder: ${id}`);
      return;
    }

    stats.attempts++;
    if (success) {
      stats.successes++;
    }
    stats.totalTime += time;
    stats.lastUsed = Date.now();

    this.stats.set(id, stats);
  }

  /**
   * Get statistics for a decoder
   */
  getStats(id: string): DecoderStats | undefined {
    const stats = this.stats.get(id);
    if (!stats) return undefined;

    return {
      id,
      attempts: stats.attempts,
      successes: stats.successes,
      successRate: calculateSuccessRate(stats.successes, stats.attempts),
      avgTime: stats.attempts > 0 ? stats.totalTime / stats.attempts : 0,
      lastUsed: stats.lastUsed,
    };
  }

  /**
   * Get all statistics
   */
  getAllStats(): DecoderStats[] {
    return Array.from(this.methods.keys())
      .map(id => this.getStats(id))
      .filter((s): s is DecoderStats => s !== undefined);
  }

  /**
   * Reset statistics for a decoder
   */
  resetStats(id: string): void {
    this.stats.set(id, {
      attempts: 0,
      successes: 0,
      totalTime: 0,
    });
  }

  /**
   * Reset all statistics
   */
  resetAllStats(): void {
    const ids = Array.from(this.methods.keys());
    for (const id of ids) {
      this.resetStats(id);
    }
  }

  /**
   * Export statistics to JSON
   */
  exportStats(): string {
    const stats = this.getAllStats();
    return JSON.stringify(stats, null, 2);
  }

  /**
   * Get top performing decoders
   */
  getTopPerformers(limit: number = 10): DecoderStats[] {
    return this.getAllStats()
      .filter(s => s.attempts >= 10) // Minimum attempts for statistical significance
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, limit);
  }

  /**
   * Get least used decoders
   */
  getLeastUsed(limit: number = 10): DecoderStats[] {
    return this.getAllStats()
      .sort((a, b) => a.attempts - b.attempts)
      .slice(0, limit);
  }

  /**
   * Clear all registered decoders
   */
  clear(): void {
    this.methods.clear();
    this.stats.clear();
  }

  /**
   * Get registry size
   */
  size(): number {
    return this.methods.size;
  }
}

/**
 * Global registry instance
 */
export const registry = new DecoderRegistry();

/**
 * Export for testing
 */
export { DecoderRegistry };
