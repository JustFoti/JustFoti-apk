#!/usr/bin/env bun
/**
 * Decode the /fetch response to get the stream URL
 */

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchStreamUrl(source: string, id: string, streamNo: string) {
  console.log(`=== Fetching stream URL for ${source}/${id}/${streamNo} ===`);
  
  // The request body is just the concatenation of source + id + streamNo
  const body = `${source}${id}${streamNo}`;
  
  const res = await fetch('https://embedsports.top/fetch', {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': `https://embedsports.top/embed/${source}/${id}/${streamNo}`,
      'Origin': 'https://embedsports.top',
      'Content-Type': 'application/octet-stream',
    },
    body: body,
  });
  
  console.log('Status:', res.status);
  console.log('Headers:');
  res.headers.forEach((value, key) => {
    console.log(`  ${key}: ${value}`);
  });
  
  // The WHAT header contains a token
  const whatHeader = res.headers.get('what');
  console.log('\nWHAT header (token):', whatHeader);
  
  // Get the response body
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  console.log('\nResponse body (raw bytes):', bytes.length, 'bytes');
  console.log('First 50 bytes:', Array.from(bytes.slice(0, 50)));
  
  // Try different decodings
  console.log('\n=== Trying different decodings ===');
  
  // As UTF-8
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  console.log('UTF-8:', utf8.substring(0, 100));
  
  // As Latin1
  const latin1 = new TextDecoder('latin1').decode(bytes);
  console.log('Latin1:', latin1.substring(0, 100));
  
  // XOR with common keys
  console.log('\n=== Trying XOR decoding ===');
  
  // The WHAT header might be the XOR key
  if (whatHeader) {
    const keyBytes = new TextEncoder().encode(whatHeader);
    const xored = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      xored[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
    }
    const xorResult = new TextDecoder('utf-8').decode(xored);
    console.log('XOR with WHAT header:', xorResult.substring(0, 200));
    
    if (xorResult.includes('http') || xorResult.includes('strmd')) {
      console.log('\n*** FOUND STREAM URL! ***');
      console.log(xorResult);
    }
  }
  
  // Try simple XOR with single bytes
  for (const key of [0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80, 0x90, 0xa0]) {
    const xored = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      xored[i] = bytes[i] ^ key;
    }
    const result = new TextDecoder('utf-8', { fatal: false }).decode(xored);
    if (result.includes('http') || result.includes('strmd') || result.includes('.m3u8')) {
      console.log(`XOR with 0x${key.toString(16)}:`, result.substring(0, 200));
    }
  }
  
  // Try base64 decode
  console.log('\n=== Trying base64 decode ===');
  try {
    const b64 = Buffer.from(bytes).toString('base64');
    console.log('As base64:', b64.substring(0, 100));
    
    // Try decoding the UTF-8 as base64
    try {
      const decoded = Buffer.from(utf8, 'base64').toString('utf-8');
      console.log('UTF-8 decoded as base64:', decoded.substring(0, 100));
    } catch {}
  } catch {}
  
  return { whatHeader, bytes };
}

async function analyzeWithPuppeteer() {
  console.log('\n\n=== Analyzing how the page decodes the response ===');
  
  const puppeteer = await import('puppeteer');
  
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    devtools: false,
  });
  
  const page = await browser.newPage();
  
  // Inject code to intercept the decoding
  await page.evaluateOnNewDocument(() => {
    // Override TextDecoder
    const OriginalTextDecoder = TextDecoder;
    // @ts-ignore
    window.TextDecoder = class extends OriginalTextDecoder {
      decode(input: any, options?: any) {
        const result = super.decode(input, options);
        if (result.includes('strmd') || result.includes('.m3u8')) {
          console.log('DECODED:', result);
        }
        return result;
      }
    };
    
    // Override atob
    const originalAtob = window.atob;
    window.atob = function(data: string) {
      const result = originalAtob(data);
      if (result.includes('strmd') || result.includes('.m3u8') || result.includes('http')) {
        console.log('ATOB:', result);
      }
      return result;
    };
  });
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('DECODED:') || text.includes('ATOB:') || text.includes('strmd')) {
      console.log('PAGE:', text);
    }
  });
  
  const embedUrl = 'https://embedsports.top/embed/charlie/final-1629472869/1';
  
  try {
    await page.goto(embedUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(r => setTimeout(r, 5000));
    
    // Get the final stream URL from JWPlayer
    const streamUrl = await page.evaluate(() => {
      // @ts-ignore
      if (typeof jwplayer !== 'undefined') {
        // @ts-ignore
        const player = jwplayer();
        const playlist = player.getPlaylist?.();
        if (playlist && playlist[0]) {
          return playlist[0].file || playlist[0].sources?.[0]?.file;
        }
      }
      return null;
    });
    
    console.log('\nFinal stream URL from JWPlayer:', streamUrl);
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
}

// Run
fetchStreamUrl('charlie', 'final-1629472869', '1')
  .then(() => analyzeWithPuppeteer())
  .catch(console.error);
