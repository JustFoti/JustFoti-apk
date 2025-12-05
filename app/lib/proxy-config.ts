/**
 * Proxy Configuration
 * 
 * Provides proxy URLs that can be configured to use either:
 * - Vercel Edge (default, uses /api/* routes)
 * - Cloudflare Workers (set NEXT_PUBLIC_CF_*_PROXY_URL env vars)
 * 
 * Cloudflare Workers are much cheaper for bandwidth-heavy operations.
 */

// Stream proxy for HLS streams (2embed, etc.)
export function getStreamProxyUrl(
  url: string,
  source: string = '2embed',
  referer: string = 'https://www.2embed.cc'
): string {
  const cfProxyUrl = process.env.NEXT_PUBLIC_CF_STREAM_PROXY_URL;
  
  if (cfProxyUrl) {
    // Use Cloudflare Worker
    return `${cfProxyUrl}/?url=${encodeURIComponent(url)}&source=${source}&referer=${encodeURIComponent(referer)}`;
  }
  
  // Fallback to Vercel Edge
  return `/api/stream-proxy?url=${encodeURIComponent(url)}&source=${source}&referer=${encodeURIComponent(referer)}`;
}

// TV proxy base URL for DLHD live streams
export function getTvProxyBaseUrl(): string {
  const cfProxyUrl = process.env.NEXT_PUBLIC_CF_TV_PROXY_URL;
  
  if (cfProxyUrl) {
    return cfProxyUrl;
  }
  
  // Fallback to Vercel Edge - return empty string to use relative URLs
  return '';
}

// Get TV playlist URL
export function getTvPlaylistUrl(channel: string): string {
  const baseUrl = getTvProxyBaseUrl();
  
  if (baseUrl) {
    // Cloudflare Worker
    return `${baseUrl}/?channel=${channel}`;
  }
  
  // Vercel Edge
  return `/api/dlhd-proxy?channel=${channel}`;
}

// Get TV key proxy URL
export function getTvKeyProxyUrl(keyUrl: string): string {
  const baseUrl = getTvProxyBaseUrl();
  
  if (baseUrl) {
    return `${baseUrl}/key?url=${encodeURIComponent(keyUrl)}`;
  }
  
  return `/api/dlhd-proxy/key?url=${encodeURIComponent(keyUrl)}`;
}

// Get TV segment proxy URL
export function getTvSegmentProxyUrl(segmentUrl: string): string {
  const baseUrl = getTvProxyBaseUrl();
  
  if (baseUrl) {
    return `${baseUrl}/segment?url=${encodeURIComponent(segmentUrl)}`;
  }
  
  return `/api/livetv/segment?url=${encodeURIComponent(segmentUrl)}`;
}

// Check if using Cloudflare Workers
export function isUsingCloudflareProxy(): {
  stream: boolean;
  tv: boolean;
} {
  return {
    stream: !!process.env.NEXT_PUBLIC_CF_STREAM_PROXY_URL,
    tv: !!process.env.NEXT_PUBLIC_CF_TV_PROXY_URL,
  };
}
