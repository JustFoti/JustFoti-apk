#!/usr/bin/env bun
/**
 * Hook into the runtime to capture the decoding process
 */

import puppeteer from 'puppeteer';

async function hookDecodeRuntime() {
  const source = 'alpha';
  const id = 'nba-tv-1';
  const streamNo = '1';
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  
  // Inject comprehensive hooks before any scripts run
  await page.evaluateOnNewDocument(() => {
    // Store all decoded URLs
    // @ts-ignore
    window.__DECODED_URLS__ = [];
    // @ts-ignore
    window.__FETCH_DATA__ = null;
    
    // Hook fetch to capture the /fetch request and response
    const originalFetch = window.fetch;
    // @ts-ignore
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      const response = await originalFetch.apply(window, [input, init]);
      
      if (url.includes('/fetch')) {
        const whatHeader = response.headers.get('what');
        
        // Clone and read the body
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
        
        const encodedData = bytes.slice(idx, idx + length);
        
        // @ts-ignore
        window.__FETCH_DATA__ = {
          whatHeader,
          encodedBytes: Array.from(encodedData),
          encodedStr: new TextDecoder().decode(encodedData),
        };
        
        console.log('[HOOK] /fetch captured');
        console.log('[HOOK] WHAT:', whatHeader);
      }
      
      return response;
    };
    
    // Hook URL constructor to capture when m3u8 URLs are created
    const OriginalURL = window.URL;
    // @ts-ignore
    window.URL = function(url: string, base?: string) {
      if (typeof url === 'string' && url.includes('strmd.top')) {
        console.log('[HOOK] URL created:', url);
        // @ts-ignore
        window.__DECODED_URLS__.push(url);
      }
      return new OriginalURL(url, base);
    };
    // @ts-ignore
    window.URL.prototype = OriginalURL.prototype;
    // @ts-ignore
    window.URL.createObjectURL = OriginalURL.createObjectURL;
    // @ts-ignore
    window.URL.revokeObjectURL = OriginalURL.revokeObjectURL;
    
    // Hook XMLHttpRequest to capture any XHR requests
    const OriginalXHR = window.XMLHttpRequest;
    // @ts-ignore
    window.XMLHttpRequest = function() {
      const xhr = new OriginalXHR();
      const originalOpen = xhr.open;
      xhr.open = function(method: string, url: string, ...args: any[]) {
        if (url.includes('strmd.top')) {
          console.log('[HOOK] XHR to strmd.top:', url);
          // @ts-ignore
          window.__DECODED_URLS__.push(url);
        }
        return originalOpen.apply(xhr, [method, url, ...args]);
      };
      return xhr;
    };
    
    // Hook any property setter that might set the stream URL
    const originalDefineProperty = Object.defineProperty;
    Object.defineProperty = function(obj: any, prop: string, descriptor: PropertyDescriptor) {
      if (descriptor.value && typeof descriptor.value === 'string' && descriptor.value.includes('strmd.top')) {
        console.log(`[HOOK] Property ${prop} set to:`, descriptor.value);
        // @ts-ignore
        window.__DECODED_URLS__.push(descriptor.value);
      }
      return originalDefineProperty.apply(Object, [obj, prop, descriptor]);
    };
  });
  
  const embedUrl = `https://embedsports.top/embed/${source}/${id}/${streamNo}`;
  console.log('Loading:', embedUrl);
  
  // Capture console messages
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[HOOK]')) {
      console.log(text);
    }
  });
  
  try {
    await page.goto(embedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    
    // Wait for stream to initialize
    await new Promise(r => setTimeout(r, 10000));
    
    // Get the captured data
    const capturedData = await page.evaluate(() => {
      return {
        // @ts-ignore
        fetchData: window.__FETCH_DATA__,
        // @ts-ignore
        decodedUrls: window.__DECODED_URLS__,
      };
    });
    
    console.log('\n=== Captured Data ===');
    console.log('Fetch data:', JSON.stringify(capturedData.fetchData, null, 2));
    console.log('Decoded URLs:', capturedData.decodedUrls);
    
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
    
    // Now analyze the relationship
    if (capturedData.fetchData && fileUrl) {
      const { whatHeader, encodedBytes, encodedStr } = capturedData.fetchData;
      
      console.log('\n=== Analysis ===');
      
      // Extract token from URL
      const urlParts = fileUrl.split('/');
      const secureIndex = urlParts.indexOf('secure');
      const token = urlParts[secureIndex + 1];
      
      console.log('WHAT header:', whatHeader);
      console.log('Token in URL:', token);
      console.log('Encoded string:', encodedStr.substring(0, 50));
      
      // Derive the actual XOR key
      const actualKey: number[] = [];
      for (let i = 0; i < Math.min(encodedBytes.length, fileUrl.length); i++) {
        actualKey.push(encodedBytes[i] ^ fileUrl.charCodeAt(i));
      }
      
      console.log('\nActual XOR key (first 32):', actualKey.slice(0, 32));
      console.log('WHAT bytes:', Array.from(whatHeader).map((c: string) => c.charCodeAt(0)));
      
      // Check if the key is related to WHAT header
      console.log('\nKey vs WHAT comparison:');
      for (let i = 0; i < 32; i++) {
        const keyByte = actualKey[i];
        const whatByte = whatHeader.charCodeAt(i);
        const xor = keyByte ^ whatByte;
        const diff = keyByte - whatByte;
        console.log(`  [${i}] key=${keyByte} WHAT=${whatByte} XOR=${xor} diff=${diff}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
}

hookDecodeRuntime().catch(console.error);
