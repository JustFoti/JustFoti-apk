#!/usr/bin/env bun
/**
 * Capture the full decoding flow by hooking into all relevant functions
 */

import puppeteer from 'puppeteer';

async function captureFullDecode() {
  const source = 'alpha';
  const id = 'nba-tv-1';
  const streamNo = '1';
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  
  // Inject comprehensive hooks
  await page.evaluateOnNewDocument(() => {
    // @ts-ignore
    window.__FULL_CAPTURE__ = {
      fetchResponse: null,
      protobufParsed: null,
      callbackData: null,
      finalUrl: null,
      allCalls: [],
    };
    
    // Hook fetch
    const originalFetch = window.fetch;
    // @ts-ignore
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const response = await originalFetch.apply(window, [input, init]);
      
      if (url.includes('/fetch')) {
        const whatHeader = response.headers.get('what');
        const clone = response.clone();
        const buffer = await clone.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        
        // @ts-ignore
        window.__FULL_CAPTURE__.fetchResponse = {
          whatHeader,
          bytes: Array.from(bytes),
          bytesAsString: new TextDecoder().decode(bytes),
        };
        
        console.log('[CAPTURE] Fetch response captured');
        console.log('[CAPTURE] WHAT:', whatHeader);
        console.log('[CAPTURE] Response bytes:', bytes.length);
      }
      
      return response;
    };
    
    // Hook all function calls to find the decode function
    // We'll look for functions that take the encoded data and return the URL
    
    // Hook Function.prototype.call to capture function calls
    const originalCall = Function.prototype.call;
    // @ts-ignore
    Function.prototype.call = function(thisArg: any, ...args: any[]) {
      // Check if any argument looks like encoded data or URL
      for (const arg of args) {
        if (typeof arg === 'string') {
          if (arg.includes('strmd.top') || arg.includes('playlist.m3u8')) {
            // @ts-ignore
            window.__FULL_CAPTURE__.allCalls.push({
              type: 'call',
              funcName: this.name || 'anonymous',
              arg: arg.substring(0, 200),
            });
            console.log('[CAPTURE] Function call with URL:', arg.substring(0, 100));
          }
        }
        if (typeof arg === 'object' && arg !== null) {
          if (arg.data && typeof arg.data === 'string') {
            // @ts-ignore
            window.__FULL_CAPTURE__.allCalls.push({
              type: 'call',
              funcName: this.name || 'anonymous',
              data: arg.data.substring(0, 200),
            });
            console.log('[CAPTURE] Function call with data object');
          }
        }
      }
      return originalCall.apply(this, [thisArg, ...args]);
    };
    
    // Hook jwplayer setup
    let jwplayerHooked = false;
    const hookJwplayer = () => {
      // @ts-ignore
      if (typeof jwplayer !== 'undefined' && !jwplayerHooked) {
        jwplayerHooked = true;
        // @ts-ignore
        const originalJwplayer = jwplayer;
        // @ts-ignore
        window.jwplayer = function(...args: any[]) {
          const player = originalJwplayer.apply(window, args);
          
          const originalSetup = player.setup;
          player.setup = function(config: any) {
            if (config?.playlist?.[0]?.file) {
              // @ts-ignore
              window.__FULL_CAPTURE__.finalUrl = config.playlist[0].file;
              console.log('[CAPTURE] JWPlayer setup with file:', config.playlist[0].file);
            }
            return originalSetup.call(player, config);
          };
          
          return player;
        };
        // @ts-ignore
        Object.assign(window.jwplayer, originalJwplayer);
      }
    };
    
    setInterval(hookJwplayer, 50);
  });
  
  const embedUrl = `https://embedsports.top/embed/${source}/${id}/${streamNo}`;
  console.log('Loading:', embedUrl);
  
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[CAPTURE]')) {
      console.log(text);
    }
  });
  
  try {
    await page.goto(embedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    
    await new Promise(r => setTimeout(r, 10000));
    
    const capturedData = await page.evaluate(() => {
      // @ts-ignore
      return window.__FULL_CAPTURE__;
    });
    
    const fileUrl = await page.evaluate(() => {
      // @ts-ignore
      if (typeof jwplayer !== 'undefined') {
        // @ts-ignore
        const player = jwplayer();
        const playlist = player.getPlaylist?.();
        if (playlist?.[0]) {
          return playlist[0].file;
        }
      }
      return null;
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('FULL CAPTURE RESULTS');
    console.log('='.repeat(60));
    
    if (capturedData.fetchResponse) {
      const { whatHeader, bytes, bytesAsString } = capturedData.fetchResponse;
      
      console.log('\n--- Fetch Response ---');
      console.log('WHAT header:', whatHeader);
      console.log('Response bytes:', bytes.length);
      
      // Parse protobuf manually
      console.log('\n--- Protobuf Parsing ---');
      let idx = 0;
      while (idx < bytes.length) {
        const tag = bytes[idx] >> 3;
        const wireType = bytes[idx] & 0x07;
        idx++;
        
        if (wireType === 2) { // Length-delimited
          let length = 0;
          let shift = 0;
          while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) {
            length |= (bytes[idx] & 0x7f) << shift;
            shift += 7;
            idx++;
          }
          length |= (bytes[idx] & 0x7f) << shift;
          idx++;
          
          const data = bytes.slice(idx, idx + length);
          const dataStr = String.fromCharCode(...data);
          console.log(`Field ${tag} (length ${length}): ${dataStr.substring(0, 100)}`);
          
          // This is the encoded data
          if (tag === 1) {
            console.log('\n--- Encoded Data Analysis ---');
            console.log('Encoded data length:', dataStr.length);
            console.log('Encoded data:', dataStr);
            
            // Try to decode with WHAT header
            if (whatHeader) {
              let decoded = '';
              for (let i = 0; i < dataStr.length; i++) {
                decoded += String.fromCharCode(dataStr.charCodeAt(i) ^ whatHeader.charCodeAt(i % whatHeader.length));
              }
              console.log('\nXOR with WHAT:', decoded);
              
              // Check if this looks like a URL
              if (decoded.includes('http') || decoded.includes('strmd')) {
                console.log('>>> This looks like a URL!');
              }
            }
          }
          
          idx += length;
        } else if (wireType === 0) { // Varint
          while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) idx++;
          idx++;
        }
      }
    }
    
    console.log('\n--- Final URL ---');
    console.log('JWPlayer file URL:', fileUrl || capturedData.finalUrl);
    
    console.log('\n--- Function Calls with URLs ---');
    for (const call of capturedData.allCalls.slice(0, 10)) {
      console.log(call);
    }
    
    // Now let's analyze the relationship
    if (capturedData.fetchResponse && fileUrl) {
      const { whatHeader, bytes } = capturedData.fetchResponse;
      
      // Parse the encoded data from protobuf
      let idx = 1; // Skip first byte (tag)
      let length = 0;
      let shift = 0;
      while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) {
        length |= (bytes[idx] & 0x7f) << shift;
        shift += 7;
        idx++;
      }
      length |= (bytes[idx] & 0x7f) << shift;
      idx++;
      
      const encodedData = String.fromCharCode(...bytes.slice(idx, idx + length));
      
      console.log('\n' + '='.repeat(60));
      console.log('DECODING ALGORITHM ANALYSIS');
      console.log('='.repeat(60));
      
      console.log('\nWHAT header:', whatHeader);
      console.log('Encoded data:', encodedData);
      console.log('Decoded URL:', fileUrl);
      
      // Derive the actual XOR key
      const actualKey: number[] = [];
      for (let i = 0; i < Math.min(encodedData.length, fileUrl.length); i++) {
        actualKey.push(encodedData.charCodeAt(i) ^ fileUrl.charCodeAt(i));
      }
      
      console.log('\nActual XOR key (first 64):', actualKey.slice(0, 64));
      console.log('As string:', actualKey.slice(0, 64).map(b => String.fromCharCode(b)).join(''));
      
      // Check if key is WHAT repeated
      const whatBytes = whatHeader.split('').map((c: string) => c.charCodeAt(0));
      let matchesWhat = true;
      for (let i = 0; i < actualKey.length; i++) {
        if (actualKey[i] !== whatBytes[i % whatBytes.length]) {
          matchesWhat = false;
          break;
        }
      }
      console.log('\nKey matches WHAT repeated:', matchesWhat);
      
      if (matchesWhat) {
        console.log('\n>>> DECODING ALGORITHM FOUND! <<<');
        console.log('decoded = encoded XOR WHAT (repeated)');
      } else {
        // Find the pattern
        console.log('\nKey does not match WHAT directly. Analyzing pattern...');
        
        // Check if key[i] = WHAT[i] XOR constant
        const xorWithWhat = actualKey.map((k, i) => k ^ whatBytes[i % whatBytes.length]);
        console.log('Key XOR WHAT:', xorWithWhat.slice(0, 32));
        
        // Check if this is constant
        const uniqueXors = [...new Set(xorWithWhat.slice(0, 32))];
        if (uniqueXors.length === 1) {
          console.log('>>> Key = WHAT XOR', uniqueXors[0]);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
}

captureFullDecode().catch(console.error);
