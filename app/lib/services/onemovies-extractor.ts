/**
 * 111movies (1movies) Stream Extractor
 * 
 * STATUS: ENABLED - January 2026
 * 
 * The 1movies API uses a complex obfuscation scheme that includes:
 * 1. A static API hash built from obfuscated string array (rotation 104)
 * 2. AES-256-CBC encryption of pageData with XOR post-processing
 * 3. UTF-8 encoding of XOR'd string, then Base64url encoding
 * 4. Character substitution cipher
 * 5. CSRF token authentication
 * 
 * Keys from 860-458a7ce1ee2061c2.js:
 * - AES Key: [138,238,17,197,68,75,124,44,53,79,11,131,216,176,124,80,161,126,163,21,238,68,192,209,135,253,84,163,18,158,148,102]
 * - AES IV: [181,63,33,220,121,92,190,223,94,49,56,160,53,233,201,230]
 * - XOR Key: [215,136,144,55,198]
 * - CSRF Token: WP6BXZEsOAvSP0tk4AhxIWllVsuBx0Iy
 */

const BASE_URL = 'https://111movies.com';

// Static API hash (from 860-458a7ce1ee2061c2.js - January 2026)
// This hash includes the /ar suffix
const API_HASH = 'h/APA91Pu8JKhvEMftnB2QqFE9aSTlLqQF4iF0DRuk7YXkLqvJaUmlRlblS_1ZK6t2VIbx68GVQ5AVkepTGy82DLIz_uAyGx3Z421GLf2TIhbySFvE1bOInrzHRKLtjkPTpliKjWPhvPIzDjFmHp4zwMvRvqLhstjw4CVCy8jn-BuTxk1SRkl8s1r/ef860363-4e1b-5482-8d76-ec6fdebe974b/e993fc0bc499fdfb502f96b85963f9f0bbc698dd/wiv/1000044292358307/1bda1d30afdf5f775dcddb0a888bf9898b90ad4d3e1089396585236913b00773/ar';

// CSRF Token for API requests
const CSRF_TOKEN = 'WP6BXZEsOAvSP0tk4AhxIWllVsuBx0Iy';

// Encryption keys (from 860-458a7ce1ee2061c2.js)
const AES_KEY = new Uint8Array([138,238,17,197,68,75,124,44,53,79,11,131,216,176,124,80,161,126,163,21,238,68,192,209,135,253,84,163,18,158,148,102]);
const AES_IV = new Uint8Array([181,63,33,220,121,92,190,223,94,49,56,160,53,233,201,230]);
const XOR_KEY = new Uint8Array([215,136,144,55,198]);

// Character substitution (u -> d mapping from chunk)
const U_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
const D_CHARS = "c86mtuVv2EUlDgX-1YSpoiTq9WJadfzNe_Rs53kMrKHQZnxL0wGCFBhb7AP4yIOj";

const ENCODE_MAP = new Map<string, string>();
for (let i = 0; i < U_CHARS.length; i++) {
  ENCODE_MAP.set(U_CHARS[i], D_CHARS[i]);
}

// ENABLED - pageData encoding working!
export const ONEMOVIES_ENABLED = true;

export interface OneMoviesSource {
  quality: string;
  title: string;
  url: string;
  type: 'hls';
  referer: string;
  requiresSegmentProxy: boolean;
  status: 'working' | 'unknown' | 'down';
  language?: string;
}

export interface OneMoviesExtractionResult {
  success: boolean;
  sources: OneMoviesSource[];
  error?: string;
}

interface SourceResponse {
  name: string;
  description: string;
  image: string;
  data: string;
}

interface StreamResponse {
  url: string;
  noReferrer?: boolean;
  tracks?: Array<{ file: string; label?: string; kind?: string }>;
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://111movies.com/',
  'Content-Type': 'text/javascript',
  'x-csrf-token': CSRF_TOKEN,
  'sec-ch-ua': '"Chromium";v="120", "Not A(Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
};

// Import cfFetch for Cloudflare Workers compatibility
import { cfFetch } from '@/app/lib/utils/cf-fetch';

/**
 * Convert Uint8Array to hex string
 */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert string to Uint8Array (UTF-8)
 */
function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Encode page data for API request
 * Flow: AES-256-CBC encrypt → hex → XOR char codes → UTF-8 encode → Base64url → char substitution
 * 
 * CRITICAL: The XOR'd string must be treated as UTF-8 when converting to base64.
 * This is because the browser does: Buffer.from(xoredString, 'utf8').toString('base64')
 * which interprets the XOR'd characters as UTF-8 code points, expanding multi-byte sequences.
 */
async function encodePageData(pageData: string): Promise<string> {
  // Import the AES key
  const key = await crypto.subtle.importKey(
    'raw',
    AES_KEY.buffer as ArrayBuffer,
    { name: 'AES-CBC' },
    false,
    ['encrypt']
  );
  
  // Encrypt with AES-256-CBC
  const plaintext = stringToBytes(pageData);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: AES_IV.buffer as ArrayBuffer },
    key,
    plaintext.buffer as ArrayBuffer
  );
  
  // Convert to hex string
  const hexString = toHex(new Uint8Array(encrypted));
  
  // XOR each character CODE with the key
  // This produces a string where each character is the XOR of the hex digit's char code and the key byte
  let xored = '';
  for (let i = 0; i < hexString.length; i++) {
    const charCode = hexString.charCodeAt(i);
    const xorByte = XOR_KEY[i % XOR_KEY.length];
    xored += String.fromCharCode(charCode ^ xorByte);
  }
  
  // CRITICAL: Encode the XOR'd string as UTF-8, then convert to base64
  // This is what the browser does: Buffer.from(xored, 'utf8').toString('base64')
  // The TextEncoder will expand characters > 127 into multi-byte UTF-8 sequences
  const utf8Bytes = new TextEncoder().encode(xored);
  
  // Convert to base64url
  let base64 = '';
  const bytes = utf8Bytes;
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;
    
    const c1 = b1 >> 2;
    const c2 = ((b1 & 3) << 4) | (b2 >> 4);
    const c3 = ((b2 & 15) << 2) | (b3 >> 6);
    const c4 = b3 & 63;
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    base64 += chars[c1] + chars[c2];
    if (i + 1 < len) base64 += chars[c3];
    if (i + 2 < len) base64 += chars[c4];
  }
  
  // Convert to base64url (replace + with -, / with _, remove padding)
  base64 = base64.replace(/\+/g, '-').replace(/\//g, '_');
  
  // Character substitution
  let result = '';
  for (const char of base64) {
    result += ENCODE_MAP.get(char) || char;
  }
  
  return result;
}

/**
 * Get embed URL for 111movies
 */
export function getOneMoviesEmbedUrl(
  tmdbId: string,
  type: 'movie' | 'tv' = 'movie',
  season?: number,
  episode?: number
): string {
  if (type === 'movie') {
    return `${BASE_URL}/movie/${tmdbId}`;
  } else {
    return `${BASE_URL}/tv/${tmdbId}/${season}/${episode}`;
  }
}

/**
 * Check if 111movies has content for a given ID
 */
export async function checkOneMoviesAvailability(
  tmdbId: string,
  type: 'movie' | 'tv' = 'movie',
  season?: number,
  episode?: number
): Promise<boolean> {
  try {
    const url = type === 'movie' 
      ? `${BASE_URL}/movie/${tmdbId}`
      : `${BASE_URL}/tv/${tmdbId}/${season || 1}/${episode || 1}`;
    
    // Use cfFetch to route through RPI proxy on Cloudflare Workers
    const response = await cfFetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': HEADERS['User-Agent'] },
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch page data from 111movies page
 */
async function fetchPageData(
  tmdbId: string,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number
): Promise<string | null> {
  const url = type === 'movie'
    ? `${BASE_URL}/movie/${tmdbId}`
    : `${BASE_URL}/tv/${tmdbId}/${season}/${episode}`;
  
  console.log(`[1movies] Fetching page: ${url}`);
  
  // Use cfFetch to route through RPI proxy on Cloudflare Workers
  const response = await cfFetch(url, {
    headers: { 'User-Agent': HEADERS['User-Agent'] },
  });
  
  if (!response.ok) {
    console.log(`[1movies] Page fetch failed: ${response.status}`);
    return null;
  }
  
  const html = await response.text();
  
  // Extract __NEXT_DATA__
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  if (!nextDataMatch) {
    console.log('[1movies] Could not find __NEXT_DATA__');
    return null;
  }
  
  try {
    const nextData = JSON.parse(nextDataMatch[1]);
    const pageData = nextData.props?.pageProps?.data;
    
    if (!pageData) {
      console.log('[1movies] No pageProps.data found');
      return null;
    }
    
    console.log(`[1movies] Got page data: ${pageData.substring(0, 50)}...`);
    return pageData;
  } catch (e) {
    console.log('[1movies] Failed to parse __NEXT_DATA__');
    return null;
  }
}

/**
 * Fetch available sources from 111movies
 */
async function fetchSources(encodedData: string): Promise<SourceResponse[]> {
  // URL format: /{API_HASH}/{encoded}/sr
  const url = `${BASE_URL}/${API_HASH}/${encodedData}/sr`;
  
  console.log(`[1movies] Fetching sources from: ${url.substring(0, 100)}...`);
  
  // Use cfFetch to route through RPI proxy on Cloudflare Workers
  const response = await cfFetch(url, {
    method: 'GET',
    headers: HEADERS,
  });
  
  if (!response.ok) {
    console.log(`[1movies] Sources fetch failed: ${response.status}`);
    const text = await response.text();
    console.log(`[1movies] Response: ${text.substring(0, 200)}`);
    return [];
  }
  
  const sources = await response.json() as SourceResponse[];
  console.log(`[1movies] Got ${sources.length} sources:`, sources.map(s => s.name).join(', '));
  
  return sources;
}

/**
 * Fetch stream URL for a specific source
 */
async function fetchStreamUrl(sourceData: string): Promise<StreamResponse | null> {
  // URL format: /{API_HASH}/{source.data}
  const url = `${BASE_URL}/${API_HASH}/${sourceData}`;
  
  console.log(`[1movies] Fetching stream from: ${url.substring(0, 100)}...`);
  
  // Use cfFetch to route through RPI proxy on Cloudflare Workers
  const response = await cfFetch(url, {
    method: 'GET',
    headers: HEADERS,
  });
  
  if (!response.ok) {
    console.log(`[1movies] Stream fetch failed: ${response.status}`);
    return null;
  }
  
  try {
    const data = await response.json() as StreamResponse;
    return data;
  } catch {
    return null;
  }
}


/**
 * Extract streams from 111movies
 */
export async function extractOneMoviesStreams(
  tmdbId: string,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number
): Promise<OneMoviesExtractionResult> {
  if (!ONEMOVIES_ENABLED) {
    return {
      success: false,
      sources: [],
      error: '1movies provider is disabled'
    };
  }

  console.log(`[1movies] Extracting streams for ${type} ${tmdbId}${season ? ` S${season}E${episode}` : ''}`);

  try {
    // Step 1: Fetch page data
    const pageData = await fetchPageData(tmdbId, type, season, episode);
    
    if (!pageData) {
      return {
        success: false,
        sources: [],
        error: 'Content not available on 1movies'
      };
    }
    
    // Step 2: Encode page data
    const encoded = await encodePageData(pageData);
    console.log(`[1movies] Encoded data length: ${encoded.length}`);
    
    // Step 3: Fetch sources
    const sources = await fetchSources(encoded);
    
    if (sources.length === 0) {
      return {
        success: false,
        sources: [],
        error: 'No sources available'
      };
    }
    
    // Step 4: Fetch stream URLs for each source (in parallel, max 3)
    const results: OneMoviesSource[] = [];
    
    // Process sources in batches of 3
    for (let i = 0; i < Math.min(sources.length, 6); i += 3) {
      const batch = sources.slice(i, i + 3);
      const batchResults = await Promise.all(
        batch.map(async (source) => {
          try {
            const streamData = await fetchStreamUrl(source.data);
            
            if (streamData?.url) {
              console.log(`[1movies] ✓ ${source.name}: ${streamData.url.substring(0, 60)}...`);
              return {
                quality: 'auto',
                title: `1movies ${source.name}`,
                url: streamData.url,
                type: 'hls' as const,
                referer: BASE_URL,
                requiresSegmentProxy: true,
                status: 'working' as const,
                language: 'en',
              };
            }
            
            console.log(`[1movies] ✗ ${source.name}: No URL`);
            return null;
          } catch (e) {
            console.log(`[1movies] ✗ ${source.name}: ${e instanceof Error ? e.message : 'Error'}`);
            return null;
          }
        })
      );
      
      for (const r of batchResults) {
        if (r !== null) results.push(r);
      }
      
      // If we have at least 2 working sources, stop
      if (results.length >= 2) break;
    }
    
    if (results.length === 0) {
      return {
        success: false,
        sources: [],
        error: 'Failed to extract stream URLs'
      };
    }
    
    console.log(`[1movies] Successfully extracted ${results.length} sources`);
    
    return {
      success: true,
      sources: results,
    };

  } catch (error) {
    console.error('[1movies] Extraction error:', error);
    return {
      success: false,
      sources: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fetch a specific source by name from 111movies
 */
export async function fetchOneMoviesSourceByName(
  sourceName: string,
  tmdbId: string,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number
): Promise<OneMoviesSource | null> {
  if (!ONEMOVIES_ENABLED) {
    return null;
  }

  console.log(`[1movies] Fetching source by name: ${sourceName}`);

  try {
    // Extract the server name from the source title (e.g., "1movies Alpha" -> "Alpha")
    const serverName = sourceName.replace('1movies ', '');
    
    // Fetch page data
    const pageData = await fetchPageData(tmdbId, type, season, episode);
    if (!pageData) return null;
    
    // Encode and fetch sources
    const encoded = await encodePageData(pageData);
    const sources = await fetchSources(encoded);
    
    // Find the matching source
    const source = sources.find(s => s.name === serverName);
    if (!source) {
      console.log(`[1movies] Source "${serverName}" not found`);
      return null;
    }
    
    // Fetch stream URL
    const streamData = await fetchStreamUrl(source.data);
    if (!streamData?.url) {
      console.log(`[1movies] No stream URL for "${serverName}"`);
      return null;
    }
    
    return {
      quality: 'auto',
      title: `1movies ${source.name}`,
      url: streamData.url,
      type: 'hls',
      referer: BASE_URL,
      requiresSegmentProxy: true,
      status: 'working',
      language: 'en',
    };
  } catch (error) {
    console.error('[1movies] fetchOneMoviesSourceByName error:', error);
    return null;
  }
}

/**
 * Get subtitles from wyzie.ru (used by 111movies)
 */
export async function getOneMoviesSubtitles(
  tmdbId: string
): Promise<Array<{ url: string; label: string; language: string }>> {
  try {
    // Use cfFetch to route through RPI proxy on Cloudflare Workers
    const response = await cfFetch(`https://sub.wyzie.ru/search?id=${tmdbId}&format=srt`, {
      headers: { 'User-Agent': HEADERS['User-Agent'] },
    });
    
    if (!response.ok) {
      console.log(`[1movies] Subtitles fetch failed: ${response.status}`);
      return [];
    }

    const subtitles = await response.json();
    
    return subtitles.slice(0, 20).map((sub: { url: string; display?: string; language: string }) => ({
      url: sub.url,
      label: sub.display || sub.language,
      language: sub.language,
    }));
  } catch (error) {
    console.error('[1movies] Subtitles error:', error);
    return [];
  }
}

export default {
  ONEMOVIES_ENABLED,
  getOneMoviesEmbedUrl,
  extractOneMoviesStreams,
  fetchOneMoviesSourceByName,
  getOneMoviesSubtitles,
  checkOneMoviesAvailability,
};
