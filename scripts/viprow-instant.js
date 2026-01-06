/**
 * VIPRow Instant - Fetch and use immediately
 */

const fs = require('fs');

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  const startTime = Date.now();
  
  try {
    // Step 1: Get event
    console.log('1. Fetching schedule...');
    const scheduleRes = await fetch(`${VIPROW_BASE}/sports-big-games`, {
      headers: { 'User-Agent': USER_AGENT }
    });
    const scheduleHtml = await scheduleRes.text();
    const eventMatch = scheduleHtml.match(/href="([^"]+online-stream)"[^>]*role="button"/);
    if (!eventMatch) throw new Error('No events found');
    const eventUrl = eventMatch[1];
    console.log('   Event:', eventUrl, `(${Date.now() - startTime}ms)`);
    
    // Step 2: Get stream params
    console.log('2. Fetching stream page...');
    const streamPageUrl = `${VIPROW_BASE}${eventUrl}-1`;
    const streamRes = await fetch(streamPageUrl, {
      headers: { 'User-Agent': USER_AGENT, 'Referer': VIPROW_BASE }
    });
    const streamHtml = await streamRes.text();
    
    const zmid = streamHtml.match(/const\s+zmid\s*=\s*"([^"]+)"/)?.[1];
    const pid = streamHtml.match(/const\s+pid\s*=\s*(\d+)/)?.[1];
    const edm = streamHtml.match(/const\s+edm\s*=\s*"([^"]+)"/)?.[1];
    const config = JSON.parse(streamHtml.match(/const siteConfig = (\{[^;]+\});/)?.[1] || '{}');
    console.log('   zmid:', zmid, `(${Date.now() - startTime}ms)`);
    
    // Step 3: Get embed
    console.log('3. Fetching embed...');
    const embedParams = new URLSearchParams({
      pid, gacat: '', gatxt: config.linkAppendUri, v: zmid,
      csrf: config.csrf, csrf_ip: config.csrf_ip,
    });
    const embedUrl = `https://${edm}/sd0embed/${config.linkAppendUri}?${embedParams}`;
    
    const embedRes = await fetch(embedUrl, {
      headers: { 'User-Agent': USER_AGENT, 'Referer': streamPageUrl }
    });
    const embedHtml = await embedRes.text();
    console.log('   Embed size:', embedHtml.length, `(${Date.now() - startTime}ms)`);
    
    // Step 4: Extract data
    console.log('4. Extracting data...');
    const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let script = null;
    let match;
    while ((match = scriptPattern.exec(embedHtml)) !== null) {
      const content = match[1];
      if (content.includes('isPlayerLoaded') && content.includes('scode')) {
        script = content;
        console.log('   Found script with isPlayerLoaded, length:', content.length);
        break;
      }
    }
    
    if (!script) {
      // Save for debugging
      fs.writeFileSync('casthill-debug.html', embedHtml);
      throw new Error('Could not find stream script - saved to casthill-debug.html');
    }
    
    // Extract device_id
    const rMatch = script.match(/r="([a-z0-9]+)"/);
    const deviceId = rMatch?.[1];
    
    // Extract manifest URL (double base64)
    const dMatch = script.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
    let manifestUrl = null;
    if (dMatch) {
      const charCodes = JSON.parse('[' + dMatch[1] + ']');
      const dString = String.fromCharCode(...charCodes);
      const dDecoded = Buffer.from(dString, 'base64').toString('utf8');
      manifestUrl = Buffer.from(dDecoded, 'base64').toString('utf8');
    }
    
    console.log('   deviceId:', deviceId);
    console.log('   manifestUrl:', manifestUrl);
    console.log('   Time elapsed:', Date.now() - startTime, 'ms');
    
    // Step 5: Fetch manifest IMMEDIATELY
    console.log('5. Fetching manifest...');
    const url = new URL(manifestUrl);
    url.searchParams.set('u_id', deviceId);
    
    const manifestRes = await fetch(url.toString(), {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': '*/*',
        'Referer': 'https://casthill.net/',
        'Origin': 'https://casthill.net',
      },
      redirect: 'follow',
    });
    
    console.log('   Status:', manifestRes.status, `(${Date.now() - startTime}ms)`);
    
    if (manifestRes.ok) {
      const content = await manifestRes.text();
      console.log('\n=== SUCCESS ===');
      console.log('Final URL:', manifestRes.url);
      console.log('\nContent (first 2000 chars):');
      console.log(content.substring(0, 2000));
      
      if (content.includes('#EXTM3U')) {
        console.log('\n✓ Got valid M3U8 playlist!');
        fs.writeFileSync('viprow-manifest.m3u8', content);
      }
    } else {
      const errorText = await manifestRes.text();
      console.log('   Error:', errorText.substring(0, 300));
      
      // Try without u_id
      console.log('\n   Trying without u_id...');
      const manifestRes2 = await fetch(manifestUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': '*/*',
          'Referer': 'https://casthill.net/',
          'Origin': 'https://casthill.net',
        },
      });
      console.log('   Status:', manifestRes2.status);
      if (manifestRes2.ok) {
        const content = await manifestRes2.text();
        console.log('   Content:', content.substring(0, 500));
      } else {
        console.log('   Error:', (await manifestRes2.text()).substring(0, 200));
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
