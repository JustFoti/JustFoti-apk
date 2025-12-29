#!/usr/bin/env bun
/**
 * Final reverse engineering - replicate the exact browser request
 */

import puppeteer from 'puppeteer';

async function captureExactRequest() {
  console.log('=== Capturing exact /fetch request ===');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  let fetchRequestDetails: any = null;
  let fetchResponseDetails: any = null;
  
  // Use CDP to capture raw request/response
  const client = await page.createCDPSession();
  await client.send('Network.enable');
  
  client.on('Network.requestWillBeSent', (params) => {
    if (params.request.url.includes('/fetch')) {
      fetchRequestDetails = {
        url: params.request.url,
        method: params.request.method,
        headers: params.request.headers,
        postData: params.request.postData,
      };
      console.log('\n=== RAW REQUEST ===');
      console.log(JSON.stringify(fetchRequestDetails, null, 2));
    }
  });
  
  client.on('Network.responseReceived', async (params) => {
    if (params.response.url.includes('/fetch')) {
      fetchResponseDetails = {
        status: params.response.status,
        headers: params.response.headers,
      };
      console.log('\n=== RAW RESPONSE HEADERS ===');
      console.log(JSON.stringify(fetchResponseDetails, null, 2));
    }
  });
  
  client.on('Network.loadingFinished', async (params) => {
    if (fetchResponseDetails) {
      try {
        const response = await client.send('Network.getResponseBody', {
          requestId: params.requestId
        });
        console.log('\n=== RAW RESPONSE BODY ===');
        console.log('Base64:', response.base64Encoded);
        console.log('Body:', response.body.substring(0, 200));
        
        if (response.base64Encoded) {
          const decoded = Buffer.from(response.body, 'base64');
          console.log('Decoded bytes:', Array.from(decoded.slice(0, 50)));
        }
      } catch {}
    }
  });
  
  const embedUrl = 'https://embedsports.top/embed/charlie/final-1629472869/1';
  
  try {
    await page.goto(embedUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(r => setTimeout(r, 3000));
    
    // Get the stream URL
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
    
    console.log('\n=== FINAL STREAM URL ===');
    console.log(streamUrl);
    
    // Parse the URL to understand the pattern
    if (streamUrl) {
      const url = new URL(streamUrl);
      const pathParts = url.pathname.split('/');
      console.log('\nURL breakdown:');
      console.log('  Host:', url.host);
      console.log('  Path parts:', pathParts);
      console.log('  Token:', pathParts[2]); // /secure/{token}/...
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
  
  return { fetchRequestDetails, fetchResponseDetails };
}

async function replicateRequest() {
  console.log('\n\n=== Replicating request with exact headers ===');
  
  const source = 'charlie';
  const id = 'final-1629472869';
  const streamNo = '1';
  
  // Try with exact browser headers
  const headers = {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'content-type': 'application/octet-stream',
    'origin': 'https://embedsports.top',
    'referer': `https://embedsports.top/embed/${source}/${id}/${streamNo}`,
    'sec-ch-ua': '"Chromium";v="143", "Not A(Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
  };
  
  const body = `${source}${id}${streamNo}`;
  
  console.log('Request body:', body);
  console.log('Request headers:', JSON.stringify(headers, null, 2));
  
  try {
    const res = await fetch('https://embedsports.top/fetch', {
      method: 'POST',
      headers,
      body,
    });
    
    console.log('\nResponse status:', res.status);
    console.log('Response headers:');
    res.headers.forEach((v, k) => console.log(`  ${k}: ${v}`));
    
    const whatHeader = res.headers.get('what');
    console.log('\nWHAT header:', whatHeader);
    
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      console.log('Response body length:', bytes.length);
      
      // Try XOR with WHAT header
      if (whatHeader) {
        const keyBytes = new TextEncoder().encode(whatHeader);
        const xored = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
          xored[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
        }
        const result = new TextDecoder('utf-8', { fatal: false }).decode(xored);
        console.log('\nXOR decoded:', result);
        
        if (result.includes('strmd.top')) {
          console.log('\n*** SUCCESS! Found stream URL ***');
          
          // Extract the full URL
          const match = result.match(/https?:\/\/[^\s"']+/);
          if (match) {
            console.log('Stream URL:', match[0]);
          }
        }
      }
    }
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

// Run
captureExactRequest()
  .then(() => replicateRequest())
  .catch(console.error);
