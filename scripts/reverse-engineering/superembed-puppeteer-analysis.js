/**
 * Superembed Puppeteer Analysis
 * 
 * Uses Puppeteer to load the Superembed player and extract M3U8 URLs
 */

const puppeteer = require('puppeteer');
const https = require('https');

// Test cases
const TEST_CASES = [
  {
    name: 'Fight Club (Movie)',
    tmdbId: '550',
    type: 'movie'
  },
  {
    name: 'Better Call Saul S06E02 (TV)',
    tmdbId: '60059',
    type: 'tv',
    season: 6,
    episode: 2
  }
];

/**
 * Fetch a page with proper headers
 */
function fetchPage(url, referer = 'https://vidsrc-embed.ru/') {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': referer,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Extract superembed hash from embed page
 */
function extractSuperembedHash(html) {
  const match = html.match(/data-hash="([^"]+)"[^>]*>[\s\S]{0,200}?Superembed/i);
  return match ? match[1] : null;
}

/**
 * Extract srcrcp URL from RCP page
 */
function extractSrcRcpUrl(html) {
  const match = html.match(/['"]\/srcrcp\/([A-Za-z0-9+\/=\-_]+)['"]/);
  return match ? `https://cloudnestra.com/srcrcp/${match[1]}` : null;
}

/**
 * Analyze Superembed with Puppeteer
 */
async function analyzeSuperembedWithPuppeteer(testCase) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Analyzing: ${testCase.name}`);
  console.log(`${'='.repeat(80)}\n`);
  
  try {
    // Step 1: Get embed page and extract hash
    let embedUrl = `https://vidsrc-embed.ru/embed/${testCase.type}/${testCase.tmdbId}`;
    if (testCase.type === 'tv' && testCase.season && testCase.episode) {
      embedUrl += `/${testCase.season}/${testCase.episode}`;
    }
    
    console.log('Step 1: Fetching embed page');
    const embedPage = await fetchPage(embedUrl);
    
    const hash = extractSuperembedHash(embedPage);
    if (!hash) {
      console.log('✗ No superembed hash found');
      return;
    }
    console.log('✓ Superembed hash:', hash.substring(0, 50) + '...');
    
    // Step 2: Get RCP page
    console.log('\nStep 2: Fetching RCP page');
    const rcpUrl = `https://cloudnestra.com/rcp/${hash}`;
    const rcpPage = await fetchPage(rcpUrl, embedUrl);
    
    const srcRcpUrl = extractSrcRcpUrl(rcpPage);
    if (!srcRcpUrl) {
      console.log('✗ No SrcRCP URL found');
      return;
    }
    console.log('✓ SrcRCP URL:', srcRcpUrl);
    
    // Step 3: Launch Puppeteer and analyze the player page
    console.log('\nStep 3: Launching Puppeteer to analyze player page...');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled',
        '--disable-extensions'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set extra headers - CRITICAL for srcrcp pages!
    await page.setExtraHTTPHeaders({
      'Referer': embedUrl,
      'Origin': 'https://vidsrc-embed.ru'
    });
    
    // Track all network requests
    const m3u8Urls = [];
    const mp4Urls = [];
    const allVideoRequests = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('.m3u8') || url.includes('.mp4') || url.includes('master') || url.includes('playlist')) {
        allVideoRequests.push({
          type: 'request',
          url: url,
          method: request.method(),
          headers: request.headers()
        });
      }
    });
    
    page.on('response', async response => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      
      // Check for M3U8
      if (url.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('m3u8')) {
        console.log('\n🎯 Found M3U8 URL:', url);
        m3u8Urls.push(url);
        allVideoRequests.push({
          type: 'response',
          url: url,
          status: response.status(),
          contentType: contentType
        });
      }
      
      // Check for MP4
      if (url.includes('.mp4') || contentType.includes('mp4')) {
        console.log('\n🎯 Found MP4 URL:', url);
        mp4Urls.push(url);
        allVideoRequests.push({
          type: 'response',
          url: url,
          status: response.status(),
          contentType: contentType
        });
      }
    });
    
    // Enable console logging from the page
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('m3u8') || text.includes('mp4') || text.includes('source') || text.includes('video')) {
        console.log('📄 Page console:', text);
      }
    });
    
    console.log('Loading player page:', srcRcpUrl);
    
    try {
      await page.goto(srcRcpUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
    } catch (navError) {
      console.log('⚠️  Navigation error (might be expected):', navError.message);
      // Continue anyway - the page might have loaded enough content
    }
    
    // Wait a bit for any delayed requests
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Try to extract video sources from the page
    console.log('\nStep 4: Extracting video sources from page...');
    
    const videoSources = await page.evaluate(() => {
      const sources = [];
      
      // Check for video elements
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        if (video.src) sources.push({ type: 'video.src', url: video.src });
        const sourceTags = video.querySelectorAll('source');
        sourceTags.forEach(source => {
          if (source.src) sources.push({ type: 'source.src', url: source.src });
        });
      });
      
      // Check for common video player variables
      const checkGlobalVars = [
        'playerInstance',
        'jwplayer',
        'videojs',
        'Plyr',
        'player',
        'videoPlayer',
        'sources',
        'videoSources',
        'playlist',
        'videoUrl',
        'm3u8Url'
      ];
      
      for (const varName of checkGlobalVars) {
        if (window[varName]) {
          try {
            const value = window[varName];
            if (typeof value === 'string' && (value.includes('http') || value.includes('.m3u8'))) {
              sources.push({ type: `window.${varName}`, url: value });
            } else if (typeof value === 'object') {
              const str = JSON.stringify(value);
              if (str.includes('.m3u8') || str.includes('.mp4')) {
                sources.push({ type: `window.${varName}`, data: str.substring(0, 500) });
              }
            }
          } catch (e) {}
        }
      }
      
      // Check for data attributes
      const elements = document.querySelectorAll('[data-src], [data-source], [data-video], [data-url]');
      elements.forEach(el => {
        ['data-src', 'data-source', 'data-video', 'data-url'].forEach(attr => {
          const value = el.getAttribute(attr);
          if (value && (value.includes('http') || value.includes('.m3u8'))) {
            sources.push({ type: attr, url: value });
          }
        });
      });
      
      return sources;
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('RESULTS');
    console.log('='.repeat(80));
    
    if (m3u8Urls.length > 0) {
      console.log('\n✅ M3U8 URLs found:', m3u8Urls.length);
      m3u8Urls.forEach((url, i) => {
        console.log(`  ${i + 1}. ${url}`);
      });
    }
    
    if (mp4Urls.length > 0) {
      console.log('\n✅ MP4 URLs found:', mp4Urls.length);
      mp4Urls.forEach((url, i) => {
        console.log(`  ${i + 1}. ${url}`);
      });
    }
    
    if (videoSources.length > 0) {
      console.log('\n📦 Video sources from page:');
      videoSources.forEach((source, i) => {
        console.log(`  ${i + 1}. [${source.type}]`, source.url || source.data);
      });
    }
    
    if (allVideoRequests.length > 0) {
      console.log('\n📡 All video-related requests:');
      allVideoRequests.forEach((req, i) => {
        console.log(`  ${i + 1}. [${req.type}] ${req.url}`);
      });
    }
    
    if (m3u8Urls.length === 0 && mp4Urls.length === 0 && videoSources.length === 0) {
      console.log('\n⚠️  No video sources found!');
      console.log('The page might be using a different loading mechanism.');
      
      // Save page HTML for manual inspection
      const html = await page.content();
      const fs = require('fs');
      const filename = `superembed-player-${testCase.type}-${testCase.tmdbId}.html`;
      fs.writeFileSync(filename, html);
      console.log(`\n💾 Saved page HTML to: ${filename}`);
      
      // Take a screenshot
      const screenshotFile = `superembed-player-${testCase.type}-${testCase.tmdbId}.png`;
      await page.screenshot({ path: screenshotFile, fullPage: true });
      console.log(`📸 Saved screenshot to: ${screenshotFile}`);
    }
    
    await browser.close();
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Superembed Puppeteer Analysis');
  console.log('==============================\n');
  
  for (const testCase of TEST_CASES) {
    await analyzeSuperembedWithPuppeteer(testCase);
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n\nAnalysis complete!');
}

// Run analysis
main().catch(console.error);
