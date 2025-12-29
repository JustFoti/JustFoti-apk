#!/usr/bin/env bun
/**
 * Extract the stream URL using Puppeteer
 * This is for forensic analysis - production must use pure fetch
 */

import puppeteer from 'puppeteer';

async function extractStreamUrl(source: string, id: string, streamNo: string): Promise<string | null> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  
  // Store the captured URL
  let capturedUrl: string | null = null;
  let capturedWhat: string | null = null;
  let capturedEncoded: string | null = null;
  
  // Hook fetch to capture the WHAT header and encoded data
  await page.evaluateOnNewDocument(() => {
    const originalFetch = window.fetch;
    // @ts-ignore
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const response = await originalFetch.apply(window, [input, init]);
      
      if (url.includes('/fetch')) {
        // @ts-ignore
        window.__WHAT_HEADER__ = response.headers.get('what');
        
        const clone = response.clone();
        const buffer = await clone.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        
        // Parse protobuf
        let idx = 1;
        let length = 0;
        let shift = 0;
        while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) {
          length |= (bytes[idx] & 0x7f) << shift;
          shift += 7;
          idx++;
        }
        length |= (bytes[idx] & 0x7f) << shift;
        idx++;
        
        // @ts-ignore
        window.__ENCODED_DATA__ = String.fromCharCode(...bytes.slice(idx, idx + length));
      }
      
      return response;
    };
  });
  
  const embedUrl = `https://embedsports.top/embed/${source}/${id}/${streamNo}`;
  console.log('Loading:', embedUrl);
  
  try {
    await page.goto(embedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    
    // Wait for the player to initialize
    await new Promise(r => setTimeout(r, 8000));
    
    // Get the captured data
    const data = await page.evaluate(() => {
      // @ts-ignore
      const whatHeader = window.__WHAT_HEADER__;
      // @ts-ignore
      const encodedData = window.__ENCODED_DATA__;
      
      // Get the JWPlayer file URL
      let fileUrl = null;
      // @ts-ignore
      if (typeof jwplayer !== 'undefined') {
        // @ts-ignore
        const player = jwplayer();
        const playlist = player.getPlaylist?.();
        if (playlist?.[0]) {
          fileUrl = playlist[0].file;
        }
      }
      
      return { whatHeader, encodedData, fileUrl };
    });
    
    capturedWhat = data.whatHeader;
    capturedEncoded = data.encodedData;
    capturedUrl = data.fileUrl;
    
    console.log('\nWHAT header:', capturedWhat);
    console.log('Encoded data:', capturedEncoded?.substring(0, 80));
    console.log('Decoded URL:', capturedUrl);
    
    // Now let's analyze the decoding
    if (capturedWhat && capturedEncoded && capturedUrl) {
      console.log('\n=== Decoding Analysis ===');
      
      // Derive the XOR key
      const derivedKey: number[] = [];
      for (let i = 0; i < Math.min(capturedEncoded.length, capturedUrl.length); i++) {
        derivedKey.push(capturedEncoded.charCodeAt(i) ^ capturedUrl.charCodeAt(i));
      }
      
      console.log('Derived key (first 64):', derivedKey.slice(0, 64));
      console.log('As string:', derivedKey.slice(0, 64).map(b => String.fromCharCode(b)).join(''));
      
      // Check if key matches WHAT header
      const whatBytes = capturedWhat.split('').map(c => c.charCodeAt(0));
      let matchesWhat = true;
      for (let i = 0; i < Math.min(derivedKey.length, 32); i++) {
        if (derivedKey[i] !== whatBytes[i % 32]) {
          matchesWhat = false;
          break;
        }
      }
      console.log('\nKey matches WHAT repeated:', matchesWhat);
      
      if (!matchesWhat) {
        // Find the pattern
        const xorWithWhat = derivedKey.slice(0, 32).map((k, i) => k ^ whatBytes[i]);
        console.log('Key XOR WHAT:', xorWithWhat);
        console.log('As string:', xorWithWhat.map(b => String.fromCharCode(b)).join(''));
        
        // Check if this is constant
        const uniqueXors = [...new Set(xorWithWhat)];
        console.log('Unique XOR values:', uniqueXors.length);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
  return capturedUrl;
}

// Test
const source = 'alpha';
const id = 'nba-tv-1';
const streamNo = '1';

console.log(`Extracting stream URL for ${source}/${id}/${streamNo}...\n`);
extractStreamUrl(source, id, streamNo).then(url => {
  console.log('\n=== Final Result ===');
  console.log('Stream URL:', url);
});
