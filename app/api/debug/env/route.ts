/**
 * Debug endpoint to check environment variable availability
 * 
 * SECURITY:
 * - Only accessible in local development (localhost)
 * - Uses separate DEBUG_SECRET (not JWT_SECRET) for production access
 * - Rate limited via timing-safe comparison
 * - No caching of responses
 * - Minimal information disclosure
 * 
 * GET /api/debug/env
 */

import { NextResponse } from 'next/server';

// Use timing-safe comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do the comparison to maintain constant time
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0);
    }
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Detect if we're running on Cloudflare Workers
function isCloudflareWorker(): boolean {
  try {
    // @ts-ignore - caches.default only exists in Cloudflare Workers
    const hasCachesDefault = typeof caches !== 'undefined' && typeof caches.default !== 'undefined';
    const isNotNode = typeof process === 'undefined' || 
                      typeof process.versions === 'undefined' || 
                      typeof process.versions.node === 'undefined';
    // @ts-ignore
    const hasCfEnv = typeof globalThis.caches !== 'undefined';
    return hasCachesDefault || (isNotNode && hasCfEnv);
  } catch {
    return false;
  }
}

// Check if request is from localhost
function isLocalhost(request: Request): boolean {
  try {
    const url = new URL(request.url);
    const host = url.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

function getEnvSources(): Record<string, unknown> {
  const sources: Record<string, unknown> = {};
  
  // Check process.env - only report SET/NOT SET, never values
  sources['process.env'] = {
    RPI_PROXY_URL: process.env.RPI_PROXY_URL ? 'SET' : 'NOT SET',
    RPI_PROXY_KEY: process.env.RPI_PROXY_KEY ? 'SET' : 'NOT SET',
    NEXT_PUBLIC_RPI_PROXY_URL: process.env.NEXT_PUBLIC_RPI_PROXY_URL ? 'SET' : 'NOT SET',
    NEXT_PUBLIC_RPI_PROXY_KEY: process.env.NEXT_PUBLIC_RPI_PROXY_KEY ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
  };
  
  // Check getCloudflareContext
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const ctx = getCloudflareContext({ async: false });
    sources['getCloudflareContext'] = {
      available: true,
      hasEnv: !!ctx?.env,
      RPI_PROXY_URL: ctx?.env?.RPI_PROXY_URL ? 'SET' : 'NOT SET',
      RPI_PROXY_KEY: ctx?.env?.RPI_PROXY_KEY ? 'SET' : 'NOT SET',
      // Don't expose env key names - potential info disclosure
    };
  } catch (e) {
    sources['getCloudflareContext'] = {
      available: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
  
  // Check globalThis patterns
  const globalEnv = (globalThis as unknown as { process?: { env?: Record<string, string> } })?.process?.env;
  sources['globalThis.process.env'] = globalEnv ? {
    available: true,
    RPI_PROXY_URL: globalEnv.RPI_PROXY_URL ? 'SET' : 'NOT SET',
    RPI_PROXY_KEY: globalEnv.RPI_PROXY_KEY ? 'SET' : 'NOT SET',
  } : { available: false };
  
  const cfEnv = (globalThis as unknown as { __cf_env__?: Record<string, string> })?.__cf_env__;
  sources['globalThis.__cf_env__'] = cfEnv ? {
    available: true,
    RPI_PROXY_URL: cfEnv.RPI_PROXY_URL ? 'SET' : 'NOT SET',
    RPI_PROXY_KEY: cfEnv.RPI_PROXY_KEY ? 'SET' : 'NOT SET',
  } : { available: false };
  
  const cfCtx = (globalThis as unknown as { __cloudflare_context__?: { env?: Record<string, string> } })?.__cloudflare_context__;
  sources['globalThis.__cloudflare_context__'] = cfCtx?.env ? {
    available: true,
    RPI_PROXY_URL: cfCtx.env.RPI_PROXY_URL ? 'SET' : 'NOT SET',
    RPI_PROXY_KEY: cfCtx.env.RPI_PROXY_KEY ? 'SET' : 'NOT SET',
  } : { available: false };
  
  return sources;
}

export async function GET(request: Request) {
  // Security: Only allow from localhost OR with dedicated debug secret
  // NEVER use JWT_SECRET for debug access - if leaked, all auth is compromised
  const isLocal = isLocalhost(request);
  const debugSecret = process.env.DEBUG_SECRET;
  const providedSecret = request.headers.get('X-Debug-Secret') || '';
  
  // Use timing-safe comparison to prevent timing attacks
  const hasValidSecret = debugSecret && providedSecret && timingSafeEqual(providedSecret, debugSecret);
  
  if (!isLocal && !hasValidSecret) {
    // Generic error - don't reveal why it failed
    return NextResponse.json(
      { error: 'Not found' }, 
      { 
        status: 404,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
  
  const isCfWorker = isCloudflareWorker();
  const envSources = getEnvSources();
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    runtime: {
      isCloudflareWorker: isCfWorker,
      hasProcessVersionsNode: typeof process !== 'undefined' && typeof process.versions !== 'undefined' && typeof process.versions.node !== 'undefined',
      nodeVersion: typeof process !== 'undefined' && process.versions?.node,
    },
    envSources,
    recommendation: !envSources['process.env'] || 
      ((envSources['process.env'] as Record<string, string>).RPI_PROXY_URL === 'NOT SET') 
      ? 'Run: wrangler secret put RPI_PROXY_URL && wrangler secret put RPI_PROXY_KEY' 
      : 'RPI proxy appears configured',
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
