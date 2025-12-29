#!/usr/bin/env bun
/**
 * Hook into the actual decode function to capture the algorithm
 * We'll intercept the protobuf parsing and see what happens to the data
 */

import puppeteer from 'puppeteer';

async function hookDecodeFunction() {
  const source = 'alpha';
  const id = 'nba-tv-1';
  const streamNo = '1';
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  
  // Enable CDP to intercept script execution
  const client = await page.createCDPSession();
  
  // Inject hooks before any scripts run
  await page.evaluateOnNewDocument(() => {
    // @ts-ignore
    window.__DECODE_CAPTURE__ = {
      whatHeader: null,
      encodedData: null,
      decodedUrl: null,
      decodeSteps: [],
    };
    
    // Hook fetch to capture WHAT header
    const originalFetch = window.fetch;
    // @ts-ignore
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const response = await originalFetch.apply(window, [input, init]);
      
      if (url.includes('/fetch')) {
        // @ts-ignore
        window.__DECODE_CAPTURE__.whatHeader = response.headers.get('what');
        console.log('[HOOK] WHAT header captured:', response.headers.get('what'));
      }
      
      return response;
    };
    
    // Hook atob to see if base64 decoding is used
    const originalAtob = window.atob;
    // @ts-ignore
    window.atob = function(data: string) {
      const result = originalAtob.call(window, data);
      // @ts-ignore
      window.__DECODE_CAPTURE__.decodeSteps.push({
        type: 'atob',
        input: data.substring(0, 100),
        output: result.substring(0, 100),
      });
      console.log('[HOOK] atob called, input length:', data.length);
      return result;
    };
    
    // Hook btoa
    const originalBtoa = window.btoa;
    // @ts-ignore
    window.btoa = function(data: string) {
      const result = originalBtoa.call(window, data);
      // @ts-ignore
      window.__DECODE_CAPTURE__.decodeSteps.push({
        type: 'btoa',
        input: data.substring(0, 100),
        output: result.substring(0, 100),
      });
      console.log('[HOOK] btoa called, input length:', data.length);
      return result;
    };
    
    // Hook TextDecoder to capture when encoded data is decoded
    const OriginalTextDecoder = window.TextDecoder;
    // @ts-ignore
    window.TextDecoder = class extends OriginalTextDecoder {
      decode(input?: BufferSource, options?: TextDecodeOptions): string {
        const result = super.decode(input, options);
        
        // Check if this looks like encoded stream data
        if (result.length > 50 && result.length < 300) {
          // @ts-ignore
          window.__DECODE_CAPTURE__.decodeSteps.push({
            type: 'TextDecoder',
            inputLength: input ? (input as ArrayBuffer).byteLength || (input as Uint8Array).length : 0,
            output: result.substring(0, 100),
          });
          console.log('[HOOK] TextDecoder result:', result.substring(0, 50));
        }
        
        return result;
      }
    };
    
    // Hook jwplayer setup to capture the final URL
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
              window.__DECODE_CAPTURE__.decodedUrl = config.playlist[0].file;
              console.log('[HOOK] JWPlayer file:', config.playlist[0].file);
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
    await new Promise(r => setTimeout(r, 8000));
    
    // Get the captured data
    const capturedData = await page.evaluate(() => {
      // @ts-ignore
      return window.__DECODE_CAPTURE__;
    });
    
    // Also get the JWPlayer file URL directly
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
    console.log('DECODE FUNCTION CAPTURE RESULTS');
    console.log('='.repeat(60));
    
    console.log('\nWHAT header:', capturedData.whatHeader);
    console.log('Decoded URL:', fileUrl || capturedData.decodedUrl);
    console.log('\nDecode steps:', capturedData.decodeSteps.length);
    
    for (const step of capturedData.decodeSteps) {
      console.log(`\n--- ${step.type} ---`);
      if (step.input) console.log('Input:', step.input);
      if (step.inputLength) console.log('Input length:', step.inputLength);
      console.log('Output:', step.output);
    }
    
    // Now let's try to understand the decoding by examining the relationship
    if (capturedData.whatHeader && fileUrl) {
      console.log('\n' + '='.repeat(60));
      console.log('DECODING ANALYSIS');
      console.log('='.repeat(60));
      
      // The key insight: we need to find what transforms encoded -> decoded
      // Let's check if there's a simple XOR relationship
      
      // Find the TextDecoder step that has the encoded data
      const textDecoderStep = capturedData.decodeSteps.find((s: any) => s.type === 'TextDecoder');
      if (textDecoderStep) {
        console.log('\nEncoded data (from TextDecoder):', textDecoderStep.output);
        
        // Try XOR with WHAT header
        const whatHeader = capturedData.whatHeader;
        const encoded = textDecoderStep.output;
        
        let xorResult = '';
        for (let i = 0; i < encoded.length; i++) {
          xorResult += String.fromCharCode(encoded.charCodeAt(i) ^ whatHeader.charCodeAt(i % whatHeader.length));
        }
        console.log('\nXOR with WHAT:', xorResult.substring(0, 80));
        
        // Check if XOR result matches the URL
        const urlStart = fileUrl.substring(0, 50);
        console.log('URL start:', urlStart);
        
        // The XOR result should be the URL if WHAT is the key
        // But we know from earlier analysis that it's not that simple
        
        // Let's check if the XOR result XOR'd with something else gives the URL
        let secondXor = '';
        for (let i = 0; i < Math.min(xorResult.length, fileUrl.length); i++) {
          secondXor += String.fromCharCode(xorResult.charCodeAt(i) ^ fileUrl.charCodeAt(i));
        }
        console.log('\n(encoded XOR WHAT) XOR URL:', secondXor.substring(0, 50));
        console.log('As bytes:', secondXor.substring(0, 32).split('').map(c => c.charCodeAt(0)));
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
}

hookDecodeFunction().catch(console.error);
