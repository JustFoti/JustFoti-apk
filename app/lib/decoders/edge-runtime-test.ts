/**
 * Edge Runtime Compatibility Test
 * 
 * This file tests the decoder system in edge runtime environments.
 * It verifies that all decoders work without Node.js-specific APIs.
 * 
 * Usage:
 * - Deploy to Vercel Edge Functions or Cloudflare Workers
 * - Call the test endpoint to verify compatibility
 */

import { decode, decodeSync } from './index';
import { PatternType } from './types';

/**
 * Test data for edge runtime verification
 */
const TEST_CASES = {
  oldFormat: {
    // Sample OLD format encoded string (reverse-hex-shift)
    encoded: 'z9y8x7w6v5u4t3s2r1q0p:o9n8m7l6k5j4i3h2g1',
    expectedPattern: PatternType.OLD_FORMAT,
  },
  newFormat: {
    // Sample NEW format encoded string (base64 + XOR)
    encoded: 'SGVsbG8gV29ybGQhIFRoaXMgaXMgYSB0ZXN0',
    expectedPattern: PatternType.NEW_FORMAT,
  },
};

/**
 * Verifies edge runtime compatibility
 * 
 * @returns Test results with compatibility status
 */
export async function verifyEdgeCompatibility(): Promise<{
  compatible: boolean;
  tests: Array<{
    name: string;
    passed: boolean;
    error?: string;
  }>;
  runtime: string;
}> {
  const tests: Array<{ name: string; passed: boolean; error?: string }> = [];
  
  // Detect runtime environment
  const runtime = detectRuntime();
  
  // Test 1: Synchronous decode
  try {
    decodeSync(TEST_CASES.oldFormat.encoded);
    tests.push({
      name: 'Synchronous decode',
      passed: true,
    });
  } catch (error) {
    tests.push({
      name: 'Synchronous decode',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  // Test 2: Async decode
  try {
    await decode(TEST_CASES.newFormat.encoded);
    tests.push({
      name: 'Async decode',
      passed: true,
    });
  } catch (error) {
    tests.push({
      name: 'Async decode',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  // Test 3: atob availability (base64 decode)
  try {
    const decoded = atob('SGVsbG8=');
    tests.push({
      name: 'atob (base64 decode)',
      passed: decoded === 'Hello',
    });
  } catch (error) {
    tests.push({
      name: 'atob (base64 decode)',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  // Test 4: URL constructor
  try {
    const url = new URL('https://example.com/test.m3u8');
    tests.push({
      name: 'URL constructor',
      passed: url.protocol === 'https:',
    });
  } catch (error) {
    tests.push({
      name: 'URL constructor',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  // Test 5: Uint8Array
  try {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]);
    const byteArray = Array.from(bytes);
    const str = String.fromCharCode(...byteArray);
    tests.push({
      name: 'Uint8Array',
      passed: str === 'Hello',
    });
  } catch (error) {
    tests.push({
      name: 'Uint8Array',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  // Test 6: Map and Set
  try {
    const map = new Map([['key', 'value']]);
    const set = new Set([1, 2, 3]);
    tests.push({
      name: 'Map and Set',
      passed: map.get('key') === 'value' && set.has(2),
    });
  } catch (error) {
    tests.push({
      name: 'Map and Set',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  // Test 7: Date
  try {
    const date = new Date();
    const iso = date.toISOString();
    tests.push({
      name: 'Date',
      passed: iso.length > 0,
    });
  } catch (error) {
    tests.push({
      name: 'Date',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  // Test 8: JSON
  try {
    const obj = { test: 'value' };
    const json = JSON.stringify(obj);
    const parsed = JSON.parse(json);
    tests.push({
      name: 'JSON',
      passed: parsed.test === 'value',
    });
  } catch (error) {
    tests.push({
      name: 'JSON',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  // Test 9: Promise
  try {
    await Promise.resolve('test');
    tests.push({
      name: 'Promise',
      passed: true,
    });
  } catch (error) {
    tests.push({
      name: 'Promise',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  // Test 10: Regex
  try {
    const regex = /test/i;
    const match = 'TEST'.match(regex);
    tests.push({
      name: 'Regex',
      passed: match !== null,
    });
  } catch (error) {
    tests.push({
      name: 'Regex',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  const compatible = tests.every(test => test.passed);
  
  return {
    compatible,
    tests,
    runtime,
  };
}

/**
 * Detects the current runtime environment
 */
function detectRuntime(): string {
  // Check for Vercel Edge
  // @ts-ignore - EdgeRuntime is a global in Vercel Edge
  if (typeof EdgeRuntime !== 'undefined') {
    return 'Vercel Edge Runtime';
  }
  
  // Check for Cloudflare Workers
  // @ts-ignore - caches.default is specific to Cloudflare Workers
  if (typeof caches !== 'undefined' && caches.default) {
    return 'Cloudflare Workers';
  }
  
  // Check for Deno
  // @ts-ignore - Deno is a global in Deno runtime
  if (typeof Deno !== 'undefined') {
    return 'Deno';
  }
  
  // Check for Node.js
  // @ts-ignore - process is a global in Node.js
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    return 'Node.js';
  }
  
  // Check for browser
  if (typeof window !== 'undefined') {
    return 'Browser';
  }
  
  return 'Unknown';
}

/**
 * Export for use in edge function handlers
 */
export default verifyEdgeCompatibility;
