#!/usr/bin/env bun
/**
 * Figure out how the streamed.pk token is generated
 */

import puppeteer from 'puppeteer';

async function analyzeTokenGeneration() {
  console.log('=== Analyzing token generation ===');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Capture all requests to strmd.top
  const strmdRequests: string[] = [];
  
  await page.setRequestInterception(true);
  
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('strmd.top')) {
      strmdRequests.push(url);
      console.log('STRMD REQUEST:', url);
    }
    request.continue();
  });
  
  // Test multiple embeds to see if token changes
  const testEmbeds = [
    'https://embedsports.top/embed/charlie/final-1629472869/1',
    'https://embedsports.top/embed/echo/final-1629472869/1',
  ];
  
  for (const embedUrl of testEmbeds) {
    console.log(`\n=== Testing: ${embedUrl} ===`);
    strmdRequests.length = 0;
    
    try {
      await page.goto(embedUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      await new Promise(r => setTimeout(r, 3000));
      
      // Extract token from URL
      for (const url of strmdRequests) {
        const match = url.match(/\/secure\/([^/]+)\//);
        if (match) {
          console.log('Token:', match[1]);
        }
      }
      
    } catch (error) {
      console.error('Error:', error);
    }
  }
  
  await browser.close();
}

async function testDirectAccess() {
  console.log('\n\n=== Testing direct access patterns ===');
  
  // The URL pattern is: https://lb{N}.strmd.top/secure/{TOKEN}/{source}/stream/{id}/{streamNo}/playlist.m3u8
  // Let's see if we can access without token or with a static token
  
  const source = 'charlie';
  const id = 'final-1629472869';
  const streamNo = '1';
  
  const patterns = [
    // Without token
    `https://lb4.strmd.top/${source}/stream/${id}/${streamNo}/playlist.m3u8`,
    `https://lb4.strmd.top/stream/${source}/${id}/${streamNo}/playlist.m3u8`,
    `https://lb4.strmd.top/hls/${source}/${id}/${streamNo}/playlist.m3u8`,
    
    // With different lb numbers
    `https://lb1.strmd.top/secure/test/${source}/stream/${id}/${streamNo}/playlist.m3u8`,
    `https://lb2.strmd.top/secure/test/${source}/stream/${id}/${streamNo}/playlist.m3u8`,
    
    // API endpoints
    `https://strmd.top/api/stream/${source}/${id}`,
    `https://strmd.top/api/token/${source}/${id}`,
    `https://embedsports.top/api/stream/${source}/${id}`,
    `https://embedsports.top/api/token/${source}/${id}`,
  ];
  
  for (const url of patterns) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://embedsports.top/',
        }
      });
      
      const contentType = res.headers.get('content-type') || '';
      console.log(`${res.status} ${url.substring(0, 70)}... [${contentType.split(';')[0]}]`);
      
      if (res.ok) {
        const text = await res.text();
        if (text.includes('#EXTM3U')) {
          console.log('  ^ M3U8 FOUND!');
        } else if (text.length < 500) {
          console.log('  Response:', text.substring(0, 100));
        }
      }
    } catch (e: any) {
      console.log(`ERR ${url.substring(0, 70)}... - ${e.message?.substring(0, 50)}`);
    }
  }
}

async function findTokenSource() {
  console.log('\n\n=== Finding token source in page ===');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Inject script to capture how the URL is constructed
  await page.evaluateOnNewDocument(() => {
    // Override fetch to log calls
    const originalFetch = window.fetch;
    // @ts-ignore
    window.fetch = function(...args) {
      console.log('FETCH:', args[0]);
      return originalFetch.apply(this, args);
    };
  });
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('FETCH:') || text.includes('strmd') || text.includes('token')) {
      console.log('PAGE LOG:', text);
    }
  });
  
  const embedUrl = 'https://embedsports.top/embed/charlie/final-1629472869/1';
  
  try {
    await page.goto(embedUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(r => setTimeout(r, 3000));
    
    // Try to find where the token comes from
    const pageContent = await page.content();
    
    // Look for token in page
    const tokenMatch = pageContent.match(/RXTrxKTUdPBNSYJODLRrStfCHxeIYFuo/);
    if (tokenMatch) {
      console.log('Token found in page content!');
    }
    
    // Check for any data attributes or scripts
    const scripts = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script');
      return Array.from(scripts).map(s => s.innerHTML.substring(0, 500));
    });
    
    console.log('\nScripts in page:');
    scripts.forEach((s, i) => {
      if (s.length > 0) {
        console.log(`Script ${i}:`, s.substring(0, 200));
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
}

// Run all
analyzeTokenGeneration()
  .then(() => testDirectAccess())
  .then(() => findTokenSource())
  .catch(console.error);
