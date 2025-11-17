/**
 * Analyze the final Superembed player page (streamingnow.mov)
 */

const puppeteer = require('puppeteer');
const https = require('https');
const zlib = require('zlib');

function fetchPage(url, referer, origin, followRedirects = true) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': referer,
        'Origin': origin,
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, res => {
      if (followRedirects && (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308)) {
        const redirectUrl = res.headers.location;
        console.log('→', redirectUrl);
        return fetchPage(redirectUrl, referer, origin, followRedirects).then(resolve).catch(reject);
      }
      
      let stream = res;
      const encoding = res.headers['content-encoding'];
      
      if (encoding === 'br') {
        stream = res.pipe(zlib.createBrotliDecompress());
      } else if (encoding === 'gzip') {
        stream = res.pipe(zlib.createGunzip());
      } else if (encoding === 'deflate') {
        stream = res.pipe(zlib.createInflate());
      }
      
      let data = '';
      stream.on('data', chunk => data += chunk);
      stream.on('end', () => resolve({ url: res.req.path, finalUrl: res.headers.location || url, body: data }));
      stream.on('error', reject);
    }).on('error', reject);
  });
}

function extractSuperembedHash(html) {
  const match = html.match(/data-hash="([^"]+)"[^>]*>[\s\S]{0,200}?Superembed/i);
  return match ? match[1] : null;
}

function extractSrcRcpUrl(html) {
  const match = html.match(/['"]\/srcrcp\/([A-Za-z0-9+\/=\-_]+)['"]/);
  return match ? `https://cloudnestra.com/srcrcp/${match[1]}` : null;
}

async function analyzeSuperembed() {
  const tmdbId = '550';
  const type = 'movie';
  
  console.log('Step 1: Getting embed page...');
  const embedUrl = `https://vidsrc-embed.ru/embed/${type}/${tmdbId}`;
  const embedPage = await fetchPage(embedUrl, 'https://vidsrc-embed.ru/', 'https://vidsrc-embed.ru', false);
  
  const hash = extractSuperembedHash(embedPage.body);
  if (!hash) {
    console.log('✗ No hash found');
    return;
  }
  console.log('✓ Hash found');
  
  console.log('\nStep 2: Getting RCP page...');
  const rcpUrl = `https://cloudnestra.com/rcp/${hash}`;
  const rcpPage = await fetchPage(rcpUrl, embedUrl, 'https://vidsrc-embed.ru', false);
  
  const srcRcpUrl = extractSrcRcpUrl(rcpPage.body);
  if (!srcRcpUrl) {
    console.log('✗ No SrcRCP URL found');
    return;
  }
  console.log('✓ SrcRCP URL found');
  
  console.log('\nStep 3: Following redirects from SrcRCP...');
  const result = await fetchPage(srcRcpUrl, embedUrl, 'https://vidsrc-embed.ru', true);
  
  const finalUrl = result.finalUrl;
  console.log('\n✓ Final URL:', finalUrl);
  
  console.log('\nStep 4: Launching Puppeteer to capture M3U8 requests...');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--start-maximized'
    ],
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Block popups and ads
  await page.evaluateOnNewDocument(() => {
    window.open = () => null;
  });
  
  const m3u8Urls = new Set();
  const mp4Urls = new Set();
  const allRequests = [];
  
  page.on('request', request => {
    const url = request.url();
    allRequests.push(url);
    
    if (url.includes('.m3u8')) {
      console.log('🎯 M3U8 REQUEST:', url);
      m3u8Urls.add(url);
    } else if (url.includes('.mp4')) {
      console.log('🎯 MP4 REQUEST:', url);
      mp4Urls.add(url);
    } else if (url.includes('master') || url.includes('playlist') || url.includes('stream')) {
      console.log('📡 Potential stream URL:', url);
    }
  });
  
  page.on('response', async response => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';
    
    if (url.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('m3u8')) {
      console.log('🎯 M3U8 RESPONSE:', url);
      m3u8Urls.add(url);
      
      try {
        const body = await response.text();
        console.log('M3U8 Content (first 500 chars):');
        console.log(body.substring(0, 500));
      } catch (e) {}
    } else if (url.includes('.mp4') || contentType.includes('mp4')) {
      console.log('🎯 MP4 RESPONSE:', url);
      mp4Urls.add(url);
    }
  });
  
  console.log('\nLoading final player page...');
  await page.goto(finalUrl, {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  console.log('Waiting for player to load and capture requests...');
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  // Save the page HTML for analysis
  const fs = require('fs');
  const html = await page.content();
  fs.writeFileSync('superembed-player-page.html', html);
  console.log('✓ Saved page HTML to superembed-player-page.html');
  
  // Save all requests
  fs.writeFileSync('superembed-all-requests.json', JSON.stringify(allRequests, null, 2));
  console.log('✓ Saved all requests to superembed-all-requests.json');
  
  // Try to extract from page
  const videoData = await page.evaluate(() => {
    const data = {
      videoElements: [],
      globalVars: {}
    };
    
    // Check video elements
    document.querySelectorAll('video').forEach(v => {
      if (v.src) data.videoElements.push({ type: 'video.src', url: v.src });
      v.querySelectorAll('source').forEach(s => {
        if (s.src) data.videoElements.push({ type: 'source.src', url: s.src });
      });
    });
    
    // Check global variables
    const vars = ['playerInstance', 'jwplayer', 'player', 'videoUrl', 'm3u8Url', 'sources'];
    vars.forEach(v => {
      if (window[v]) {
        try {
          const val = window[v];
          if (typeof val === 'string') {
            data.globalVars[v] = val;
          } else if (typeof val === 'object') {
            data.globalVars[v] = JSON.stringify(val).substring(0, 500);
          }
        } catch (e) {}
      }
    });
    
    return data;
  });
  
  await browser.close();
  
  console.log('\n' + '='.repeat(80));
  console.log('RESULTS');
  console.log('='.repeat(80));
  
  if (m3u8Urls.size > 0) {
    console.log('\n✅ M3U8 URLs FOUND:');
    Array.from(m3u8Urls).forEach((url, i) => console.log(`  ${i + 1}. ${url}`));
  }
  
  if (mp4Urls.size > 0) {
    console.log('\n✅ MP4 URLs FOUND:');
    Array.from(mp4Urls).forEach((url, i) => console.log(`  ${i + 1}. ${url}`));
  }
  
  if (videoData.videoElements.length > 0) {
    console.log('\n📦 Video elements:');
    videoData.videoElements.forEach((v, i) => console.log(`  ${i + 1}. [${v.type}] ${v.url}`));
  }
  
  if (Object.keys(videoData.globalVars).length > 0) {
    console.log('\n📦 Global variables:');
    Object.entries(videoData.globalVars).forEach(([k, v]) => console.log(`  ${k}:`, v));
  }
  
  if (m3u8Urls.size === 0 && mp4Urls.size === 0) {
    console.log('\n⚠️  No video URLs captured!');
  }
}

analyzeSuperembed().catch(console.error);
