/**
 * VIPRow M3U8 Extractor using Puppeteer
 * 
 * This script uses a headless browser to:
 * 1. Navigate to the VIPRow stream page
 * 2. Wait for the Casthill embed to load
 * 3. Extract the m3u8 URL from network requests
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

const VIPROW_BASE = 'https://www.viprow.nu';

async function extractM3U8(eventUrl) {
  console.log('Launching browser...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
    ],
  });
  
  const page = await browser.newPage();
  
  // Set viewport and user agent
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Collect network requests
  const m3u8Urls = [];
  const manifestUrls = [];
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('.m3u8') || url.includes('manifest.ts')) {
      console.log('Request:', url);
      manifestUrls.push(url);
    }
  });
  
  page.on('response', async response => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';
    
    if (url.includes('.m3u8') || url.includes('manifest.ts') || contentType.includes('mpegurl')) {
      console.log('Response:', url, response.status());
      
      if (response.ok()) {
        try {
          const text = await response.text();
          if (text.includes('#EXTM3U')) {
            console.log('Found M3U8 playlist!');
            m3u8Urls.push({ url, content: text });
          }
        } catch (e) {
          // Response body may not be available
        }
      }
    }
  });
  
  try {
    // Navigate to the stream page
    const streamUrl = `${VIPROW_BASE}${eventUrl}-1`;
    console.log('Navigating to:', streamUrl);
    
    await page.goto(streamUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });
    
    console.log('Page loaded, waiting for embed...');
    
    // Wait for the iframe to load
    await page.waitForSelector('iframe', { timeout: 30000 });
    
    // Get the iframe src
    const iframeSrc = await page.evaluate(() => {
      const iframe = document.querySelector('iframe');
      return iframe ? iframe.src : null;
    });
    
    console.log('Iframe src:', iframeSrc);
    
    // Navigate to the iframe directly or wait for it to load
    if (iframeSrc) {
      // Wait for network activity to settle
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    // Try to find the video element and its source
    const videoSrc = await page.evaluate(() => {
      const video = document.querySelector('video');
      if (video) {
        return video.src || video.currentSrc;
      }
      return null;
    });
    
    console.log('Video src:', videoSrc);
    
    // Check collected URLs
    console.log('\nCollected manifest URLs:', manifestUrls);
    console.log('Collected M3U8 URLs:', m3u8Urls.length);
    
    if (m3u8Urls.length > 0) {
      console.log('\n=== SUCCESS ===');
      console.log('M3U8 URL:', m3u8Urls[0].url);
      console.log('Content preview:', m3u8Urls[0].content.substring(0, 500));
      
      fs.writeFileSync('viprow-manifest.m3u8', m3u8Urls[0].content);
      console.log('Saved to viprow-manifest.m3u8');
    }
    
    return { manifestUrls, m3u8Urls };
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  try {
    // First get an event URL
    console.log('Fetching schedule...');
    const response = await fetch(`${VIPROW_BASE}/sports-big-games`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = await response.text();
    
    const eventMatch = html.match(/href="([^"]+online-stream)"[^>]*role="button"/);
    if (!eventMatch) throw new Error('No events found');
    
    const eventUrl = eventMatch[1];
    console.log('Event:', eventUrl);
    
    await extractM3U8(eventUrl);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
