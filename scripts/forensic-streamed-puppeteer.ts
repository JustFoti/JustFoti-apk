#!/usr/bin/env bun
/**
 * FORENSIC ANALYSIS: Streamed.pk/embedsports.top Stream Extraction
 * 
 * This script uses Puppeteer to:
 * 1. Capture the actual m3u8 URL that gets loaded
 * 2. Intercept the /fetch request and response
 * 3. Capture the WHAT header and response body
 * 4. Reverse engineer the decoding algorithm
 * 
 * FOR DEBUG/TESTING ONLY - Production must use pure fetch!
 */

import puppeteer from 'puppeteer';
import type { HTTPRequest, HTTPResponse } from 'puppeteer';

const EMBED_BASE = 'https://embedsports.top';

interface CapturedData {
  fetchRequest: {
    url: string;
    method: string;
    headers: Record<string, string>;
    postData: string | null;
    postDataBytes: number[];
  } | null;
  fetchResponse: {
    status: number;
    headers: Record<string, string>;
    body: Uint8Array;
    bodyText: string;
  } | null;
  m3u8Url: string | null;
  jwplayerConfig: any;
  consoleMessages: string[];
  networkRequests: Array<{
    url: string;
    method: string;
    resourceType: string;
  }>;
}

async function forensicCapture(source: string, id: string, streamNo: string): Promise<CapturedData> {
  const captured: CapturedData = {
    fetchRequest: null,
    fetchResponse: null,
    m3u8Url: null,
    jwplayerConfig: null,
    consoleMessages: [],
    networkRequests: [],
  };

  console.log(`\n${'='.repeat(80)}`);
  console.log(`FORENSIC CAPTURE: ${source}/${id}/${streamNo}`);
  console.log(`${'='.repeat(80)}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });

  const page = await browser.newPage();

  // Set up CDP session for raw network capture
  const client = await page.createCDPSession();
  await client.send('Network.enable');
  await client.send('Network.setRequestInterception', { patterns: [{ urlPattern: '*' }] });

  // Store request bodies
  const requestBodies: Map<string, string> = new Map();

  client.on('Network.requestIntercepted', async (params) => {
    const { interceptionId, request } = params;
    
    if (request.url.includes('/fetch')) {
      console.log(`[CDP] Intercepted /fetch request`);
      if (request.postData) {
        requestBodies.set(request.url, request.postData);
      }
    }
    
    await client.send('Network.continueInterceptedRequest', { interceptionId });
  });

  // Capture console messages
  page.on('console', (msg) => {
    const text = msg.text();
    captured.consoleMessages.push(text);
    if (text.includes('m3u8') || text.includes('strmd') || text.includes('secure')) {
      console.log(`[Console] ${text}`);
    }
  });

  // Capture all network requests
  await page.setRequestInterception(true);
  
  page.on('request', async (request: HTTPRequest) => {
    const url = request.url();
    
    captured.networkRequests.push({
      url,
      method: request.method(),
      resourceType: request.resourceType(),
    });

    // Capture /fetch request details
    if (url.includes('/fetch')) {
      const postData = request.postData();
      captured.fetchRequest = {
        url,
        method: request.method(),
        headers: request.headers(),
        postData: postData || null,
        postDataBytes: postData ? Array.from(Buffer.from(postData, 'binary')) : [],
      };
      console.log(`\n[Request] POST /fetch`);
      console.log(`  Headers:`, JSON.stringify(request.headers(), null, 2));
      if (captured.fetchRequest) {
        console.log(`  PostData bytes:`, captured.fetchRequest.postDataBytes);
      }
    }

    // Capture m3u8 URL
    if (url.includes('.m3u8') && url.includes('strmd.top')) {
      captured.m3u8Url = url;
      console.log(`\n*** CAPTURED M3U8 URL: ${url}`);
    }

    request.continue();
  });

  page.on('response', async (response: HTTPResponse) => {
    const url = response.url();
    
    // Capture /fetch response
    if (url.includes('/fetch')) {
      try {
        const buffer = await response.buffer();
        const headers: Record<string, string> = {};
        response.headers();
        
        // Get all headers
        for (const [key, value] of Object.entries(response.headers())) {
          headers[key] = value;
        }

        captured.fetchResponse = {
          status: response.status(),
          headers,
          body: new Uint8Array(buffer),
          bodyText: buffer.toString('binary'),
        };

        console.log(`\n[Response] /fetch`);
        console.log(`  Status: ${response.status()}`);
        console.log(`  WHAT header: ${headers['what']}`);
        console.log(`  Body length: ${buffer.length}`);
        console.log(`  Body bytes (first 50):`, Array.from(buffer.slice(0, 50)));
        console.log(`  Body as string:`, buffer.toString('binary').substring(0, 100));
      } catch (e) {
        console.log(`[Response] /fetch - Could not get body: ${e}`);
      }
    }
  });

  // Navigate to embed page
  const embedUrl = `${EMBED_BASE}/embed/${source}/${id}/${streamNo}`;
  console.log(`Loading: ${embedUrl}\n`);

  try {
    await page.goto(embedUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for stream to initialize
    await new Promise(r => setTimeout(r, 5000));

    // Try to get JWPlayer config
    captured.jwplayerConfig = await page.evaluate(() => {
      // @ts-ignore
      if (typeof jwplayer !== 'undefined') {
        // @ts-ignore
        const player = jwplayer();
        return {
          playlist: player.getPlaylist?.(),
          config: player.getConfig?.(),
          currentItem: player.getPlaylistItem?.(),
        };
      }
      return null;
    });

    if (captured.jwplayerConfig) {
      console.log(`\n[JWPlayer] Config captured`);
      console.log(JSON.stringify(captured.jwplayerConfig, null, 2));
    }

    // If we didn't capture m3u8 from network, try to get it from player
    if (!captured.m3u8Url && captured.jwplayerConfig?.playlist?.[0]?.file) {
      captured.m3u8Url = captured.jwplayerConfig.playlist[0].file;
      console.log(`\n*** M3U8 from JWPlayer: ${captured.m3u8Url}`);
    }

  } catch (error) {
    console.error('Error during capture:', error);
  }

  await browser.close();
  return captured;
}

function analyzeCapture(captured: CapturedData): void {
  console.log(`\n${'='.repeat(80)}`);
  console.log('ANALYSIS');
  console.log(`${'='.repeat(80)}\n`);

  if (!captured.fetchResponse || !captured.m3u8Url) {
    console.log('Missing data for analysis');
    return;
  }

  const whatHeader = captured.fetchResponse.headers['what'];
  const responseBody = captured.fetchResponse.body;
  const m3u8Url = captured.m3u8Url;

  console.log('WHAT header:', whatHeader);
  console.log('WHAT length:', whatHeader?.length);
  console.log('Response body length:', responseBody.length);
  console.log('M3U8 URL:', m3u8Url);

  // Parse the m3u8 URL to extract the token
  const urlParts = new URL(m3u8Url);
  const pathParts = urlParts.pathname.split('/');
  const secureIndex = pathParts.indexOf('secure');
  const token = pathParts[secureIndex + 1];

  console.log('\nURL Analysis:');
  console.log('  Host:', urlParts.host);
  console.log('  Path parts:', pathParts);
  console.log('  Token:', token);
  console.log('  Token length:', token?.length);

  // Parse protobuf response
  console.log('\nProtobuf Response Analysis:');
  let idx = 0;
  while (idx < responseBody.length) {
    const tag = responseBody[idx];
    const fieldNum = tag >> 3;
    const wireType = tag & 0x7;
    
    console.log(`  Field ${fieldNum}, Wire type ${wireType} at offset ${idx}`);
    
    if (wireType === 2) { // Length-delimited
      idx++;
      let length = 0;
      let shift = 0;
      while (idx < responseBody.length && (responseBody[idx] & 0x80) !== 0) {
        length |= (responseBody[idx] & 0x7f) << shift;
        shift += 7;
        idx++;
      }
      length |= (responseBody[idx] & 0x7f) << shift;
      idx++;
      
      const data = responseBody.slice(idx, idx + length);
      const dataStr = new TextDecoder().decode(data);
      console.log(`    Length: ${length}`);
      console.log(`    Data: ${dataStr.substring(0, 100)}${dataStr.length > 100 ? '...' : ''}`);
      
      // This is the encoded URL data
      if (fieldNum === 1 && length > 50) {
        console.log('\n  === ENCODED URL DATA ===');
        console.log(`  Encoded length: ${dataStr.length}`);
        console.log(`  Expected decoded: ${m3u8Url}`);
        console.log(`  Expected length: ${m3u8Url.length}`);
        
        // Try to find the decoding algorithm
        console.log('\n  === DECODING ATTEMPTS ===');
        
        // Method 1: Simple XOR with WHAT header
        let decoded1 = '';
        for (let i = 0; i < dataStr.length; i++) {
          decoded1 += String.fromCharCode(dataStr.charCodeAt(i) ^ whatHeader.charCodeAt(i % whatHeader.length));
        }
        console.log(`  XOR with WHAT: ${decoded1.substring(0, 80)}`);
        const match1 = decoded1.startsWith('https://lb');
        console.log(`    Matches expected prefix: ${match1}`);
        
        if (match1) {
          console.log('\n  *** SUCCESS: Simple XOR with WHAT header works! ***');
          console.log(`  Decoded URL: ${decoded1}`);
          
          // Verify it matches the captured URL
          console.log(`  Matches captured: ${decoded1 === m3u8Url}`);
        } else {
          // Try other methods
          
          // Method 2: XOR with WHAT[7:] (skip "ISEEYO" prefix if present)
          if (whatHeader.startsWith('ISEEYO')) {
            const whatSuffix = whatHeader.substring(7);
            let decoded2 = '';
            for (let i = 0; i < dataStr.length; i++) {
              decoded2 += String.fromCharCode(dataStr.charCodeAt(i) ^ whatSuffix.charCodeAt(i % whatSuffix.length));
            }
            console.log(`  XOR with WHAT[7:]: ${decoded2.substring(0, 80)}`);
            if (decoded2.startsWith('https://lb')) {
              console.log('\n  *** SUCCESS: XOR with WHAT[7:] works! ***');
            }
          }
          
          // Method 3: Derive key from known plaintext
          console.log('\n  Deriving key from known plaintext...');
          const expectedPrefix = 'https://lb';
          const derivedKey: number[] = [];
          for (let i = 0; i < expectedPrefix.length; i++) {
            derivedKey.push(dataStr.charCodeAt(i) ^ expectedPrefix.charCodeAt(i));
          }
          console.log(`  Derived key bytes: ${derivedKey}`);
          console.log(`  Derived key chars: ${derivedKey.map(b => String.fromCharCode(b)).join('')}`);
          
          // Check if derived key matches WHAT header pattern
          let keyMatchesWhat = true;
          for (let i = 0; i < derivedKey.length; i++) {
            if (derivedKey[i] !== whatHeader.charCodeAt(i % whatHeader.length)) {
              keyMatchesWhat = false;
              break;
            }
          }
          console.log(`  Derived key matches WHAT: ${keyMatchesWhat}`);
          
          // Try RC4
          console.log('\n  Trying RC4...');
          function rc4(key: string, data: string): string {
            const S = new Array(256);
            for (let i = 0; i < 256; i++) S[i] = i;
            
            let j = 0;
            for (let i = 0; i < 256; i++) {
              j = (j + S[i] + key.charCodeAt(i % key.length)) % 256;
              [S[i], S[j]] = [S[j], S[i]];
            }
            
            let result = '';
            let ii = 0;
            j = 0;
            for (let k = 0; k < data.length; k++) {
              ii = (ii + 1) % 256;
              j = (j + S[ii]) % 256;
              [S[ii], S[j]] = [S[j], S[ii]];
              const K = S[(S[ii] + S[j]) % 256];
              result += String.fromCharCode(data.charCodeAt(k) ^ K);
            }
            
            return result;
          }
          
          const rc4Decoded = rc4(whatHeader, dataStr);
          console.log(`  RC4 with WHAT: ${rc4Decoded.substring(0, 80)}`);
          if (rc4Decoded.startsWith('https://lb')) {
            console.log('\n  *** SUCCESS: RC4 with WHAT header works! ***');
          }
        }
      }
      
      idx += length;
    } else {
      idx++;
    }
  }
}

async function main() {
  // Test with a known live stream
  // You can change these to test different streams
  const testCases = [
    { source: 'alpha', id: 'nba-tv-1', streamNo: '1' },
    // Add more test cases as needed
  ];

  for (const test of testCases) {
    const captured = await forensicCapture(test.source, test.id, test.streamNo);
    analyzeCapture(captured);
    
    // Save captured data for further analysis
    const filename = `forensic-capture-${test.source}-${test.id}.json`;
    await Bun.write(filename, JSON.stringify({
      ...captured,
      fetchResponse: captured.fetchResponse ? {
        ...captured.fetchResponse,
        body: Array.from(captured.fetchResponse.body),
      } : null,
    }, null, 2));
    console.log(`\nSaved capture to ${filename}`);
  }
}

main().catch(console.error);
