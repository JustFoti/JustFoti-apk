#!/usr/bin/env bun
/**
 * Use Puppeteer to capture the actual m3u8 URL and understand the pattern
 */

import puppeteer from 'puppeteer';

async function captureStreamUrl() {
  const source = 'charlie';
  const id = 'wellington-firebirds-vs-auckland-aces-1629472738';
  const streamNo = '1';
  
  console.log(`Capturing stream URL for ${source}/${id}/${streamNo}`);
  console.log('='.repeat(60));
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  
  let m3u8Url: string | null = null;
  let fetchRequest: any = null;
  let fetchResponse: any = null;
  
  // Use CDP to capture raw request/response
  const client = await page.createCDPSession();
  await client.send('Network.enable');
  
  client.on('Network.requestWillBeSent', (params) => {
    if (params.request.url.includes('/fetch')) {
      fetchRequest = {
        url: params.request.url,
        method: params.request.method,
        headers: params.request.headers,
        postData: params.request.postData,
      };
    }
  });
  
  client.on('Network.responseReceived', (params) => {
    if (params.response.url.includes('/fetch')) {
      fetchResponse = {
        status: params.response.status,
        headers: params.response.headers,
      };
    }
  });
  
  // Intercept network requests to capture m3u8 URL
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('.m3u8') && url.includes('strmd.top')) {
      m3u8Url = url;
      console.log('\n*** Captured m3u8 URL:', url);
    }
    request.continue();
  });
  
  const embedUrl = `https://embedsports.top/embed/${source}/${id}/${streamNo}`;
  console.log('Loading:', embedUrl);
  
  try {
    await page.goto(embedUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    
    // Wait for stream to start
    await new Promise(r => setTimeout(r, 5000));
    
    // Try to get URL from JWPlayer
    if (!m3u8Url) {
      m3u8Url = await page.evaluate(() => {
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
    }
    
    console.log('\n--- Results ---');
    console.log('Fetch request:', JSON.stringify(fetchRequest, null, 2));
    console.log('Fetch response headers:', JSON.stringify(fetchResponse, null, 2));
    console.log('Final m3u8 URL:', m3u8Url);
    
    if (m3u8Url) {
      // Parse the URL to understand the pattern
      const url = new URL(m3u8Url);
      const pathParts = url.pathname.split('/');
      console.log('\n--- URL Analysis ---');
      console.log('Host:', url.host);
      console.log('Path parts:', pathParts);
      
      // Extract token from URL
      // Pattern: /secure/{token}/{source}/stream/{id}/{streamNo}/playlist.m3u8
      const tokenIndex = pathParts.indexOf('secure') + 1;
      const token = pathParts[tokenIndex];
      console.log('Token:', token);
      console.log('Token length:', token?.length);
      
      // Compare with WHAT header
      const whatHeader = fetchResponse?.headers?.what || fetchResponse?.headers?.WHAT;
      console.log('WHAT header:', whatHeader);
      console.log('WHAT length:', whatHeader?.length);
      
      // Check if token matches WHAT header
      console.log('Token === WHAT:', token === whatHeader);
      
      // If different, the token is derived from the response body
      if (token !== whatHeader) {
        console.log('\nToken is different from WHAT header!');
        console.log('The token must be decoded from the response body.');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
}

captureStreamUrl().catch(console.error);
