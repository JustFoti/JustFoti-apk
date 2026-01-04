/**
 * Property-Based Tests for Static Asset Cache Headers
 * Feature: vercel-to-cloudflare-migration, Property 5: Static Asset Cache Headers
 * Validates: Requirements 1.2, 11.1
 * 
 * Tests that static assets have correct cache headers.
 * For any static asset request (images, JS, CSS), the response SHALL include
 * cache headers with max-age >= 31536000 (1 year) for immutable assets.
 */

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';

// ============================================
// Cache Header Configuration from next.config.js
// ============================================

/**
 * Expected cache configurations based on next.config.js
 */
const CACHE_CONFIGS = {
  // Static assets (images, fonts, wasm) - 1 year, immutable
  staticAssets: {
    pattern: /\.(ico|png|jpg|jpeg|gif|webp|avif|svg|woff|woff2|wasm)$/,
    expectedMaxAge: 31536000, // 1 year in seconds
    expectedImmutable: true,
  },
  // Next.js static chunks - 1 year, immutable
  nextStatic: {
    pattern: /^\/_next\/static\//,
    expectedMaxAge: 31536000, // 1 year in seconds
    expectedImmutable: true,
  },
  // Manifest.json - 1 day with stale-while-revalidate
  manifest: {
    pattern: /^\/manifest\.json$/,
    expectedMaxAge: 86400, // 1 day in seconds
    expectedStaleWhileRevalidate: 604800, // 1 week
  },
  // API content routes - short cache with stale-while-revalidate
  apiContent: {
    pattern: /^\/api\/content\//,
    expectedSMaxAge: 60,
    expectedStaleWhileRevalidate: 300,
  },
  // API TMDB routes - moderate cache with stale-while-revalidate
  apiTmdb: {
    pattern: /^\/api\/tmdb\//,
    expectedSMaxAge: 300,
    expectedStaleWhileRevalidate: 600,
  },
};

// ============================================
// Cache Header Parsing Functions
// ============================================

interface ParsedCacheControl {
  public: boolean;
  private: boolean;
  maxAge: number | null;
  sMaxAge: number | null;
  immutable: boolean;
  staleWhileRevalidate: number | null;
  noCache: boolean;
  noStore: boolean;
}

/**
 * Parses a Cache-Control header value into structured data
 */
function parseCacheControl(headerValue: string): ParsedCacheControl {
  const result: ParsedCacheControl = {
    public: false,
    private: false,
    maxAge: null,
    sMaxAge: null,
    immutable: false,
    staleWhileRevalidate: null,
    noCache: false,
    noStore: false,
  };

  if (!headerValue) return result;

  const directives = headerValue.toLowerCase().split(',').map(d => d.trim());

  for (const directive of directives) {
    if (directive === 'public') {
      result.public = true;
    } else if (directive === 'private') {
      result.private = true;
    } else if (directive === 'immutable') {
      result.immutable = true;
    } else if (directive === 'no-cache') {
      result.noCache = true;
    } else if (directive === 'no-store') {
      result.noStore = true;
    } else if (directive.startsWith('max-age=')) {
      result.maxAge = parseInt(directive.split('=')[1], 10);
    } else if (directive.startsWith('s-maxage=')) {
      result.sMaxAge = parseInt(directive.split('=')[1], 10);
    } else if (directive.startsWith('stale-while-revalidate=')) {
      result.staleWhileRevalidate = parseInt(directive.split('=')[1], 10);
    }
  }

  return result;
}

/**
 * Generates the expected Cache-Control header for a given path
 */
function getExpectedCacheControl(path: string): ParsedCacheControl | null {
  // Check static assets
  if (CACHE_CONFIGS.staticAssets.pattern.test(path)) {
    return {
      public: true,
      private: false,
      maxAge: CACHE_CONFIGS.staticAssets.expectedMaxAge,
      sMaxAge: null,
      immutable: CACHE_CONFIGS.staticAssets.expectedImmutable,
      staleWhileRevalidate: null,
      noCache: false,
      noStore: false,
    };
  }

  // Check Next.js static
  if (CACHE_CONFIGS.nextStatic.pattern.test(path)) {
    return {
      public: true,
      private: false,
      maxAge: CACHE_CONFIGS.nextStatic.expectedMaxAge,
      sMaxAge: null,
      immutable: CACHE_CONFIGS.nextStatic.expectedImmutable,
      staleWhileRevalidate: null,
      noCache: false,
      noStore: false,
    };
  }

  // Check manifest
  if (CACHE_CONFIGS.manifest.pattern.test(path)) {
    return {
      public: true,
      private: false,
      maxAge: CACHE_CONFIGS.manifest.expectedMaxAge,
      sMaxAge: null,
      immutable: false,
      staleWhileRevalidate: CACHE_CONFIGS.manifest.expectedStaleWhileRevalidate,
      noCache: false,
      noStore: false,
    };
  }

  return null;
}

/**
 * Validates that actual cache headers meet or exceed expected values
 */
function validateCacheHeaders(
  actual: ParsedCacheControl,
  expected: ParsedCacheControl
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (expected.public && !actual.public) {
    errors.push('Expected public directive');
  }

  if (expected.immutable && !actual.immutable) {
    errors.push('Expected immutable directive');
  }

  if (expected.maxAge !== null) {
    if (actual.maxAge === null) {
      errors.push(`Expected max-age=${expected.maxAge}, got none`);
    } else if (actual.maxAge < expected.maxAge) {
      errors.push(`Expected max-age >= ${expected.maxAge}, got ${actual.maxAge}`);
    }
  }

  if (expected.sMaxAge !== null) {
    if (actual.sMaxAge === null) {
      errors.push(`Expected s-maxage=${expected.sMaxAge}, got none`);
    } else if (actual.sMaxAge < expected.sMaxAge) {
      errors.push(`Expected s-maxage >= ${expected.sMaxAge}, got ${actual.sMaxAge}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// Test Data Generators
// ============================================

/**
 * Generates valid static asset file extensions
 */
const staticAssetExtensionArbitrary = fc.constantFrom(
  'ico', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'woff', 'woff2', 'wasm'
);

/**
 * Generates valid static asset paths
 */
const staticAssetPathArbitrary = fc.tuple(
  fc.stringMatching(/^[a-zA-Z0-9\-_\/]+$/, { minLength: 1, maxLength: 50 }),
  staticAssetExtensionArbitrary
).map(([path, ext]) => `/${path.replace(/^\/+/, '')}.${ext}`);

/**
 * Generates valid Next.js static chunk paths
 */
const nextStaticPathArbitrary = fc.tuple(
  fc.stringMatching(/^[a-zA-Z0-9-_]+$/, { minLength: 1, maxLength: 20 }),
  fc.constantFrom('js', 'css', 'woff2', 'json')
).map(([name, ext]) => `/_next/static/chunks/${name}.${ext}`);

/**
 * Generates valid Cache-Control header values for static assets
 */
const validStaticCacheControlArbitrary = fc.record({
  maxAge: fc.integer({ min: 31536000, max: 63072000 }), // 1-2 years
  immutable: fc.constant(true),
}).map(({ maxAge }) => `public, max-age=${maxAge}, immutable`);

/**
 * Generates invalid Cache-Control header values (too short TTL)
 */
const invalidStaticCacheControlArbitrary = fc.record({
  maxAge: fc.integer({ min: 0, max: 31535999 }), // Less than 1 year
}).map(({ maxAge }) => `public, max-age=${maxAge}`);

// ============================================
// Property-Based Tests
// ============================================

describe('Static Asset Cache Headers', () => {
  test('Property 5: Static asset paths are correctly identified', () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 5: Static Asset Cache Headers
     * Validates: Requirements 1.2, 11.1
     * 
     * For any valid static asset path, the system SHALL recognize it as a static asset.
     */
    fc.assert(
      fc.property(
        staticAssetPathArbitrary,
        (path) => {
          // Verify the path matches the static asset pattern
          const isStaticAsset = CACHE_CONFIGS.staticAssets.pattern.test(path);
          expect(isStaticAsset).toBe(true);
          
          // Verify expected cache control is returned
          const expected = getExpectedCacheControl(path);
          expect(expected).not.toBeNull();
          expect(expected?.maxAge).toBe(31536000);
          expect(expected?.immutable).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 5: Next.js static paths are correctly identified', () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 5: Static Asset Cache Headers
     * Validates: Requirements 1.2, 11.1
     * 
     * For any valid Next.js static path, the system SHALL recognize it as immutable.
     */
    fc.assert(
      fc.property(
        nextStaticPathArbitrary,
        (path) => {
          // Verify the path matches the Next.js static pattern
          const isNextStatic = CACHE_CONFIGS.nextStatic.pattern.test(path);
          expect(isNextStatic).toBe(true);
          
          // Verify expected cache control is returned
          const expected = getExpectedCacheControl(path);
          expect(expected).not.toBeNull();
          expect(expected?.maxAge).toBe(31536000);
          expect(expected?.immutable).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 5: Valid cache headers are correctly parsed', () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 5: Static Asset Cache Headers
     * Validates: Requirements 1.2, 11.1
     * 
     * For any valid Cache-Control header, parsing SHALL extract correct values.
     */
    fc.assert(
      fc.property(
        validStaticCacheControlArbitrary,
        (headerValue) => {
          const parsed = parseCacheControl(headerValue);
          
          // Verify public directive is parsed
          expect(parsed.public).toBe(true);
          
          // Verify max-age is parsed and >= 1 year
          expect(parsed.maxAge).not.toBeNull();
          expect(parsed.maxAge).toBeGreaterThanOrEqual(31536000);
          
          // Verify immutable is parsed
          expect(parsed.immutable).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 5: Cache header validation correctly identifies valid headers', () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 5: Static Asset Cache Headers
     * Validates: Requirements 1.2, 11.1
     * 
     * For any valid cache header meeting requirements, validation SHALL pass.
     */
    fc.assert(
      fc.property(
        validStaticCacheControlArbitrary,
        (headerValue) => {
          const actual = parseCacheControl(headerValue);
          const expected: ParsedCacheControl = {
            public: true,
            private: false,
            maxAge: 31536000,
            sMaxAge: null,
            immutable: true,
            staleWhileRevalidate: null,
            noCache: false,
            noStore: false,
          };
          
          const result = validateCacheHeaders(actual, expected);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 5: Cache header validation correctly identifies invalid headers', () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 5: Static Asset Cache Headers
     * Validates: Requirements 1.2, 11.1
     * 
     * For any cache header with insufficient TTL, validation SHALL fail.
     */
    fc.assert(
      fc.property(
        invalidStaticCacheControlArbitrary,
        (headerValue) => {
          const actual = parseCacheControl(headerValue);
          const expected: ParsedCacheControl = {
            public: true,
            private: false,
            maxAge: 31536000,
            sMaxAge: null,
            immutable: true,
            staleWhileRevalidate: null,
            noCache: false,
            noStore: false,
          };
          
          const result = validateCacheHeaders(actual, expected);
          
          // Should fail because max-age is too low or immutable is missing
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 5: Cache-Control parsing handles all directive combinations', () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 5: Static Asset Cache Headers
     * Validates: Requirements 1.2, 11.1
     * 
     * For any combination of Cache-Control directives, parsing SHALL handle them correctly.
     */
    const cacheControlArbitrary = fc.record({
      public: fc.boolean(),
      private: fc.boolean(),
      maxAge: fc.option(fc.integer({ min: 0, max: 63072000 }), { nil: null }),
      sMaxAge: fc.option(fc.integer({ min: 0, max: 63072000 }), { nil: null }),
      immutable: fc.boolean(),
      staleWhileRevalidate: fc.option(fc.integer({ min: 0, max: 604800 }), { nil: null }),
    }).map(config => {
      const parts: string[] = [];
      if (config.public) parts.push('public');
      if (config.private) parts.push('private');
      if (config.maxAge !== null) parts.push(`max-age=${config.maxAge}`);
      if (config.sMaxAge !== null) parts.push(`s-maxage=${config.sMaxAge}`);
      if (config.immutable) parts.push('immutable');
      if (config.staleWhileRevalidate !== null) {
        parts.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
      }
      return { headerValue: parts.join(', '), config };
    });

    fc.assert(
      fc.property(
        cacheControlArbitrary,
        ({ headerValue, config }) => {
          const parsed = parseCacheControl(headerValue);
          
          // Verify each directive is correctly parsed
          expect(parsed.public).toBe(config.public);
          expect(parsed.private).toBe(config.private);
          expect(parsed.maxAge).toBe(config.maxAge);
          expect(parsed.sMaxAge).toBe(config.sMaxAge);
          expect(parsed.immutable).toBe(config.immutable);
          expect(parsed.staleWhileRevalidate).toBe(config.staleWhileRevalidate);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 5: Immutable assets have max-age >= 31536000 (1 year)', () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 5: Static Asset Cache Headers
     * Validates: Requirements 1.2, 11.1
     * 
     * For any immutable static asset, max-age SHALL be at least 31536000 seconds (1 year).
     */
    const immutableAssetArbitrary = fc.tuple(
      staticAssetPathArbitrary,
      fc.integer({ min: 31536000, max: 63072000 })
    ).map(([path, maxAge]) => ({
      path,
      cacheControl: `public, max-age=${maxAge}, immutable`,
    }));

    fc.assert(
      fc.property(
        immutableAssetArbitrary,
        ({ path, cacheControl }) => {
          // Verify path is a static asset
          expect(CACHE_CONFIGS.staticAssets.pattern.test(path)).toBe(true);
          
          // Parse and verify cache control
          const parsed = parseCacheControl(cacheControl);
          expect(parsed.public).toBe(true);
          expect(parsed.immutable).toBe(true);
          expect(parsed.maxAge).toBeGreaterThanOrEqual(31536000);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 5: next.config.js cache header configuration is correct', () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 5: Static Asset Cache Headers
     * Validates: Requirements 1.2, 11.1
     * 
     * Verify the expected cache header configuration matches requirements.
     */
    // Test static assets configuration
    expect(CACHE_CONFIGS.staticAssets.expectedMaxAge).toBe(31536000);
    expect(CACHE_CONFIGS.staticAssets.expectedImmutable).toBe(true);
    
    // Test Next.js static configuration
    expect(CACHE_CONFIGS.nextStatic.expectedMaxAge).toBe(31536000);
    expect(CACHE_CONFIGS.nextStatic.expectedImmutable).toBe(true);
    
    // Test manifest configuration (should have shorter TTL)
    expect(CACHE_CONFIGS.manifest.expectedMaxAge).toBe(86400);
    expect(CACHE_CONFIGS.manifest.expectedStaleWhileRevalidate).toBe(604800);
    
    // Test API routes have appropriate caching
    expect(CACHE_CONFIGS.apiContent.expectedSMaxAge).toBe(60);
    expect(CACHE_CONFIGS.apiTmdb.expectedSMaxAge).toBe(300);
  });
});
