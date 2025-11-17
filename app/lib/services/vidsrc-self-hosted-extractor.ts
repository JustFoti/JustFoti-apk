/**
 * VidSrc Self-Hosted Extractor
 * 
 * Uses the self-hosted decoder to extract M3U8 URLs without relying on
 * vidsrc-embed.ru's prorcp pages.
 * 
 * This is the production implementation that integrates with the existing
 * extraction infrastructure.
 */

// @ts-ignore
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { join } from 'path';

// Cache for decoder script
let DECODER_SCRIPT: string | null = null;

/**
 * Load the decoder script once
 */
function loadDecoderScript(): string {
  if (!DECODER_SCRIPT) {
    try {
      const scriptPath = join(process.cwd(), 'decoder-obfuscated.js');
      DECODER_SCRIPT = readFileSync(scriptPath, 'utf8');
      console.log('[Self-Hosted Decoder] Loaded decoder script');
    } catch (error) {
      throw new Error(
        'Decoder script not found. Run: node DOWNLOAD-AND-DEOBFUSCATE-DECODER.js'
      );
    }
  }
  return DECODER_SCRIPT;
}

/**
 * Decode a hidden div using the self-hosted decoder with JSDOM
 */
export async function decodeHiddenDiv(
  divContent: string,
  dataI: string,
  divId: string
): Promise<string | null> {
  try {
    const decoderScript = loadDecoderScript();

    // Create minimal DOM environment with JSDOM
    const dom = new JSDOM(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <script>${decoderScript}</script>
      </head>
      <body data-i="${dataI}">
        <div id="${divId}" style="display:none;">${divContent}</div>
      </body>
      </html>
    `,
      {
        url: 'https://cloudnestra.com/prorcp/local',
        runScripts: 'dangerously',
        resources: 'usable',
        beforeParse(window: any) {
          // Suppress console output from decoder
          window.console.log = () => {};
          window.console.error = () => {};
          window.console.warn = () => {};
          window.console.info = () => {};
          window.console.debug = () => {};
        },
      }
    );

    // Wait for decoder to execute
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Extract result from window
    const result = (dom.window as any)[divId];

    if (result && typeof result === 'string') {
      console.log('[Self-Hosted Decoder] Successfully decoded');
      return result;
    }

    console.warn('[Self-Hosted Decoder] No value found');
    return null;
  } catch (error) {
    console.error('[Self-Hosted Decoder] Error:', error);
    return null;
  }
}

/**
 * Extract M3U8 URL from vidsrc-embed.ru using self-hosted decoder
 */
export async function extractVidsrcSelfHosted(
  tmdbId: string,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    console.log('[VidSrc Self-Hosted] Starting extraction', { tmdbId, type, season, episode });

    // Step 1: Fetch embed page
    const embedUrl = type === 'movie'
      ? `https://vidsrc-embed.ru/embed/movie/${tmdbId}`
      : `https://vidsrc-embed.ru/embed/tv/${tmdbId}/${season}/${episode}`;

    console.log('[VidSrc Self-Hosted] Fetching embed page:', embedUrl);

    const embedResponse = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://vidsrc-embed.ru/'
      }
    });

    if (!embedResponse.ok) {
      throw new Error(`Failed to fetch embed page: ${embedResponse.status}`);
    }

    const embedHtml = await embedResponse.text();

    // Step 2: Extract RCP hash
    const rcpHashMatch = embedHtml.match(/\/rcp\/([a-zA-Z0-9+\/=]+)/);
    if (!rcpHashMatch) {
      throw new Error('Failed to extract RCP hash from embed page');
    }

    const rcpHash = rcpHashMatch[1];
    console.log('[VidSrc Self-Hosted] Extracted RCP hash');

    // Step 3: Fetch RCP page
    const rcpUrl = `https://cloudnestra.com/rcp/${rcpHash}`;
    console.log('[VidSrc Self-Hosted] Fetching RCP page');

    const rcpResponse = await fetch(rcpUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://vidsrc-embed.ru/'
      }
    });

    if (!rcpResponse.ok) {
      throw new Error(`Failed to fetch RCP page: ${rcpResponse.status}`);
    }

    const rcpHtml = await rcpResponse.text();

    // Step 4: Extract ProRCP URL
    const proRcpMatch = rcpHtml.match(/\/prorcp\/([a-zA-Z0-9+\/=]+)/);
    if (!proRcpMatch) {
      throw new Error('Failed to extract ProRCP URL from RCP page');
    }

    const proRcpHash = proRcpMatch[1];
    console.log('[VidSrc Self-Hosted] Extracted ProRCP hash');

    // Step 5: Fetch ProRCP page
    const proRcpUrl = `https://cloudnestra.com/prorcp/${proRcpHash}`;
    console.log('[VidSrc Self-Hosted] Fetching ProRCP page');

    const proRcpResponse = await fetch(proRcpUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://vidsrc-embed.ru/'
      }
    });

    if (!proRcpResponse.ok) {
      throw new Error(`Failed to fetch ProRCP page: ${proRcpResponse.status}`);
    }

    const proRcpHtml = await proRcpResponse.text();

    // Step 6: Extract hidden div
    const divMatch = proRcpHtml.match(/<div[^>]+id=["']([^"']+)["'][^>]*style=["'][^"']*display:\s*none[^"']*["'][^>]*>([^<]+)<\/div>/);
    if (!divMatch) {
      throw new Error('Failed to extract hidden div from ProRCP page');
    }

    const divId = divMatch[1];
    const divContent = divMatch[2];
    console.log('[VidSrc Self-Hosted] Extracted hidden div:', divId);

    // Step 7: Extract data-i attribute
    const dataIMatch = proRcpHtml.match(/data-i=["']([^"']+)["']/);
    if (!dataIMatch) {
      throw new Error('Failed to extract data-i attribute');
    }

    const dataI = dataIMatch[1];
    console.log('[VidSrc Self-Hosted] Extracted data-i:', dataI);

    // Step 8: Decode using self-hosted decoder
    console.log('[VidSrc Self-Hosted] Decoding with self-hosted decoder');
    const m3u8Url = await decodeHiddenDiv(divContent, dataI, divId);

    if (!m3u8Url) {
      throw new Error('Failed to decode hidden div');
    }

    console.log('[VidSrc Self-Hosted] Successfully extracted M3U8 URL');

    return {
      success: true,
      url: m3u8Url
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[VidSrc Self-Hosted] Extraction failed:', errorMessage);

    return {
      success: false,
      error: errorMessage
    };
  }
}
