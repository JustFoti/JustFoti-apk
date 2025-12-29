#!/usr/bin/env bun
/**
 * Forensic capture of the decoding process
 * Hooks into the runtime to capture:
 * 1. The /fetch response (encoded data + WHAT header)
 * 2. The decoded m3u8 URL
 * 3. The relationship between them
 */

import puppeteer from 'puppeteer';

async function forensicCapture() {
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
    // @ts-ignore
    window.__CAPTURE__ = {
      fetchData: null,
      decodedUrl: null,
      xorOperations: [],
      stringOperations: [],
    };
    
    // Hook String.fromCharCode to capture XOR results
    const originalFromCharCode = String.fromCharCode;
    // @ts-ignore
    String.fromCharCode = function(...codes: number[]) {
      const result = originalFromCharCode.apply(String, codes);
      // Only capture if it looks like URL building
      if (codes.length === 1 && codes[0] >= 32 && codes[0] <= 126) {
        // @ts-ignore
        if (window.__CAPTURE__.xorOperations.length < 500) {
          // @ts-ignore
          window.__CAPTURE__.xorOperations.push({ code: codes[0], char: result });
        }
      }
      return result;
    };
    
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
        
        // Parse protobuf - field 1 is string
        let idx = 0;
        const fields: { tag: number; data: string }[] = [];
        
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
            
            const data = new TextDecoder().decode(bytes.slice(idx, idx + length));
            fields.push({ tag, data });
            idx += length;
          } else if (wireType === 0) { // Varint
            while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) idx++;
            idx++;
          }
        }
        
        // @ts-ignore
        window.__CAPTURE__.fetchData = {
          whatHeader,
          fields,
          rawBytes: Array.from(bytes),
        };
        
        console.log('[CAPTURE] /fetch response captured');
        console.log('[CAPTURE] WHAT:', whatHeader);
        console.log('[CAPTURE] Fields:', JSON.stringify(fields.map(f => ({ tag: f.tag, len: f.data.length }))));
      }
      
      return response;
    };
    
    // Hook jwplayer to capture when the file URL is set
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
          
          // Hook setup
          const originalSetup = player.setup;
          player.setup = function(config: any) {
            if (config && config.playlist && config.playlist[0] && config.playlist[0].file) {
              // @ts-ignore
              window.__CAPTURE__.decodedUrl = config.playlist[0].file;
              console.log('[CAPTURE] JWPlayer file URL:', config.playlist[0].file);
            }
            return originalSetup.call(player, config);
          };
          
          return player;
        };
        // @ts-ignore
        Object.assign(window.jwplayer, originalJwplayer);
      }
    };
    
    // Try to hook jwplayer periodically
    setInterval(hookJwplayer, 100);
  });
  
  const embedUrl = `https://embedsports.top/embed/${source}/${id}/${streamNo}`;
  console.log('Loading:', embedUrl);
  
  // Capture console messages
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
    
    // Wait for stream to initialize
    await new Promise(r => setTimeout(r, 10000));
    
    // Get the captured data
    const capturedData = await page.evaluate(() => {
      // @ts-ignore
      return window.__CAPTURE__;
    });
    
    // Also get the JWPlayer file URL directly
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
    
    console.log('\n' + '='.repeat(60));
    console.log('FORENSIC ANALYSIS RESULTS');
    console.log('='.repeat(60));
    
    if (capturedData.fetchData) {
      const { whatHeader, fields, rawBytes } = capturedData.fetchData;
      
      console.log('\n--- /fetch Response ---');
      console.log('WHAT header:', whatHeader);
      console.log('WHAT length:', whatHeader?.length);
      console.log('Raw bytes length:', rawBytes.length);
      
      console.log('\nProtobuf fields:');
      for (const field of fields) {
        console.log(`  Tag ${field.tag}: "${field.data.substring(0, 80)}${field.data.length > 80 ? '...' : ''}" (${field.data.length} chars)`);
      }
      
      // The encoded data is in field 1
      const encodedData = fields.find((f: any) => f.tag === 1)?.data || '';
      
      console.log('\n--- Decoded URL ---');
      console.log('JWPlayer file URL:', fileUrl || capturedData.decodedUrl);
      
      if (fileUrl && whatHeader && encodedData) {
        console.log('\n--- Decoding Analysis ---');
        
        // Extract the token from the URL
        const urlParts = fileUrl.split('/');
        const secureIndex = urlParts.indexOf('secure');
        const token = secureIndex >= 0 ? urlParts[secureIndex + 1] : '';
        
        console.log('Token in URL:', token);
        console.log('Token length:', token.length);
        
        // Derive the XOR key by comparing encoded data with decoded URL
        console.log('\n--- XOR Key Derivation ---');
        const derivedKey: number[] = [];
        for (let i = 0; i < Math.min(encodedData.length, fileUrl.length); i++) {
          derivedKey.push(encodedData.charCodeAt(i) ^ fileUrl.charCodeAt(i));
        }
        
        console.log('Derived key (first 64 bytes):', derivedKey.slice(0, 64));
        console.log('As string:', derivedKey.slice(0, 64).map(b => String.fromCharCode(b)).join(''));
        
        // Check if the key is related to WHAT header
        console.log('\n--- WHAT Header Analysis ---');
        const whatBytes = whatHeader.split('').map((c: string) => c.charCodeAt(0));
        console.log('WHAT bytes:', whatBytes);
        
        // Check if derived key matches WHAT header directly
        let matchesWHAT = true;
        for (let i = 0; i < Math.min(derivedKey.length, whatHeader.length); i++) {
          if (derivedKey[i] !== whatBytes[i % whatHeader.length]) {
            matchesWHAT = false;
            break;
          }
        }
        console.log('Derived key matches WHAT directly:', matchesWHAT);
        
        // Check if derived key is WHAT repeated
        let matchesWHATRepeated = true;
        for (let i = 0; i < derivedKey.length; i++) {
          if (derivedKey[i] !== whatBytes[i % whatHeader.length]) {
            matchesWHATRepeated = false;
            break;
          }
        }
        console.log('Derived key matches WHAT repeated:', matchesWHATRepeated);
        
        // Check if derived key is WHAT reversed
        const whatReversed = whatHeader.split('').reverse().join('');
        let matchesWHATReversed = true;
        for (let i = 0; i < derivedKey.length; i++) {
          if (derivedKey[i] !== whatReversed.charCodeAt(i % whatReversed.length)) {
            matchesWHATReversed = false;
            break;
          }
        }
        console.log('Derived key matches WHAT reversed:', matchesWHATReversed);
        
        // Try to find a pattern
        console.log('\n--- Pattern Search ---');
        
        // Check if key[i] = WHAT[f(i)] for some function f
        for (let mult = 1; mult <= 16; mult++) {
          let matches = 0;
          for (let i = 0; i < Math.min(derivedKey.length, 32); i++) {
            if (derivedKey[i] === whatBytes[(i * mult) % whatHeader.length]) {
              matches++;
            }
          }
          if (matches > 20) {
            console.log(`Pattern: key[i] = WHAT[(i * ${mult}) % ${whatHeader.length}] matches ${matches}/32`);
          }
        }
        
        // Check if key is XOR of WHAT with something
        console.log('\n--- XOR Pattern Search ---');
        for (let xorVal = 0; xorVal < 256; xorVal++) {
          let matches = 0;
          for (let i = 0; i < Math.min(derivedKey.length, 32); i++) {
            if (derivedKey[i] === (whatBytes[i % whatHeader.length] ^ xorVal)) {
              matches++;
            }
          }
          if (matches > 25) {
            console.log(`XOR with ${xorVal} (0x${xorVal.toString(16)}): ${matches}/32 matches`);
          }
        }
        
        // Output the raw data for offline analysis
        console.log('\n--- Raw Data for Offline Analysis ---');
        console.log('WHAT:', whatHeader);
        console.log('Encoded (first 200):', encodedData.substring(0, 200));
        console.log('Decoded URL:', fileUrl);
        console.log('Derived key (all):', JSON.stringify(derivedKey));
      }
    } else {
      console.log('No fetch data captured!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
}

forensicCapture().catch(console.error);
