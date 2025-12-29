#!/usr/bin/env bun
/**
 * Use Puppeteer to capture network requests from streamed.pk embed
 */

import puppeteer from 'puppeteer';

async function captureStreamUrl() {
  console.log('=== Launching browser ===');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set up request interception
  const requests: string[] = [];
  const m3u8Urls: string[] = [];
  
  await page.setRequestInterception(true);
  
  page.on('request', (request) => {
    const url = request.url();
    requests.push(url);
    
    // Log m3u8 requests
    if (url.includes('.m3u8') || url.includes('playlist') || url.includes('stream')) {
      console.log('REQUEST:', url);
    }
    
    if (url.includes('.m3u8')) {
      m3u8Urls.push(url);
    }
    
    request.continue();
  });
  
  page.on('response', async (response) => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';
    
    // Log responses that might be m3u8
    if (url.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('m3u8')) {
      console.log('RESPONSE:', url);
      console.log('  Content-Type:', contentType);
      try {
        const text = await response.text();
        if (text.includes('#EXTM3U')) {
          console.log('  ^ M3U8 FOUND!');
          console.log(text.substring(0, 500));
        }
      } catch {}
    }
  });
  
  // Navigate to embed
  const embedUrl = 'https://embedsports.top/embed/charlie/final-1629472869/1';
  console.log('\n=== Navigating to embed ===');
  console.log('URL:', embedUrl);
  
  try {
    await page.goto(embedUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for player to load
    console.log('\n=== Waiting for player ===');
    await page.waitForSelector('#player', { timeout: 10000 });
    
    // Wait a bit more for stream to start
    await new Promise(r => setTimeout(r, 5000));
    
    console.log('\n=== All requests made ===');
    console.log('Total requests:', requests.length);
    
    // Filter interesting requests
    const interestingRequests = requests.filter(url => 
      url.includes('m3u8') || 
      url.includes('stream') || 
      url.includes('hls') ||
      url.includes('video') ||
      url.includes('playlist')
    );
    
    console.log('\nInteresting requests:');
    interestingRequests.forEach(url => console.log('  ', url));
    
    console.log('\n=== M3U8 URLs found ===');
    m3u8Urls.forEach(url => console.log(url));
    
    // Try to get the video source from the page
    console.log('\n=== Checking video element ===');
    const videoSrc = await page.evaluate(() => {
      const video = document.querySelector('video');
      if (video) {
        return {
          src: video.src,
          currentSrc: video.currentSrc,
        };
      }
      return null;
    });
    
    if (videoSrc) {
      console.log('Video src:', videoSrc.src);
      console.log('Video currentSrc:', videoSrc.currentSrc);
    }
    
    // Check for JWPlayer
    console.log('\n=== Checking JWPlayer ===');
    const jwplayerInfo = await page.evaluate(() => {
      // @ts-ignore
      if (typeof jwplayer !== 'undefined') {
        // @ts-ignore
        const player = jwplayer();
        if (player) {
          return {
            playlist: player.getPlaylist?.(),
            config: player.getConfig?.(),
          };
        }
      }
      return null;
    });
    
    if (jwplayerInfo) {
      console.log('JWPlayer playlist:', JSON.stringify(jwplayerInfo.playlist, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
  console.log('\n=== Done ===');
}

captureStreamUrl().catch(console.error);
