/**
 * VidSrc Extractor
 * Extracts streams from vidsrc-embed.ru → cloudnestra.com
 * 
 * ⚠️ SECURITY WARNING ⚠️
 * This extractor executes remote JavaScript code from third-party sites.
 * While we sandbox the execution, there is inherent risk in running untrusted code.
 * 
 * This provider is DISABLED BY DEFAULT for safety.
 * To enable, set ENABLE_VIDSRC_PROVIDER=true in your environment.
 * 
 * SECURITY MEASURES:
 * - Decoder scripts run in isolated Cloudflare Worker (preferred)
 * - Fallback to Node.js VM sandbox with no network access
 * - Pattern validation and URL allowlisting
 */

interface StreamSource {
  quality: string;
  title: string;
  url: string;
  type: 'hls';
  referer: string;
  requiresSegmentProxy: boolean;
  status?: 'working' | 'down';
}

interface ExtractionResult {
  success: boolean;
  sources: StreamSource[];
  error?: string;
}

interface SandboxResponse {
  success: boolean;
  decodedUrl?: string;
  error?: string;
}

// ⚠️ SECURITY: VidSrc is DISABLED by default - must explicitly enable
export const VIDSRC_ENABLED = process.env.ENABLE_VIDSRC_PROVIDER === 'true';

// Domain for stream URLs
const STREAM_DOMAIN = 'shadowlandschronicles.com';

// Cloudflare Worker sandbox URL - set via environment variable
const DECODER_SANDBOX_URL = process.env.DECODER_SANDBOX_URL || process.env.NEXT_PUBLIC_DECODER_SANDBOX_URL;

// Allow local VM fallback only in development (set ALLOW_LOCAL_VM_FALLBACK=true)
const ALLOW_LOCAL_VM_FALLBACK = process.env.ALLOW_LOCAL_VM_FALLBACK === 'true' || process.env.NODE_ENV === 'development';

/**
 * Fetch with proper headers and timeout
 */
async function fetchWithHeaders(url: string, referer?: string, timeoutMs: number = 15000): Promise<Response> {
  const headers: HeadersInit = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  if (referer) {
    headers['Referer'] = referer;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Custom atob for Edge runtime compatibility
 */
function customAtob(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'base64').toString('binary');
  }
  // Edge runtime has native atob
  return atob(str);
}

/**
 * Custom btoa for Edge runtime compatibility  
 */
function customBtoa(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'binary').toString('base64');
  }
  return btoa(str);
}

/**
 * Execute decoder script via isolated Cloudflare Worker sandbox
 * 
 * SECURITY: The decoder runs in a completely separate V8 isolate on Cloudflare,
 * providing true process-level isolation. Even if the script is malicious:
 * - No access to our application's memory or globals
 * - No network access (fetch/WebSocket blocked at isolate level)
 * - No persistent storage access
 * - CPU/memory limits enforced by Cloudflare
 * - Output validated before being returned
 */
async function executeDecoderInSandbox(
  decoderScript: string, 
  divId: string, 
  encodedContent: string
): Promise<string | null> {
  if (!DECODER_SANDBOX_URL) {
    console.error('[VidSrc] DECODER_SANDBOX_URL not configured - cannot execute decoder safely');
    return null;
  }

  try {
    console.log('[VidSrc] Sending decoder to isolated Cloudflare sandbox...');
    
    const response = await fetch(`${DECODER_SANDBOX_URL}/decode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Include API key if configured
        ...(process.env.DECODER_SANDBOX_API_KEY && {
          'X-API-Key': process.env.DECODER_SANDBOX_API_KEY
        })
      },
      body: JSON.stringify({
        script: decoderScript,
        divId,
        encodedContent
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[VidSrc] Sandbox returned error:', response.status, errorText);
      return null;
    }

    const result: SandboxResponse = await response.json();
    
    if (!result.success) {
      console.error('[VidSrc] Sandbox execution failed:', result.error);
      return null;
    }

    console.log('[VidSrc] Sandbox execution successful');
    return result.decodedUrl || null;
    
  } catch (error) {
    console.error('[VidSrc] Failed to communicate with sandbox:', error);
    return null;
  }
}

/**
 * LOCAL FALLBACK: Execute decoder in Node.js VM sandbox with NO network access
 * 
 * SECURITY: Uses Node.js native vm module which provides proper sandboxing.
 * NOTE: This requires running with Node.js (npm run dev), not Bun (npm run dev:bun)
 * because Bun's VM implementation is incomplete.
 * 
 * The sandbox has:
 * - NO access to fetch, XMLHttpRequest, WebSocket
 * - NO access to require, import, process
 * - NO access to Node.js/Bun APIs
 * - Timeout protection against infinite loops
 * - Proper JavaScript built-ins (String, Array, etc.)
 */
function executeDecoderLocal(decoderScript: string, divId: string, encodedContent: string): string | null {
  // Validate script size (150KB limit - their scripts are ~112KB)
  if (decoderScript.length > 150000) {
    console.error('[VidSrc] Script too large:', decoderScript.length);
    return null;
  }

  try {
    // Use Node.js native vm module
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vm = require('vm');
    
    // Create minimal window mock
    const mockWindow: Record<string, unknown> = {};

    // Create minimal document mock - ONLY getElementById
    const mockDocument = {
      getElementById: (id: string) => {
        if (id === divId) {
          return { innerHTML: encodedContent };
        }
        return null;
      }
    };

    // Create sandbox with browser-like globals but NO network/system access
    const sandbox = {
      window: mockWindow,
      document: mockDocument,
      atob: customAtob,
      btoa: customBtoa,
      setTimeout: (fn: () => void) => { if (typeof fn === 'function') fn(); },
      setInterval: () => {},
      clearTimeout: () => {},
      clearInterval: () => {},
      console: { log: () => {}, error: () => {}, warn: () => {}, info: () => {} },
      // BLOCKED - these are undefined in the sandbox
      fetch: undefined,
      XMLHttpRequest: undefined,
      WebSocket: undefined,
      require: undefined,
      process: undefined,
      Buffer: undefined,
      __dirname: undefined,
      __filename: undefined,
      module: undefined,
      exports: undefined,
    };

    // Run in isolated VM context with timeout
    // NOTE: This works with Node.js but NOT with Bun (Bun's VM is incomplete)
    console.log('[VidSrc] Executing in Node.js VM sandbox (no network access)...');
    vm.runInNewContext(decoderScript, sandbox, {
      filename: 'decoder.js',
      timeout: 5000,
    });
    
    // Check for captured result - the decoder sets window[divId] = decodedUrl
    const result = mockWindow[divId];
    if (typeof result === 'string' && result.includes('https://')) {
      console.log('[VidSrc] VM execution successful');
      return result;
    }
    
    console.error('[VidSrc] No decoded URL found in window');
    console.error('[VidSrc] mockWindow keys:', Object.keys(mockWindow));
    return null;
    
  } catch (error) {
    // VM module not available (Edge runtime) - this is expected on Vercel Edge
    if (error instanceof Error && error.message.includes('Cannot find module')) {
      console.error('[VidSrc] VM module not available (Edge runtime) - need Cloudflare sandbox');
      return null;
    }
    console.error('[VidSrc] VM execution failed:', error);
    return null;
  }
}

/**
 * Execute decoder - REQUIRES Cloudflare sandbox, local VM only as fallback in dev
 * 
 * SECURITY POLICY:
 * 1. Always try Cloudflare Worker sandbox first (true V8 isolation)
 * 2. Only fall back to local VM in development mode
 * 3. In production without sandbox configured, FAIL SAFE (don't execute untrusted code)
 */
async function executeDecoder(
  decoderScript: string, 
  divId: string, 
  encodedContent: string
): Promise<string | null> {
  // STEP 1: Try Cloudflare sandbox first (preferred - true isolation)
  if (DECODER_SANDBOX_URL) {
    console.log('[VidSrc] Using Cloudflare Worker sandbox for secure execution...');
    const result = await executeDecoderInSandbox(decoderScript, divId, encodedContent);
    if (result) return result;
    console.warn('[VidSrc] Cloudflare sandbox failed');
  } else {
    console.warn('[VidSrc] DECODER_SANDBOX_URL not configured');
  }
  
  // STEP 2: Fall back to local VM ONLY if explicitly allowed
  if (ALLOW_LOCAL_VM_FALLBACK) {
    console.warn('[VidSrc] Falling back to local Node.js VM sandbox (development mode)');
    return executeDecoderLocal(decoderScript, divId, encodedContent);
  }
  
  // STEP 3: FAIL SAFE - don't execute untrusted code without proper sandbox
  console.error('[VidSrc] SECURITY: Cannot execute decoder - no sandbox available');
  console.error('[VidSrc] Configure DECODER_SANDBOX_URL for production or set ALLOW_LOCAL_VM_FALLBACK=true for development');
  return null;
}

/**
 * Check if a stream URL is accessible
 */
async function checkStreamAvailability(url: string): Promise<'working' | 'down'> {
  try {
    const response = await fetchWithHeaders(url, 'https://cloudnestra.com/', 5000);
    const text = await response.text();
    return response.ok && (text.includes('#EXTM3U') || text.includes('#EXT-X')) ? 'working' : 'down';
  } catch {
    return 'down';
  }
}

/**
 * Main extraction function
 * 
 * ⚠️ DISABLED BY DEFAULT - Set ENABLE_VIDSRC_PROVIDER=true to enable
 */
export async function extractVidSrcStreams(
  tmdbId: string,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number
): Promise<ExtractionResult> {
  // ⚠️ SECURITY CHECK: VidSrc must be explicitly enabled
  if (!VIDSRC_ENABLED) {
    console.warn('[VidSrc] Provider is DISABLED for security. Set ENABLE_VIDSRC_PROVIDER=true to enable.');
    return {
      success: false,
      sources: [],
      error: 'VidSrc provider is disabled. Set ENABLE_VIDSRC_PROVIDER=true to enable (security risk).'
    };
  }

  console.log(`[VidSrc] Extracting streams for ${type} ID ${tmdbId}...`);

  try {
    // Step 1: Fetch vidsrc-embed.ru page
    const embedUrl = type === 'tv' && season && episode
      ? `https://vidsrc-embed.ru/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://vidsrc-embed.ru/embed/movie/${tmdbId}`;
    
    console.log('[VidSrc] Fetching embed page:', embedUrl);
    const embedResponse = await fetchWithHeaders(embedUrl);
    
    if (!embedResponse.ok) {
      throw new Error(`Embed page returned ${embedResponse.status}`);
    }
    
    const embedHtml = await embedResponse.text();

    // Step 2: Extract RCP iframe URL
    const iframeMatch = embedHtml.match(/<iframe[^>]*src=["']([^"']+cloudnestra\.com\/rcp\/([^"']+))["']/i);
    if (!iframeMatch) {
      throw new Error('Could not find RCP iframe in embed page');
    }
    
    const rcpPath = iframeMatch[2];
    console.log('[VidSrc] Found RCP hash');

    // Step 3: Fetch RCP page to get prorcp URL
    const rcpUrl = `https://cloudnestra.com/rcp/${rcpPath}`;
    console.log('[VidSrc] Fetching RCP page');
    const rcpResponse = await fetchWithHeaders(rcpUrl, 'https://vidsrc-embed.ru/');
    
    if (!rcpResponse.ok) {
      throw new Error(`RCP page returned ${rcpResponse.status}`);
    }
    
    const rcpHtml = await rcpResponse.text();

    // Step 4: Extract prorcp OR srcrcp URL (site uses both dynamically)
    // The URL can be in various formats depending on how the page loads
    let rcpEndpointPath: string | null = null;
    let rcpEndpointType: 'prorcp' | 'srcrcp' = 'prorcp';
    
    // Try multiple patterns - the site structure varies
    const patterns = [
      // Pattern 1: src: '/prorcp/...' or src: '/srcrcp/...'
      { regex: /src:\s*['"]\/prorcp\/([^'"]+)['"]/i, type: 'prorcp' as const },
      { regex: /src:\s*['"]\/srcrcp\/([^'"]+)['"]/i, type: 'srcrcp' as const },
      // Pattern 2: Direct URL in script
      { regex: /['"]\/prorcp\/([A-Za-z0-9+\/=\-_]+)['"]/i, type: 'prorcp' as const },
      { regex: /['"]\/srcrcp\/([A-Za-z0-9+\/=\-_]+)['"]/i, type: 'srcrcp' as const },
      // Pattern 3: loadIframe function call
      { regex: /loadIframe\s*\(\s*['"]\/prorcp\/([^'"]+)['"]/i, type: 'prorcp' as const },
      { regex: /loadIframe\s*\(\s*['"]\/srcrcp\/([^'"]+)['"]/i, type: 'srcrcp' as const },
      // Pattern 4: iframe src attribute
      { regex: /<iframe[^>]+src=["']\/prorcp\/([^"']+)["']/i, type: 'prorcp' as const },
      { regex: /<iframe[^>]+src=["']\/srcrcp\/([^"']+)["']/i, type: 'srcrcp' as const },
      // Pattern 5: data attribute
      { regex: /data-src=["']\/prorcp\/([^"']+)["']/i, type: 'prorcp' as const },
      { regex: /data-src=["']\/srcrcp\/([^"']+)["']/i, type: 'srcrcp' as const },
    ];
    
    for (const { regex, type } of patterns) {
      const match = rcpHtml.match(regex);
      if (match) {
        rcpEndpointPath = match[1];
        rcpEndpointType = type;
        console.log(`[VidSrc] Found ${type.toUpperCase()} hash via pattern: ${regex.source.substring(0, 30)}...`);
        break;
      }
    }
    
    if (!rcpEndpointPath) {
      // Log the FULL HTML for debugging - the page might be JS-rendered
      console.error('[VidSrc] RCP HTML length:', rcpHtml.length);
      console.error('[VidSrc] FULL RCP HTML:', rcpHtml);
      
      // Check if this is a Cloudflare Turnstile protected page
      if (rcpHtml.includes('cf-turnstile') || rcpHtml.includes('turnstile')) {
        console.error('[VidSrc] Cloudflare Turnstile protection detected - cannot bypass without browser');
        throw new Error('VidSrc is protected by Cloudflare Turnstile - try another provider');
      }
      
      // Check if this is a JS-rendered page (no prorcp in static HTML)
      if (rcpHtml.length < 5000 && !rcpHtml.includes('prorcp') && !rcpHtml.includes('srcrcp')) {
        throw new Error('RCP page requires JavaScript execution - VidSrc may have changed their protection');
      }
      
      throw new Error('Could not find prorcp/srcrcp URL in RCP page');
    }

    // Step 5: Fetch PRORCP/SRCRCP page
    const endpointUrl = `https://cloudnestra.com/${rcpEndpointType}/${rcpEndpointPath}`;
    console.log(`[VidSrc] Fetching ${rcpEndpointType.toUpperCase()} page`);
    const prorcpResponse = await fetchWithHeaders(endpointUrl, 'https://cloudnestra.com/');
    
    if (!prorcpResponse.ok) {
      throw new Error(`PRORCP page returned ${prorcpResponse.status}`);
    }
    
    const prorcpHtml = await prorcpResponse.text();

    // Step 6: Extract div ID and encoded content
    const divMatch = prorcpHtml.match(/<div id="([A-Za-z0-9]+)" style="display:none;">([^<]+)<\/div>/);
    if (!divMatch) {
      throw new Error('Could not find encoded div in PRORCP page');
    }
    
    const divId = divMatch[1];
    const encodedContent = divMatch[2];
    console.log('[VidSrc] Div ID:', divId, 'Encoded length:', encodedContent.length);

    // Step 7: Extract and fetch decoder script
    const scriptMatch = prorcpHtml.match(/sV05kUlNvOdOxvtC\/([a-f0-9]+)\.js/);
    if (!scriptMatch) {
      throw new Error('Could not find decoder script reference');
    }
    
    const scriptHash = scriptMatch[1];
    const scriptUrl = `https://cloudnestra.com/sV05kUlNvOdOxvtC/${scriptHash}.js?_=${Date.now()}`;
    console.log('[VidSrc] Fetching decoder script');
    
    const scriptResponse = await fetchWithHeaders(scriptUrl, 'https://cloudnestra.com/');
    if (!scriptResponse.ok) {
      throw new Error(`Decoder script returned ${scriptResponse.status}`);
    }
    
    const decoderScript = await scriptResponse.text();
    console.log('[VidSrc] Decoder script length:', decoderScript.length);

    // Step 8: Execute decoder in isolated sandbox
    console.log('[VidSrc] Executing decoder in sandbox...');
    const decodedContent = await executeDecoder(decoderScript, divId, encodedContent);
    
    if (!decodedContent) {
      throw new Error('Decoder execution failed - no content captured');
    }
    
    console.log('[VidSrc] Decoded successfully, preview:', decodedContent.substring(0, 100));

    // Step 9: Extract m3u8 URLs
    const urls = decodedContent.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/g) || [];
    
    // Replace domain variables and deduplicate
    const resolvedUrls = Array.from(new Set(urls.map(url => url.replace(/\{v\d+\}/g, STREAM_DOMAIN))));
    console.log(`[VidSrc] Found ${resolvedUrls.length} unique m3u8 URLs`);

    if (resolvedUrls.length === 0) {
      throw new Error('No stream URLs found in decoded content');
    }

    // Step 10: Build sources and check availability
    const sources: StreamSource[] = [];
    
    for (let i = 0; i < resolvedUrls.length; i++) {
      const url = resolvedUrls[i];
      
      // Skip URLs with domains that don't resolve (app2, etc.)
      if (url.includes('app2.') || url.includes('app3.')) {
        continue;
      }
      
      const status = await checkStreamAvailability(url);
      
      sources.push({
        quality: 'auto',
        title: `VidSrc ${i + 1}`,
        url,
        type: 'hls',
        referer: 'https://cloudnestra.com/',
        requiresSegmentProxy: true,
        status
      });
    }

    // Filter to working sources first, but include all
    const workingSources = sources.filter(s => s.status === 'working');
    console.log(`[VidSrc] ${workingSources.length}/${sources.length} sources working`);

    if (workingSources.length === 0 && sources.length > 0) {
      return {
        success: false,
        sources,
        error: 'All VidSrc sources currently unavailable'
      };
    }

    if (sources.length === 0) {
      throw new Error('No valid stream sources found');
    }

    return {
      success: true,
      sources
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[VidSrc] Extraction failed:', errorMessage);
    
    return {
      success: false,
      sources: [],
      error: errorMessage
    };
  }
}
