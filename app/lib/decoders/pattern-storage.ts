/**
 * Pattern Storage Module
 * 
 * Provides functionality to save unknown patterns and failed decode attempts for analysis.
 * This helps identify new obfuscation patterns that need to be reverse-engineered.
 */

import { PatternType, DecoderError } from './types';

/**
 * Interface for a failed decode attempt
 */
export interface FailedDecodeAttempt {
  /** Timestamp when the failure occurred */
  timestamp: string;
  /** The encoded string that failed to decode */
  encodedString: string;
  /** Detected pattern type (or UNKNOWN) */
  detectedPattern: PatternType;
  /** List of decoders that were attempted */
  attemptedDecoders: string[];
  /** Error information */
  error: DecoderError;
  /** Additional diagnostic information */
  diagnostics: {
    /** Length of the encoded string */
    encodedLength: number;
    /** Character composition analysis */
    characterAnalysis: {
      hasColons: boolean;
      hasBase64Chars: boolean;
      hasHexChars: boolean;
      hasSpecialChars: boolean;
      uniqueCharCount: number;
    };
    /** Sample of the encoded string (first 100 chars) */
    sample: string;
  };
}

/**
 * In-memory storage for failed decode attempts
 * In production, this could be replaced with a database or file system storage
 */
class PatternStorage {
  private failedAttempts: FailedDecodeAttempt[] = [];
  private maxStorageSize: number = 1000; // Maximum number of failed attempts to store

  /**
   * Save a failed decode attempt for analysis
   */
  saveFailedAttempt(
    encodedString: string,
    detectedPattern: PatternType,
    attemptedDecoders: string[],
    error: DecoderError
  ): void {
    const attempt: FailedDecodeAttempt = {
      timestamp: new Date().toISOString(),
      encodedString,
      detectedPattern,
      attemptedDecoders,
      error,
      diagnostics: this.analyzString(encodedString),
    };

    // Add to storage
    this.failedAttempts.push(attempt);

    // Trim storage if it exceeds max size (keep most recent)
    if (this.failedAttempts.length > this.maxStorageSize) {
      this.failedAttempts = this.failedAttempts.slice(-this.maxStorageSize);
    }

    // Log for debugging
    console.warn('[PatternStorage] Failed decode attempt saved:', {
      timestamp: attempt.timestamp,
      pattern: detectedPattern,
      attemptedDecoders,
      sample: attempt.diagnostics.sample,
    });
  }

  /**
   * Analyze the character composition of an encoded string
   */
  private analyzString(encodedString: string): FailedDecodeAttempt['diagnostics'] {
    const hasColons = encodedString.includes(':');
    const hasBase64Chars = /^[A-Za-z0-9+/=]+$/.test(encodedString);
    const hasHexChars = /^[0-9a-fA-F]+$/.test(encodedString);
    const hasSpecialChars = /[^A-Za-z0-9+/=:\-_]/.test(encodedString);
    const uniqueChars = new Set(encodedString.split(''));

    return {
      encodedLength: encodedString.length,
      characterAnalysis: {
        hasColons,
        hasBase64Chars,
        hasHexChars,
        hasSpecialChars,
        uniqueCharCount: uniqueChars.size,
      },
      sample: encodedString.substring(0, 100) + (encodedString.length > 100 ? '...' : ''),
    };
  }

  /**
   * Get all failed decode attempts
   */
  getFailedAttempts(): FailedDecodeAttempt[] {
    return [...this.failedAttempts];
  }

  /**
   * Get failed attempts for unknown patterns only
   */
  getUnknownPatternAttempts(): FailedDecodeAttempt[] {
    return this.failedAttempts.filter(
      (attempt) => attempt.detectedPattern === PatternType.UNKNOWN
    );
  }

  /**
   * Get failed attempts grouped by detected pattern
   */
  getAttemptsByPattern(): Map<PatternType, FailedDecodeAttempt[]> {
    const grouped = new Map<PatternType, FailedDecodeAttempt[]>();

    for (const attempt of this.failedAttempts) {
      const existing = grouped.get(attempt.detectedPattern) || [];
      existing.push(attempt);
      grouped.set(attempt.detectedPattern, existing);
    }

    return grouped;
  }

  /**
   * Get statistics about failed decode attempts
   */
  getStatistics(): {
    totalAttempts: number;
    unknownPatterns: number;
    byPattern: Record<string, number>;
    recentAttempts: FailedDecodeAttempt[];
  } {
    const byPattern: Record<string, number> = {};

    for (const attempt of this.failedAttempts) {
      const pattern = attempt.detectedPattern;
      byPattern[pattern] = (byPattern[pattern] || 0) + 1;
    }

    return {
      totalAttempts: this.failedAttempts.length,
      unknownPatterns: this.getUnknownPatternAttempts().length,
      byPattern,
      recentAttempts: this.failedAttempts.slice(-10), // Last 10 attempts
    };
  }

  /**
   * Export failed attempts as JSON for analysis
   */
  exportToJson(): string {
    return JSON.stringify(
      {
        exportDate: new Date().toISOString(),
        totalAttempts: this.failedAttempts.length,
        attempts: this.failedAttempts,
      },
      null,
      2
    );
  }

  /**
   * Clear all stored failed attempts
   */
  clear(): void {
    this.failedAttempts = [];
    console.log('[PatternStorage] Storage cleared');
  }

  /**
   * Set maximum storage size
   */
  setMaxStorageSize(size: number): void {
    this.maxStorageSize = size;
    
    // Trim if current size exceeds new max
    if (this.failedAttempts.length > this.maxStorageSize) {
      this.failedAttempts = this.failedAttempts.slice(-this.maxStorageSize);
    }
  }

  /**
   * Find similar failed attempts based on character composition
   */
  findSimilarAttempts(encodedString: string, limit: number = 5): FailedDecodeAttempt[] {
    const analysis = this.analyzString(encodedString);
    
    // Score similarity based on character analysis
    const scored = this.failedAttempts.map((attempt) => {
      let score = 0;
      const attemptAnalysis = attempt.diagnostics.characterAnalysis;
      
      // Compare characteristics
      if (attemptAnalysis.hasColons === analysis.characterAnalysis.hasColons) score += 1;
      if (attemptAnalysis.hasBase64Chars === analysis.characterAnalysis.hasBase64Chars) score += 1;
      if (attemptAnalysis.hasHexChars === analysis.characterAnalysis.hasHexChars) score += 1;
      if (attemptAnalysis.hasSpecialChars === analysis.characterAnalysis.hasSpecialChars) score += 1;
      
      // Compare length (within 20% range)
      const lengthDiff = Math.abs(attempt.diagnostics.encodedLength - analysis.encodedLength);
      const lengthRatio = lengthDiff / analysis.encodedLength;
      if (lengthRatio < 0.2) score += 1;
      
      return { attempt, score };
    });
    
    // Sort by score (descending) and return top matches
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.attempt);
  }
}

/**
 * Singleton instance of PatternStorage
 */
export const patternStorage = new PatternStorage();

/**
 * Helper function to save a failed decode attempt
 */
export function saveFailedDecode(
  encodedString: string,
  detectedPattern: PatternType,
  attemptedDecoders: string[],
  error: DecoderError
): void {
  patternStorage.saveFailedAttempt(encodedString, detectedPattern, attemptedDecoders, error);
}

/**
 * Helper function to get unknown pattern attempts
 */
export function getUnknownPatterns(): FailedDecodeAttempt[] {
  return patternStorage.getUnknownPatternAttempts();
}

/**
 * Helper function to get storage statistics
 */
export function getStorageStatistics() {
  return patternStorage.getStatistics();
}

/**
 * Helper function to export failed attempts
 */
export function exportFailedAttempts(): string {
  return patternStorage.exportToJson();
}
