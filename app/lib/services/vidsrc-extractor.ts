/**
 * VidSrc Extractor
 * Extracts streams from vidsrc-embed.ru → cloudnestra.com
 *
 * ✅ STATUS: WORKING - January 2026
 * Updated to extract file URLs directly from PlayerJS initialization.
 * No decoding required - URLs are embedded in the page source.
 *
 * TURNSTILE BYPASS:
 * If Cloudflare Turnstile appears, you can optionally use a captcha solving service.
 * Set CAPSOLVER_API_KEY in your environment to enable automatic Turnstile solving.
 * Cost: ~$2-3 per 1000 solves at https://capsolver.com
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

// ✅ VidSrc is now ENABLED by default - no security risk as we don't execute remote code
export const VIDSRC_ENABLED = process.env.ENABLE_VIDSRC_PROVIDER !== 'false';

// Optional: Captcha solving service API key for Turnstile bypass
const CAPSOLVER_API_KEY = process.env.CAPSOLVER_API_KEY;

// Rate limiting configuration
const VIDSRC_MIN_DELAY_MS = 500;  // Minimum delay between requests
const VIDSRC_MAX_DELAY_MS = 3000; // Maximum delay for backoff
const VIDSRC_BACKOFF_MULTIPLIER = 1.5;

// Track rate limit state
let vidsrcLastRequestTime = 0;
let vidsrcConsecutiveFailures = 0;

/**
 * Delay with exponential backoff based on consecutive failures
 */
async function vidsrcRateLimitDelay(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - vidsrcLastRequestTime;
  
  // Calculate delay with exponential backoff
  const backoffDelay = Math.min(
    VIDSRC_MIN_DELAY_MS * Math.pow(VIDSRC_BACKOFF_MULTIPLIER, vidsrcConsecutiveFailures),
    VIDSRC_MAX_DELAY_MS
  );
  
  // Ensure minimum time between requests
  const requiredDelay = Math.max(0, backoffDelay - timeSinceLastRequest);
  
  if (requiredDelay > 0) {
    console.log(`[VidSrc] Rate limit delay: ${Math.round(requiredDelay)}ms (failures: ${vidsrcConsecutiveFailures})`);
    await new Promise(resolve => setTimeout(resolve, requiredDelay));
  }
  
  vidsrcLastRequestTime = Date.now();
}

/**
 * Fetch with proper headers, timeout, and rate limiting
 * Uses browser-like headers to avoid Cloudflare detection
 */
async function fetchWithHeaders(url: string, referer?: string, timeoutMs: number = 15000, retryCount: number = 0): Promise<Response> {
  const MAX_RETRIES = 2;
  
  // Apply rate limiting delay before each request
  await vidsrcRateLimitDelay();
  
  const headers: HeadersInit = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': referer ? 'cross-site' : 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
  };

  if (referer) {
    headers['Referer'] = referer;
    // Add Origin header for cross-origin requests
    try {
      const refererUrl = new URL(referer);
      headers['Origin'] = refererUrl.origin;
    } catch {
      // Invalid referer URL, skip Origin
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      // Follow redirects
      redirect: 'follow',
    });
    clearTimeout(timeoutId);
    
    // Handle rate limiting (429)
    if (response.status === 429) {
      vidsrcConsecutiveFailures++;
      console.log(`[VidSrc] HTTP 429 (rate limited), failures: ${vidsrcConsecutiveFailures}`);
      
      // Check for Retry-After header
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        const waitTime = parseInt(retryAfter) * 1000 || 5000;
        console.log(`[VidSrc] Retry-After header: waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // Retry with exponential backoff
      if (retryCount < MAX_RETRIES) {
        const backoffWait = VIDSRC_MIN_DELAY_MS * Math.pow(2, retryCount + 1);
        console.log(`[VidSrc] Retrying after ${backoffWait}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, backoffWait));
        return fetchWithHeaders(url, referer, timeoutMs, retryCount + 1);
      }
    }
    
    // Success - reduce failure counter
    if (response.ok) {
      vidsrcConsecutiveFailures = Math.max(0, vidsrcConsecutiveFailures - 1);
    } else {
      vidsrcConsecutiveFailures++;
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    vidsrcConsecutiveFailures++;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Solve Cloudflare Turnstile using CapSolver API
 * Requires CAPSOLVER_API_KEY environment variable
 * @returns The Turnstile token or null if solving fails/not configured
 */
async function solveTurnstile(
  siteKey: string,
  pageUrl: string
): Promise<string | null> {
  if (!CAPSOLVER_API_KEY) {
    console.log('[VidSrc] No CAPSOLVER_API_KEY configured - cannot solve Turnstile');
    return null;
  }

  console.log('[VidSrc] Attempting to solve Turnstile via CapSolver...');

  try {
    // Create task
    const createResponse = await fetch('https://api.capsolver.com/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientKey: CAPSOLVER_API_KEY,
        task: {
          type: 'AntiTurnstileTaskProxyLess',
          websiteURL: pageUrl,
          websiteKey: siteKey,
        },
      }),
    });

    const createData = (await createResponse.json()) as {
      taskId?: string;
      errorId?: number;
    };
    if (!createData.taskId) {
      console.error('[VidSrc] CapSolver task creation failed');
      return null;
    }

    // Poll for result (max 60 seconds)
    const maxAttempts = 20;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 3000));

      const resultResponse = await fetch(
        'https://api.capsolver.com/getTaskResult',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientKey: CAPSOLVER_API_KEY,
            taskId: createData.taskId,
          }),
        }
      );

      const resultData = (await resultResponse.json()) as {
        status?: string;
        solution?: { token?: string };
      };

      if (resultData.status === 'ready' && resultData.solution?.token) {
        console.log('[VidSrc] Turnstile solved successfully!');
        return resultData.solution.token;
      }

      if (resultData.status === 'failed') {
        console.error('[VidSrc] CapSolver task failed');
        return null;
      }
    }

    console.error('[VidSrc] CapSolver timeout');
    return null;
  } catch (error) {
    console.error('[VidSrc] CapSolver error:', error);
    return null;
  }
}

/**
 * Submit Turnstile token to verify endpoint
 */
async function submitTurnstileToken(
  verifyUrl: string,
  token: string,
  referer: string
): Promise<string | null> {
  try {
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: referer,
        Origin: new URL(referer).origin,
      },
      body: `token=${encodeURIComponent(token)}`,
    });

    if (response.ok) {
      return await response.text();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Small delay to avoid rate limiting - now uses the rate limit system
 */
async function randomDelay(): Promise<void> {
  await vidsrcRateLimitDelay();
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
 * ✅ ENABLED BY DEFAULT - No security risk as we extract URLs directly from page
 */
export async function extractVidSrcStreams(
  tmdbId: string,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number
): Promise<ExtractionResult> {
  if (!VIDSRC_ENABLED) {
    console.warn('[VidSrc] Provider is disabled. Set ENABLE_VIDSRC_PROVIDER=true to enable.');
    return {
      success: false,
      sources: [],
      error: 'VidSrc provider is disabled.'
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

    // Small delay to avoid rate limiting
    await randomDelay();

    // Step 3: Fetch RCP page to get prorcp URL
    const rcpUrl = `https://cloudnestra.com/rcp/${rcpPath}`;
    console.log('[VidSrc] Fetching RCP page');
    const rcpResponse = await fetchWithHeaders(rcpUrl, 'https://vidsrc-embed.ru/');
    
    if (!rcpResponse.ok) {
      throw new Error(`RCP page returned ${rcpResponse.status}`);
    }
    
    let rcpHtml = await rcpResponse.text();

    // Step 4: Extract prorcp OR srcrcp URL (site uses both dynamically)
    let rcpEndpointPath: string | null = null;
    let rcpEndpointType: 'prorcp' | 'srcrcp' = 'prorcp';
    
    // Check for Cloudflare Turnstile first
    if (rcpHtml.includes('cf-turnstile') || rcpHtml.includes('turnstile')) {
      console.log('[VidSrc] Cloudflare Turnstile detected');

      const siteKeyMatch = rcpHtml.match(
        /data-sitekey=["']([^"']+)["']|sitekey:\s*["']([^"']+)["']/i
      );
      const siteKey = siteKeyMatch?.[1] || siteKeyMatch?.[2];

      if (siteKey && CAPSOLVER_API_KEY) {
        console.log('[VidSrc] Attempting Turnstile solve via CapSolver...');
        const token = await solveTurnstile(siteKey, rcpUrl);

        if (token) {
          const verifyMatch = rcpHtml.match(
            /\$\.post\s*\(\s*["']([^"']+)["']\s*,\s*\{\s*token/i
          );
          const verifyUrl = verifyMatch
            ? `https://cloudnestra.com${verifyMatch[1]}`
            : 'https://cloudnestra.com/verify';

          const verifyResult = await submitTurnstileToken(
            verifyUrl,
            token,
            rcpUrl
          );

          if (verifyResult) {
            console.log('[VidSrc] Turnstile verified, re-fetching RCP page...');
            const newRcpResponse = await fetchWithHeaders(
              rcpUrl,
              'https://vidsrc-embed.ru/'
            );
            rcpHtml = await newRcpResponse.text();

            if (
              !rcpHtml.includes('cf-turnstile') &&
              !rcpHtml.includes('turnstile')
            ) {
              console.log('[VidSrc] Turnstile bypass successful!');
            } else {
              console.warn(
                '[VidSrc] Turnstile still present after verification'
              );
              throw new Error(
                'Turnstile verification failed - page still protected'
              );
            }
          } else {
            throw new Error('Turnstile token verification failed');
          }
        } else {
          throw new Error(
            'Failed to solve Turnstile - check CAPSOLVER_API_KEY'
          );
        }
      } else {
        console.warn(
          '[VidSrc] ⚠️ Turnstile detected but no CAPSOLVER_API_KEY configured'
        );
        // Return empty result instead of throwing - allows fallback to other providers
        return {
          success: false,
          sources: [],
          error: 'VidSrc is protected by Cloudflare Turnstile. Configure CAPSOLVER_API_KEY or use alternative providers.'
        };
      }
    }
    
    // Extract prorcp/srcrcp path
    const patterns = [
      { regex: /src:\s*['"]\/prorcp\/([^'"]+)['"]/i, type: 'prorcp' as const },
      { regex: /src:\s*['"]\/srcrcp\/([^'"]+)['"]/i, type: 'srcrcp' as const },
      { regex: /['"]\/prorcp\/([A-Za-z0-9+\/=\-_]+)['"]/i, type: 'prorcp' as const },
      { regex: /['"]\/srcrcp\/([A-Za-z0-9+\/=\-_]+)['"]/i, type: 'srcrcp' as const },
    ];
    
    for (const { regex, type } of patterns) {
      const match = rcpHtml.match(regex);
      if (match) {
        rcpEndpointPath = match[1];
        rcpEndpointType = type;
        break;
      }
    }
    
    if (!rcpEndpointPath) {
      throw new Error('Could not find prorcp/srcrcp URL in RCP page');
    }

    // Small delay before next request
    await randomDelay();

    // Step 5: Fetch PRORCP/SRCRCP page
    const endpointUrl = `https://cloudnestra.com/${rcpEndpointType}/${rcpEndpointPath}`;
    console.log(`[VidSrc] Fetching ${rcpEndpointType.toUpperCase()} page`);
    const prorcpResponse = await fetchWithHeaders(endpointUrl, 'https://cloudnestra.com/');
    
    if (!prorcpResponse.ok) {
      throw new Error(`PRORCP page returned ${prorcpResponse.status}`);
    }
    
    const prorcpHtml = await prorcpResponse.text();

    // Step 6: Extract file URL directly from PlayerJS initialization
    // The file URL is embedded directly in the page, no decoding needed!
    console.log('[VidSrc] Extracting file URL from PlayerJS...');
    
    const fileMatch = prorcpHtml.match(/file:\s*["']([^"']+)["']/);
    if (!fileMatch || !fileMatch[1]) {
      throw new Error('Could not find file URL in PlayerJS initialization');
    }
    
    const fileUrl = fileMatch[1];
    console.log('[VidSrc] Found file URL, length:', fileUrl.length);
    
    // The URL contains multiple alternatives separated by " or "
    const urlAlternatives = fileUrl.split(' or ');
    console.log(`[VidSrc] Found ${urlAlternatives.length} URL alternatives`);
    
    // CDN domains to try (in order of preference)
    const cdnDomains = [
      'shadowlandschronicles.com',
      'shadowlandschronicles.net', 
      'shadowlandschronicles.org',
      'cloudnestra.com',
    ];
    
    // Resolve URLs by replacing {v1}, {v2}, etc. with actual domains
    const resolvedUrls = new Set<string>();
    for (const url of urlAlternatives) {
      // Skip app2/app3 URLs as they often don't work
      if (url.includes('app2.') || url.includes('app3.')) {
        continue;
      }
      
      // Check if URL has domain placeholders
      if (url.includes('{v')) {
        for (const domain of cdnDomains) {
          const resolved = url.replace(/\{v\d+\}/g, domain);
          if (resolved.includes('.m3u8')) {
            resolvedUrls.add(resolved);
          }
        }
      } else if (url.includes('.m3u8')) {
        resolvedUrls.add(url);
      }
    }
    
    console.log(`[VidSrc] Resolved ${resolvedUrls.size} unique URLs`);
    
    if (resolvedUrls.size === 0) {
      throw new Error('No valid stream URLs found');
    }

    // Step 7: Build sources and check availability
    const sources: StreamSource[] = [];
    const urlArray = Array.from(resolvedUrls);
    
    // Test up to 4 URLs to avoid too many requests
    for (let i = 0; i < Math.min(urlArray.length, 4); i++) {
      const url = urlArray[i];
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
