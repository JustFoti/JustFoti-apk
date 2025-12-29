#!/usr/bin/env bun
/**
 * Intercept the actual decoding function in the browser
 */

import puppeteer from 'puppeteer';

async function interceptDecode() {
  const source = 'alpha';
  const id = 'nba-tv-1';
  const streamNo = '1';
  
  const browser = await puppeteer.launch({
    headless: false, // Use headed mode to see what's happening
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  
  // Inject hooks before any scripts run
  await page.evaluateOnNewDocument(() => {
    // Store the original fetch
    const originalFetch = window.fetch;
    
    // Hook fetch to intercept the /fetch response
    // @ts-ignore
    window.fetch = async function(url: string, options?: RequestInit) {
      const response = await originalFetch.apply(window, [url, options]);
      
      if (typeof url === 'string' && url.includes('/fetch')) {
        const whatHeader = response.headers.get('what');
        console.log('[INTERCEPT] /fetch response');
        console.log('[INTERCEPT] WHAT header:', whatHeader);
        
        // Clone and read the body
        const clone = response.clone();
        const buffer = await clone.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        
        // Parse protobuf to get the encoded data
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
        
        const encodedData = bytes.slice(idx, idx + length);
        const encodedStr = new TextDecoder().decode(encodedData);
        
        console.log('[INTERCEPT] Encoded data:', encodedStr);
        console.log('[INTERCEPT] Encoded bytes:', Array.from(encodedData.slice(0, 50)));
        
        // Store for later analysis
        // @ts-ignore
        window.__INTERCEPT_DATA__ = {
          whatHeader,
          encodedData: Array.from(encodedData),
          encodedStr,
        };
      }
      
      return response;
    };
    
    // Hook JWPlayer setup to capture the final URL
    // @ts-ignore
    const originalDefineProperty = Object.defineProperty;
    Object.defineProperty = function(obj: any, prop: string, descriptor: PropertyDescriptor) {
      if (prop === 'file' && descriptor.value && typeof descriptor.value === 'string' && descriptor.value.includes('strmd.top')) {
        console.log('[INTERCEPT] JWPlayer file set to:', descriptor.value);
        // @ts-ignore
        window.__FINAL_URL__ = descriptor.value;
      }
      return originalDefineProperty.apply(Object, [obj, prop, descriptor]);
    };
  });
  
  const embedUrl = `https://embedsports.top/embed/${source}/${id}/${streamNo}`;
  console.log('Loading:', embedUrl);
  
  // Capture console messages
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[INTERCEPT]')) {
      console.log(text);
    }
  });
  
  await page.goto(embedUrl, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });
  
  // Wait for stream to initialize
  await new Promise(r => setTimeout(r, 10000));
  
  // Get the intercepted data
  const interceptData = await page.evaluate(() => {
    return {
      // @ts-ignore
      interceptData: window.__INTERCEPT_DATA__,
      // @ts-ignore
      finalUrl: window.__FINAL_URL__,
    };
  });
  
  console.log('\n=== Intercepted Data ===');
  console.log(JSON.stringify(interceptData, null, 2));
  
  // Get the JWPlayer file URL
  const fileUrl = await page.evaluate(() => {
    // @ts-ignore
    if (typeof jwplayer !== 'undefined') {
      // @ts-ignore
      const player = jwplayer();
      const playlist = player.getPlaylist?.();
      if (playlist && playlist[0]) {
        return playlist[0].file;
      }
    }
    return null;
  });
  
  console.log('\n=== JWPlayer file URL ===');
  console.log(fileUrl);
  
  // Now let's analyze the relationship
  if (interceptData.interceptData && fileUrl) {
    const { whatHeader, encodedData, encodedStr } = interceptData.interceptData;
    
    console.log('\n=== Analysis ===');
    console.log('WHAT header:', whatHeader);
    console.log('Encoded string:', encodedStr);
    console.log('Final URL:', fileUrl);
    
    // Extract the token from the URL
    const urlParts = fileUrl.split('/');
    const secureIndex = urlParts.indexOf('secure');
    const token = urlParts[secureIndex + 1];
    
    console.log('\nToken from URL:', token);
    console.log('Token length:', token.length);
    
    // The token should be somewhere in the decoded data
    // Let's find where the token appears in the decoded URL
    const expectedUrl = fileUrl;
    const tokenStart = expectedUrl.indexOf(token);
    
    console.log('\nToken starts at position:', tokenStart);
    
    // Now let's try to find the decoding algorithm
    // The encoded data should decode to the URL
    // Let's try different XOR patterns
    
    console.log('\n=== Trying to find decoding algorithm ===');
    
    // Try: simple XOR with WHAT header
    let decoded1 = '';
    for (let i = 0; i < encodedData.length; i++) {
      decoded1 += String.fromCharCode(encodedData[i] ^ whatHeader.charCodeAt(i % whatHeader.length));
    }
    console.log('Simple XOR:', decoded1.substring(0, 80));
    
    // Try: XOR with reversed WHAT header
    const reversedWhat = whatHeader.split('').reverse().join('');
    let decoded2 = '';
    for (let i = 0; i < encodedData.length; i++) {
      decoded2 += String.fromCharCode(encodedData[i] ^ reversedWhat.charCodeAt(i % reversedWhat.length));
    }
    console.log('Reversed WHAT XOR:', decoded2.substring(0, 80));
    
    // Derive the actual key from known plaintext
    const actualKey: number[] = [];
    for (let i = 0; i < Math.min(encodedData.length, expectedUrl.length); i++) {
      actualKey.push(encodedData[i] ^ expectedUrl.charCodeAt(i));
    }
    
    console.log('\nActual key (first 50):', actualKey.slice(0, 50));
    console.log('WHAT bytes (first 50):', Array.from(whatHeader).slice(0, 50).map(c => c.charCodeAt(0)));
    
    // Check if actual key = WHAT XOR something
    console.log('\nXOR between actual key and WHAT:');
    for (let i = 0; i < Math.min(actualKey.length, 20); i++) {
      const whatByte = whatHeader.charCodeAt(i % whatHeader.length);
      const xor = actualKey[i] ^ whatByte;
      console.log(`  [${i}] key=${actualKey[i]} WHAT=${whatByte} XOR=${xor}`);
    }
  }
  
  // Keep browser open for manual inspection
  console.log('\nBrowser will stay open for 30 seconds for manual inspection...');
  await new Promise(r => setTimeout(r, 30000));
  
  await browser.close();
}

interceptDecode().catch(console.error);
