#!/usr/bin/env node
/**
 * Analyze daddyhd.com network request flow for stream extraction - V2
 * Improved version that handles iframes and extracts auth data properly
 */

const puppeteer = require('puppeteer');

const CHANNEL = process.argv[2] || '51';

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
let authData = {};

// Key request details
let keyRequestDetails = [];

function categorizeRequest(url) {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('heartbeat')) return 'heartbeat';
  if (urlLower.includes('server_lookup')) return 'serverLookup';
  if (urlLower.includes('/key/')) return 'keys';
  if (urlLower.includes('mono.css') || urlLower.includes('.m3u8') || urlLower.includes('playlist')) return 'm3u8';
  if (urlLower.includes('.ts') || (urlLower.includes('kiko2.ru') && !urlLower.includes('key') && !urlLower.includes('heartbeat') && !urlLower.includes('lookup'))) return 'segments';
  if (urlLower.includes('daddyhd.php') || urlLower.includes('premiumtv')) return 'playerPage';
  
  return 'other';
}

async function analyzeNetworkFlow() {
  console.log('='.repeat(80));
  console.log('DADDYHD.COM NETWORK FLOW ANALYSIS V2');
  console.log(`Channel: ${CHANNEL}`);
  console.log('='.repeat(80));
  console.log('');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  const page = await browser.newPage();
  
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  await page.setRequestInterception(true);

  // Capture all requests
  page.on('request', request => {
    const url = request.url();
    const method = request.method();
    const headers = request.headers();
    const category = categorizeRequest(url);
    
    const reqData = {
      url,
      method,
      headers: { ...headers },
      postData: request.postData(),
      timestamp: Date.now()
    };
    
    capturedRequests[category].push(reqData);
    
    // Log important requests
    if (category === 'keys' || category === 'heartbeat') {
      console.log(`\n[${category.toUpperCase()}] ${method} ${url}`);
      if (headers.authorization) {
        console.log(`  Authorization: Bearer ${headers.authorization.replace('Bearer ', '').substring(0, 50)}...`);
      }
      if (headers['x-channel-key']) {
        console.log(`  X-Channel-Key: ${headers['x-channel-key']}`);
      }
      if (headers['x-client-token']) {
        console.log(`  X-Client-Token: ${headers['x-client-token'].substring(0, 60)}...`);
        // Decode the client token
        try {
          const decoded = Buffer.from(headers['x-client-token'], 'base64').toString('utf-8');
          console.log(`  X-Client-Token (decoded): ${decoded.substring(0, 100)}...`);
        } catch (e) {}
      }
      
      // Store key request details
      if (category === 'keys') {
        keyRequestDetails.push({
          url,
          authorization: headers.authorization,
          channelKey: headers['x-channel-key'],
          clientToken: headers['x-client-token'],
          clientTokenDecoded: headers['x-client-token'] ? 
            Buffer.from(headers['x-client-token'], 'base64').toString('utf-8') : null
        });
      }
    } else if (category === 'serverLookup') {
      console.log(`[SERVERLOOKUP] ${method} ${url}`);
    } else if (category === 'm3u8') {
      console.log(`[M3U8] ${method} ${url.substring(0, 80)}...`);
    }
    
    request.continue();
  });

  // Capture responses
  page.on('response', async response => {
    const url = response.url();
    const status = response.status();
    const category = categorizeRequest(url);
    
    if (category === 'heartbeat' || category === 'serverLookup') {
      try {
        const text = await response.text();
        console.log(`  Response [${status}]: ${text.substring(0, 150)}`);
      } catch (e) {}
    } else if (category === 'keys') {
      console.log(`  Response [${status}]: ${status === 200 ? '16-byte AES key' : 'ERROR'}`);
    }
  });

  try {
    // Go directly to the player page
    const playerUrl = `https://epicplayplay.cfd/premiumtv/daddyhd.php?id=${CHANNEL}`;
    console.log(`\n--- Loading player page: ${playerUrl} ---\n`);
    
    await page.goto(playerUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait for stream to initialize
    console.log('\n--- Waiting for stream to initialize (15 seconds) ---');
    await new Promise(r => setTimeout(r, 15000));

    // Extract auth variables from page
    console.log('\n--- Extracting auth variables from page ---');
    
    const pageContent = await page.content();
    
    // Extract all auth-related variables
    const patterns = {
      AUTH_TOKEN: /AUTH_TOKEN\s*=\s*["']([^"']+)["']/,
      CHANNEL_KEY: /CHANNEL_KEY\s*=\s*["']([^"']+)["']/,
      AUTH_COUNTRY: /AUTH_COUNTRY\s*=\s*["']([^"']+)["']/,
      AUTH_TS: /AUTH_TS\s*=\s*["']([^"']+)["']/,
      HB_URL: /HB_URL\s*=\s*["']([^"']+)["']/,
      SERVER_KEY: /SERVER_KEY\s*=\s*["']([^"']+)["']/,
      CDN_URL: /CDN_URL\s*=\s*["']([^"']+)["']/,
    };
    
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = pageContent.match(pattern);
      if (match) {
        authData[key] = match[1];
      }
    }
    
    // Also try to get from window object
    const windowData = await page.evaluate(() => {
      return {
        AUTH_TOKEN: window.AUTH_TOKEN,
        CHANNEL_KEY: window.CHANNEL_KEY,
        AUTH_COUNTRY: window.AUTH_COUNTRY,
        AUTH_TS: window.AUTH_TS,
        HB_URL: window.HB_URL,
        SERVER_KEY: window.SERVER_KEY,
      };
    });
    
    // Merge window data
    for (const [key, value] of Object.entries(windowData)) {
      if (value && !authData[key]) {
        authData[key] = value;
      }
    }

    // Extract generateClientToken function
    console.log('\n--- Extracting CLIENT_TOKEN generation logic ---');
    const clientTokenFunc = await page.evaluate(() => {
      if (typeof generateClientToken === 'function') {
        return generateClientToken.toString();
      }
      // Search in scripts
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        if (script.textContent && script.textContent.includes('generateClientToken')) {
          const match = script.textContent.match(/function\s+generateClientToken[^}]+\}/s);
          if (match) return match[0];
        }
      }
      return null;
    });
    
    if (clientTokenFunc) {
      console.log('generateClientToken function found:');
      console.log(clientTokenFunc);
    }

  } catch (error) {
    console.error('Error during analysis:', error.message);
  } finally {
    await browser.close();
  }

  // Print comprehensive summary
  console.log('\n' + '='.repeat(80));
  console.log('COMPLETE NETWORK FLOW SUMMARY');
  console.log('='.repeat(80));
  
  console.log('\n### AUTH DATA EXTRACTED ###');
  console.log(JSON.stringify(authData, null, 2));
  
  console.log('\n### SERVER LOOKUP ###');
  capturedRequests.serverLookup.forEach((req, i) => {
    console.log(`${i + 1}. ${req.url}`);
  });
  
  console.log('\n### HEARTBEAT REQUESTS ###');
  capturedRequests.heartbeat.forEach((req, i) => {
    console.log(`${i + 1}. ${req.url}`);
  });
  
  console.log('\n### M3U8 PLAYLIST REQUESTS ###');
  capturedRequests.m3u8.forEach((req, i) => {
    console.log(`${i + 1}. ${req.url}`);
  });
  
  console.log('\n### KEY REQUESTS (DETAILED) ###');
  keyRequestDetails.forEach((req, i) => {
    console.log(`\n${i + 1}. ${req.url}`);
    console.log(`   Authorization: Bearer ${req.authorization?.replace('Bearer ', '').substring(0, 40)}...`);
    console.log(`   X-Channel-Key: ${req.channelKey}`);
    console.log(`   X-Client-Token (decoded): ${req.clientTokenDecoded?.substring(0, 80)}...`);
  });
  
  console.log(`\n### SEGMENTS: ${capturedRequests.segments.length} total ###`);
  
  // Print the authentication flow
  console.log('\n' + '='.repeat(80));
  console.log('AUTHENTICATION FLOW FOR CLOUDFLARE PROXY');
  console.log('='.repeat(80));
  console.log(`
## Step 1: Fetch Player Page
GET https://epicplayplay.cfd/premiumtv/daddyhd.php?id=${CHANNEL}
Headers:
  Referer: https://daddyhd.com/

Extract from response:
  - AUTH_TOKEN: ${authData.AUTH_TOKEN?.substring(0, 40) || 'N/A'}...
  - CHANNEL_KEY: ${authData.CHANNEL_KEY || 'N/A'}
  - AUTH_COUNTRY: ${authData.AUTH_COUNTRY || 'N/A'}
  - AUTH_TS: ${authData.AUTH_TS || 'N/A'}

## Step 2: Server Lookup (Optional)
GET https://chevy.giokko.ru/server_lookup?channel_id=premium${CHANNEL}
Returns: {"server_key":"<server>"}

## Step 3: Heartbeat (Establish Session)
GET https://chevy.kiko2.ru/heartbeat
Headers:
  Authorization: Bearer <AUTH_TOKEN>
  X-Channel-Key: premium${CHANNEL}
  X-Client-Token: base64(channelKey|country|timestamp|userAgent|fingerprint)

## Step 4: Fetch M3U8 Playlist
GET https://<server>new.kiko2.ru/<server>/premium${CHANNEL}/mono.css
No auth required

## Step 5: Fetch Encryption Keys
GET https://chevy.kiko2.ru/key/premium${CHANNEL}/<key_id>
Headers:
  Authorization: Bearer <AUTH_TOKEN>
  X-Channel-Key: premium${CHANNEL}
  X-Client-Token: <same as heartbeat>

## CLIENT_TOKEN Format
base64(channelKey|country|timestamp|userAgent|screen|timezone|language)
Example decoded: premium51|US|1766182626|Mozilla/5.0...|1920x1080|America/New_York|en-US
`);
}

analyzeNetworkFlow().catch(console.error);
