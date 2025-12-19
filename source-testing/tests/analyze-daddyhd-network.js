#!/usr/bin/env node
/**
 * Analyze daddyhd.com network request flow for stream extraction
 * Uses Puppeteer to capture all network requests and identify the auth flow
 */

const puppeteer = require('puppeteer');

const CHANNEL = process.argv[2] || '51'; // Default to channel 51 (ESPN)

// Store all captured requests
const capturedRequests = {
  playerPage: [],
  heartbeat: [],
  serverLookup: [],
  m3u8: [],
  keys: [],
  segments: [],
  other: []
};

// Auth data extracted from page
let authData = {
  AUTH_TOKEN: null,
  CHANNEL_KEY: null,
  AUTH_COUNTRY: null,
  AUTH_TS: null,
  HB_URL: null,
  SERVER_KEY: null
};

function categorizeRequest(url, method, headers) {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('heartbeat')) return 'heartbeat';
  if (urlLower.includes('server_lookup')) return 'serverLookup';
  if (urlLower.includes('/key/')) return 'keys';
  if (urlLower.includes('mono.css') || urlLower.includes('.m3u8')) return 'm3u8';
  if (urlLower.includes('.ts') || urlLower.includes('segment')) return 'segments';
  if (urlLower.includes('daddyhd.php') || urlLower.includes('premiumtv')) return 'playerPage';
  
  return 'other';
}

async function analyzeNetworkFlow() {
  console.log('='.repeat(80));
  console.log('DADDYHD.COM NETWORK FLOW ANALYSIS');
  console.log(`Channel: ${CHANNEL}`);
  console.log('='.repeat(80));
  console.log('');

  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  const page = await browser.newPage();
  
  // Set viewport
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Set user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Enable request interception
  await page.setRequestInterception(true);

  // Capture all requests
  page.on('request', request => {
    const url = request.url();
    const method = request.method();
    const headers = request.headers();
    const category = categorizeRequest(url, method, headers);
    
    const reqData = {
      url,
      method,
      headers: { ...headers },
      postData: request.postData(),
      timestamp: Date.now()
    };
    
    capturedRequests[category].push(reqData);
    
    // Log important requests
    if (category !== 'other' && category !== 'segments') {
      console.log(`[${category.toUpperCase()}] ${method} ${url.substring(0, 100)}`);
      if (headers.authorization) {
        console.log(`  Authorization: ${headers.authorization.substring(0, 50)}...`);
      }
      if (headers['x-channel-key']) {
        console.log(`  X-Channel-Key: ${headers['x-channel-key']}`);
      }
      if (headers['x-client-token']) {
        console.log(`  X-Client-Token: ${headers['x-client-token'].substring(0, 50)}...`);
      }
    }
    
    request.continue();
  });

  // Capture responses
  page.on('response', async response => {
    const url = response.url();
    const status = response.status();
    const category = categorizeRequest(url, 'GET', {});
    
    if (category === 'heartbeat' || category === 'keys' || category === 'serverLookup') {
      try {
        const text = await response.text();
        console.log(`\n[${category.toUpperCase()} RESPONSE] Status: ${status}`);
        console.log(`  Body: ${text.substring(0, 200)}`);
      } catch (e) {
        // Binary response
      }
    }
  });

  try {
    // Step 1: Go to the watch page on daddyhd.com
    console.log('\n--- Step 1: Loading daddyhd.com watch page ---');
    const watchUrl = `https://daddyhd.com/watch.php?id=${CHANNEL}`;
    console.log(`Navigating to: ${watchUrl}`);
    
    await page.goto(watchUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait a bit for any dynamic content
    await new Promise(r => setTimeout(r, 2000));
    
    // Extract iframe src if present
    const iframeSrc = await page.evaluate(() => {
      const iframe = document.querySelector('iframe');
      return iframe ? iframe.src : null;
    });
    
    console.log(`\nIframe src: ${iframeSrc || 'No iframe found'}`);

    // Step 2: Navigate to the player page (epicplayplay.cfd)
    if (iframeSrc) {
      console.log('\n--- Step 2: Loading player page ---');
      await page.goto(iframeSrc, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
    } else {
      // Try direct player URL
      const playerUrl = `https://epicplayplay.cfd/premiumtv/daddyhd.php?id=${CHANNEL}`;
      console.log(`\n--- Step 2: Loading player directly ---`);
      console.log(`Navigating to: ${playerUrl}`);
      await page.goto(playerUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
    }

    // Wait for player to initialize
    await new Promise(r => setTimeout(r, 3000));

    // Step 3: Extract auth variables from page
    console.log('\n--- Step 3: Extracting auth variables ---');
    
    const pageAuthData = await page.evaluate(() => {
      return {
        AUTH_TOKEN: window.AUTH_TOKEN || null,
        CHANNEL_KEY: window.CHANNEL_KEY || null,
        AUTH_COUNTRY: window.AUTH_COUNTRY || null,
        AUTH_TS: window.AUTH_TS || null,
        HB_URL: window.HB_URL || null,
        SERVER_KEY: window.SERVER_KEY || null,
        // Also check for other potential variables
        CDN_URL: window.CDN_URL || null,
        STREAM_URL: window.STREAM_URL || null,
      };
    });
    
    authData = { ...authData, ...pageAuthData };
    
    console.log('\nExtracted Auth Data:');
    console.log(JSON.stringify(authData, null, 2));

    // Also extract from page source
    const pageContent = await page.content();
    
    // Extract variables from script tags
    const tokenMatch = pageContent.match(/AUTH_TOKEN\s*=\s*["']([^"']+)["']/);
    const channelKeyMatch = pageContent.match(/CHANNEL_KEY\s*=\s*["']([^"']+)["']/);
    const countryMatch = pageContent.match(/AUTH_COUNTRY\s*=\s*["']([^"']+)["']/);
    const tsMatch = pageContent.match(/AUTH_TS\s*=\s*["']([^"']+)["']/);
    const hbUrlMatch = pageContent.match(/HB_URL\s*=\s*["']([^"']+)["']/);
    
    if (tokenMatch) authData.AUTH_TOKEN = tokenMatch[1];
    if (channelKeyMatch) authData.CHANNEL_KEY = channelKeyMatch[1];
    if (countryMatch) authData.AUTH_COUNTRY = countryMatch[1];
    if (tsMatch) authData.AUTH_TS = tsMatch[1];
    if (hbUrlMatch) authData.HB_URL = hbUrlMatch[1];
    
    console.log('\nAuth Data from page source:');
    console.log(JSON.stringify(authData, null, 2));

    // Step 4: Wait for stream to start playing
    console.log('\n--- Step 4: Waiting for stream to initialize ---');
    await new Promise(r => setTimeout(r, 10000));

    // Step 5: Print summary
    console.log('\n' + '='.repeat(80));
    console.log('NETWORK FLOW SUMMARY');
    console.log('='.repeat(80));
    
    console.log('\n--- Player Page Requests ---');
    capturedRequests.playerPage.forEach((req, i) => {
      console.log(`${i + 1}. ${req.method} ${req.url}`);
    });
    
    console.log('\n--- Server Lookup Requests ---');
    capturedRequests.serverLookup.forEach((req, i) => {
      console.log(`${i + 1}. ${req.method} ${req.url}`);
    });
    
    console.log('\n--- Heartbeat Requests ---');
    capturedRequests.heartbeat.forEach((req, i) => {
      console.log(`${i + 1}. ${req.method} ${req.url}`);
      console.log(`   Headers: ${JSON.stringify(req.headers, null, 2).substring(0, 200)}`);
    });
    
    console.log('\n--- M3U8 Requests ---');
    capturedRequests.m3u8.forEach((req, i) => {
      console.log(`${i + 1}. ${req.method} ${req.url}`);
    });
    
    console.log('\n--- Key Requests ---');
    capturedRequests.keys.forEach((req, i) => {
      console.log(`${i + 1}. ${req.method} ${req.url}`);
      console.log(`   Authorization: ${req.headers.authorization || 'none'}`);
      console.log(`   X-Channel-Key: ${req.headers['x-channel-key'] || 'none'}`);
      console.log(`   X-Client-Token: ${req.headers['x-client-token'] ? req.headers['x-client-token'].substring(0, 50) + '...' : 'none'}`);
    });
    
    console.log(`\n--- Segment Requests: ${capturedRequests.segments.length} total ---`);
    if (capturedRequests.segments.length > 0) {
      console.log(`First segment: ${capturedRequests.segments[0].url.substring(0, 100)}`);
    }

    // Step 6: Extract CLIENT_TOKEN generation logic
    console.log('\n--- CLIENT_TOKEN Generation ---');
    const clientTokenLogic = await page.evaluate(() => {
      // Try to find generateClientToken function
      if (typeof generateClientToken === 'function') {
        return generateClientToken.toString();
      }
      return 'generateClientToken function not found in global scope';
    });
    console.log(clientTokenLogic);

    // Keep browser open for manual inspection
    console.log('\n--- Browser will stay open for 60 seconds for manual inspection ---');
    console.log('Press Ctrl+C to exit earlier');
    await new Promise(r => setTimeout(r, 60000));

  } catch (error) {
    console.error('Error during analysis:', error);
  } finally {
    await browser.close();
  }

  // Final output
  console.log('\n' + '='.repeat(80));
  console.log('EXTRACTED AUTH FLOW');
  console.log('='.repeat(80));
  console.log(`
1. Player Page: https://epicplayplay.cfd/premiumtv/daddyhd.php?id=${CHANNEL}
   - Extracts: AUTH_TOKEN, CHANNEL_KEY, AUTH_COUNTRY, AUTH_TS

2. Heartbeat: ${authData.HB_URL || 'https://chevy.kiko2.ru/heartbeat'}
   - Headers: Authorization: Bearer <AUTH_TOKEN>
   - Headers: X-Channel-Key: <CHANNEL_KEY>
   - Headers: X-Client-Token: base64(channelKey|country|timestamp|userAgent|fingerprint)

3. M3U8 Playlist: https://<server>new.kiko2.ru/<server>/premium${CHANNEL}/mono.css

4. Key Fetch: https://<server>.kiko2.ru/key/premium${CHANNEL}/<key_id>
   - Requires active heartbeat session
   - Same headers as heartbeat

Auth Data:
${JSON.stringify(authData, null, 2)}
`);
}

analyzeNetworkFlow().catch(console.error);
