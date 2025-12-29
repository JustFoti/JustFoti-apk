#!/usr/bin/env bun
/**
 * Analyze the response encoding more carefully
 */

import puppeteer from 'puppeteer';

async function captureAndAnalyze() {
  console.log('=== Capturing response with Puppeteer ===');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  let fetchResponse: { body: Uint8Array; whatHeader: string } | null = null;
  let finalStreamUrl: string | null = null;
  
  const client = await page.createCDPSession();
  await client.send('Network.enable');
  
  client.on('Network.responseReceived', async (params) => {
    if (params.response.url.includes('/fetch') && params.response.status === 200) {
      const whatHeader = params.response.headers['what'] || params.response.headers['WHAT'];
      console.log('WHAT header:', whatHeader);
      
      // Store for later
      fetchResponse = { body: new Uint8Array(), whatHeader };
    }
  });
  
  client.on('Network.loadingFinished', async (params) => {
    try {
      const response = await client.send('Network.getResponseBody', {
        requestId: params.requestId
      });
      
      if (response.base64Encoded && response.body.length < 500) {
        const decoded = Buffer.from(response.body, 'base64');
        
        // Check if this looks like the fetch response (not m3u8)
        if (!decoded.toString().includes('#EXTM3U') && decoded.length > 100 && decoded.length < 200) {
          console.log('\n=== Potential /fetch response ===');
          console.log('Length:', decoded.length);
          console.log('Raw bytes:', Array.from(decoded));
          console.log('As hex:', Buffer.from(decoded).toString('hex'));
          
          if (fetchResponse) {
            fetchResponse.body = new Uint8Array(decoded);
          }
        }
      }
    } catch {}
  });
  
  // Also capture the final stream URL
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('strmd.top') && url.includes('.m3u8')) {
      finalStreamUrl = url;
      console.log('\n=== Final stream URL ===');
      console.log(url);
    }
  });
  
  const embedUrl = 'https://embedsports.top/embed/charlie/final-1629472869/1';
  
  try {
    await page.goto(embedUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(r => setTimeout(r, 3000));
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
  
  // Now analyze the relationship between response and final URL
  if (fetchResponse && finalStreamUrl) {
    console.log('\n\n=== Analyzing encoding ===');
    console.log('WHAT header:', fetchResponse.whatHeader);
    console.log('Response bytes:', fetchResponse.body.length);
    console.log('Final URL:', finalStreamUrl);
    
    // Extract the token from the final URL
    const urlMatch = finalStreamUrl.match(/\/secure\/([^/]+)\//);
    const token = urlMatch ? urlMatch[1] : '';
    console.log('Token from URL:', token);
    
    // The response should decode to something like:
    // https://lb{N}.strmd.top/secure/{token}/{source}/stream/{id}/{streamNo}/playlist.m3u8
    
    // Try different decoding methods
    const responseBytes = fetchResponse.body;
    const whatBytes = new TextEncoder().encode(fetchResponse.whatHeader);
    
    console.log('\n--- Trying different decodings ---');
    
    // Method 1: Simple XOR
    const xor1 = new Uint8Array(responseBytes.length);
    for (let i = 0; i < responseBytes.length; i++) {
      xor1[i] = responseBytes[i] ^ whatBytes[i % whatBytes.length];
    }
    console.log('XOR result:', new TextDecoder('utf-8', { fatal: false }).decode(xor1).substring(0, 100));
    
    // Method 2: XOR with reversed key
    const reversedKey = new TextEncoder().encode(fetchResponse.whatHeader.split('').reverse().join(''));
    const xor2 = new Uint8Array(responseBytes.length);
    for (let i = 0; i < responseBytes.length; i++) {
      xor2[i] = responseBytes[i] ^ reversedKey[i % reversedKey.length];
    }
    console.log('XOR reversed:', new TextDecoder('utf-8', { fatal: false }).decode(xor2).substring(0, 100));
    
    // Method 3: Base64 decode first
    try {
      const b64decoded = Buffer.from(Buffer.from(responseBytes).toString('utf-8'), 'base64');
      console.log('Base64 decoded:', b64decoded.toString('utf-8').substring(0, 100));
    } catch {}
    
    // Method 4: Check if response is already the URL in some encoding
    const asUtf8 = new TextDecoder('utf-8', { fatal: false }).decode(responseBytes);
    console.log('As UTF-8:', asUtf8.substring(0, 100));
    
    // Method 5: Look for patterns in the response
    console.log('\n--- Looking for URL patterns ---');
    
    // The URL should contain: lb, strmd.top, secure, charlie, stream, final-1629472869, playlist.m3u8
    const patterns = ['lb', 'strmd', 'secure', 'charlie', 'stream', 'final', 'playlist', 'm3u8', 'http'];
    
    for (const pattern of patterns) {
      const patternBytes = new TextEncoder().encode(pattern);
      
      // Check if pattern exists in response (possibly XORed)
      for (let offset = 0; offset < responseBytes.length - patternBytes.length; offset++) {
        // Try to find what XOR key would produce this pattern at this offset
        let possibleKey = '';
        let valid = true;
        
        for (let i = 0; i < patternBytes.length && valid; i++) {
          const keyByte = responseBytes[offset + i] ^ patternBytes[i];
          if (keyByte < 32 || keyByte > 126) {
            valid = false;
          } else {
            possibleKey += String.fromCharCode(keyByte);
          }
        }
        
        if (valid && possibleKey.length === patternBytes.length) {
          console.log(`Pattern "${pattern}" at offset ${offset} with key "${possibleKey}"`);
        }
      }
    }
  }
}

captureAndAnalyze().catch(console.error);
