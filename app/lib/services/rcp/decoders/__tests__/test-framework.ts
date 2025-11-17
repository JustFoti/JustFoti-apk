/**
 * Decoder Test Framework
 * 
 * Automated testing framework for decoder methods.
 * Tests against real shows/movies and validates results.
 */

import { DecodeInput, DecodeResult } from '../types';
import { validateUrl } from '../utils';

/**
 * Test case for a specific show/movie
 */
export interface TestCase {
  /** Test identifier */
  id: string;
  
  /** Title for logging */
  title: string;
  
  /** Type of content */
  type: 'movie' | 'tv';
  
  /** TMDB ID */
  tmdbId: number;
  
  /** Season (for TV shows) */
  season?: number;
  
  /** Episode (for TV shows) */
  episode?: number;
  
  /** Encoded string */
  encoded: string;
  
  /** Div ID (if available) */
  divId?: string;
  
  /** Data I parameter (if available) */
  dataI?: string;
  
  /** Expected decoder method (if known) */
  expectedMethod?: string;
  
  /** Expected URL pattern (for validation) */
  expectedUrlPattern?: RegExp;
}

/**
 * Test result
 */
export interface TestResult {
  /** Test case ID */
  testId: string;
  
  /** Whether test passed */
  passed: boolean;
  
  /** Decode result */
  decodeResult: DecodeResult;
  
  /** Validation errors */
  errors: string[];
  
  /** Time taken in ms */
  elapsed: number;
}

/**
 * Test suite result
 */
export interface TestSuiteResult {
  /** Total tests run */
  total: number;
  
  /** Tests passed */
  passed: number;
  
  /** Tests failed */
  failed: number;
  
  /** Success rate */
  successRate: number;
  
  /** Individual test results */
  results: TestResult[];
  
  /** Method distribution */
  methodDistribution: Record<string, number>;
  
  /** Average time per test */
  avgTime: number;
  
  /** Total time */
  totalTime: number;
}

/**
 * Test Framework
 */
export class DecoderTestFramework {
  private testCases: Map<string, TestCase> = new Map();

  /**
   * Add a test case
   */
  addTest(testCase: TestCase): void {
    this.testCases.set(testCase.id, testCase);
  }

  /**
   * Add multiple test cases
   */
  addTests(testCases: TestCase[]): void {
    for (const testCase of testCases) {
      this.addTest(testCase);
    }
  }

  /**
   * Run a single test
   */
  async runTest(
    testCase: TestCase,
    decodeFn: (input: DecodeInput) => Promise<DecodeResult>
  ): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Prepare input
      const input: DecodeInput = {
        encoded: testCase.encoded,
        divId: testCase.divId,
        dataI: testCase.dataI,
        requestId: `test-${testCase.id}`,
      };

      // Run decoder
      const result = await decodeFn(input);
      const elapsed = Date.now() - startTime;

      // Validate result
      if (!result.success) {
        errors.push(`Decode failed: ${result.error}`);
      } else {
        // Validate URL
        const validation = validateUrl(result.url);
        if (!validation.valid) {
          errors.push(`Invalid URL: ${validation.reason}`);
        }

        // Check expected method
        if (testCase.expectedMethod && result.method !== testCase.expectedMethod) {
          errors.push(
            `Method mismatch: expected ${testCase.expectedMethod}, got ${result.method}`
          );
        }

        // Check expected URL pattern
        if (testCase.expectedUrlPattern && !testCase.expectedUrlPattern.test(result.url)) {
          errors.push(`URL doesn't match expected pattern`);
        }
      }

      return {
        testId: testCase.id,
        passed: errors.length === 0 && result.success,
        decodeResult: result,
        errors,
        elapsed,
      };
    } catch (error) {
      return {
        testId: testCase.id,
        passed: false,
        decodeResult: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        elapsed: Date.now() - startTime,
      };
    }
  }

  /**
   * Run all tests
   */
  async runAll(
    decodeFn: (input: DecodeInput) => Promise<DecodeResult>
  ): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const results: TestResult[] = [];
    const methodDistribution: Record<string, number> = {};

    const allTestCases = Array.from(this.testCases.values());
    for (const testCase of allTestCases) {
      const result = await this.runTest(testCase, decodeFn);
      results.push(result);

      // Track method distribution
      if (result.decodeResult.success) {
        const method = result.decodeResult.method;
        methodDistribution[method] = (methodDistribution[method] || 0) + 1;
      }
    }

    const totalTime = Date.now() - startTime;
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    return {
      total: results.length,
      passed,
      failed,
      successRate: results.length > 0 ? passed / results.length : 0,
      results,
      methodDistribution,
      avgTime: results.length > 0 ? totalTime / results.length : 0,
      totalTime,
    };
  }

  /**
   * Run tests for a specific category
   */
  async runCategory(
    category: 'movie' | 'tv',
    decodeFn: (input: DecodeInput) => Promise<DecodeResult>
  ): Promise<TestSuiteResult> {
    const allTests = Array.from(this.testCases.values());
    const filtered = allTests.filter(tc => tc.type === category);

    const tempFramework = new DecoderTestFramework();
    tempFramework.addTests(filtered);
    return tempFramework.runAll(decodeFn);
  }

  /**
   * Generate test report
   */
  generateReport(result: TestSuiteResult): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('DECODER TEST REPORT');
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(`Total Tests: ${result.total}`);
    lines.push(`Passed: ${result.passed} (${(result.successRate * 100).toFixed(2)}%)`);
    lines.push(`Failed: ${result.failed}`);
    lines.push(`Average Time: ${result.avgTime.toFixed(2)}ms`);
    lines.push(`Total Time: ${result.totalTime.toFixed(2)}ms`);
    lines.push('');

    // Method distribution
    lines.push('Method Distribution:');
    lines.push('-'.repeat(80));
    const sortedMethods = Object.entries(result.methodDistribution)
      .sort((a, b) => b[1] - a[1]);
    
    for (const [method, count] of sortedMethods) {
      const percentage = (count / result.passed) * 100;
      lines.push(`  ${method.padEnd(30)} ${count.toString().padStart(5)} (${percentage.toFixed(1)}%)`);
    }
    lines.push('');

    // Failed tests
    if (result.failed > 0) {
      lines.push('Failed Tests:');
      lines.push('-'.repeat(80));
      
      for (const testResult of result.results.filter(r => !r.passed)) {
        lines.push(`  ${testResult.testId}:`);
        for (const error of testResult.errors) {
          lines.push(`    - ${error}`);
        }
      }
      lines.push('');
    }

    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  /**
   * Export test results to JSON
   */
  exportResults(result: TestSuiteResult): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * Get test case by ID
   */
  getTest(id: string): TestCase | undefined {
    return this.testCases.get(id);
  }

  /**
   * Get all test cases
   */
  getAllTests(): TestCase[] {
    const values = Array.from(this.testCases.values());
    return values;
  }

  /**
   * Clear all test cases
   */
  clear(): void {
    this.testCases.clear();
  }

  /**
   * Get test count
   */
  size(): number {
    return this.testCases.size;
  }
}

/**
 * Create a test case from a live extraction
 */
export function createTestCaseFromExtraction(
  id: string,
  title: string,
  type: 'movie' | 'tv',
  tmdbId: number,
  encoded: string,
  divId?: string,
  season?: number,
  episode?: number
): TestCase {
  return {
    id,
    title,
    type,
    tmdbId,
    season,
    episode,
    encoded,
    divId,
  };
}

/**
 * Global test framework instance
 */
export const testFramework = new DecoderTestFramework();
