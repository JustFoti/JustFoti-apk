#!/usr/bin/env bun
/**
 * Analyze the embed page to find all JavaScript and the decoding logic
 */

import puppeteer from 'puppeteer';

async function analyzeEmbedPage() {
  const source = 'alpha';
  const id = 'nba-tv-1';
  const streamNo = '1';
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  
  // Capture all JavaScript files loaded
  const jsFiles: string[] = [];
  
  page.on('response', async (response) => {
    const url = response.url();
    if (url.endsWith('.js') || response.headers()['content-type']?.includes('javascript')) {
      jsFiles.push(url);
    }
  });
  
  // Inject a hook to capture the decoding function
  await page.evaluateOnNewDocument(() => {
    // Hook String.fromCharCode to see what's being decoded
    const originalFromCharCode = String.fromCharCode;
    let callCount = 0;
    // @ts-ignore
    String.fromCharCode = function(...args: number[]) {
      callCount++;
      const result = originalFromCharCode.apply(String, args);
      if (callCount < 200 && args.length === 1) {
        console.log(`[fromCharCode] ${args[0]} -> "${result}"`);
      }
      return result;
    };
    
    // Hook fetch to capture the /fetch request
    const originalFetch = window.fetch;
    // @ts-ignore
    window.fetch = async function(url: string, options?: RequestInit) {
      console.log(`[fetch] ${url}`);
      const response = await originalFetch.apply(window, [url, options]);
      
      if (url.includes('/fetch')) {
        const whatHeader = response.headers.get('what');
        console.log(`[fetch] WHAT header: ${whatHeader}`);
        
        // Clone the response to read the body
        const clone = response.clone();
        const buffer = await clone.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        console.log(`[fetch] Response bytes (first 50): ${Array.from(bytes.slice(0, 50))}`);
      }
      
      return response;
    };
  });
  
  const embedUrl = `https://embedsports.top/embed/${source}/${id}/${streamNo}`;
  console.log('Loading:', embedUrl);
  
  // Capture console messages
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[fetch]') || text.includes('[fromCharCode]') || text.includes('m3u8') || text.includes('strmd')) {
      console.log(text);
    }
  });
  
  await page.goto(embedUrl, {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });
  
  // Wait for stream to initialize
  await new Promise(r => setTimeout(r, 5000));
  
  console.log('\n=== JavaScript files loaded ===');
  for (const url of jsFiles) {
    console.log(`  - ${url}`);
  }
  
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
  
  // Try to find the decoding function in the page context
  const decodingInfo = await page.evaluate(() => {
    // Look for any global functions that might be the decoder
    const globals = Object.keys(window).filter(k => {
      try {
        // @ts-ignore
        return typeof window[k] === 'function' && k.length < 20;
      } catch {
        return false;
      }
    });
    
    return {
      globals: globals.slice(0, 50),
    };
  });
  
  console.log('\n=== Global functions ===');
  console.log(decodingInfo.globals);
  
  await browser.close();
}

analyzeEmbedPage().catch(console.error);
