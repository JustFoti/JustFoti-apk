/**
 * VIPRow Stream Data Extractor
 * 
 * This script extracts all available stream data from VIPRow/Casthill.
 * 
 * NOTE: Full m3u8 extraction requires a headless browser due to Cloudflare protection.
 * This script extracts the embed URL and all decoded parameters for analysis.
 */

const fs = require('fs');

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function extractViprowStream(eventUrl, linkNum = 1) {
  const result = {
    success: false,
    eventUrl,
    linkNum,
    viprowData: null,
    casthillData: null,
    streamData: null,
    embedUrl: null,
    manifestUrl: null,
    error: null,
  };

  try {
    // Step 1: Fetch VIPRow stream page
    console.log('1. Fetching VIPRow stream page...');
    const streamPageUrl = `${VIPROW_BASE}${eventUrl}-${linkNum}`;
    
    const streamRes = await fetch(streamPageUrl, {
      headers: { 'User-Agent': USER_AGENT, 'Referer': VIPROW_BASE }
    });
    
    if (!streamRes.ok) {
      throw new Error(`Failed to fetch stream page: ${streamRes.status}`);
    }
    
    const streamHtml = await streamRes.text();
    
    // Extract VIPRow parameters
    const zmid = streamHtml.match(/const\s+zmid\s*=\s*"([^"]+)"/)?.[1];
    const pid = streamHtml.match(/const\s+pid\s*=\s*(\d+)/)?.[1];
    const edm = streamHtml.match(/const\s+edm\s*=\s*"([^"]+)"/)?.[1];
    const configMatch = streamHtml.match(/const siteConfig = (\{[^;]+\});/);
    const config = configMatch ? JSON.parse(configMatch[1]) : {};
    
    result.viprowData = {
      zmid,
      pid: parseInt(pid),
      edm,
      csrf: config.csrf,
      csrf_ip: config.csrf_ip,
      category: config.linkAppendUri,
    };
    
    console.log('   zmid:', zmid);
    console.log('   edm:', edm);
    
    // Step 2: Fetch Casthill embed
    console.log('2. Fetching Casthill embed...');
    const embedParams = new URLSearchParams({
      pid, gacat: '', gatxt: config.linkAppendUri, v: zmid,
      csrf: config.csrf, csrf_ip: config.csrf_ip,
    });
    const embedUrl = `https://${edm}/sd0embed/${config.linkAppendUri}?${embedParams}`;
    result.embedUrl = embedUrl;
    
    const embedRes = await fetch(embedUrl, {
      headers: { 'User-Agent': USER_AGENT, 'Referer': streamPageUrl }
    });
    
    if (!embedRes.ok) {
      throw new Error(`Failed to fetch embed: ${embedRes.status}`);
    }
    
    const embedHtml = await embedRes.text();
    console.log('   Embed size:', embedHtml.length, 'bytes');
    
    // Step 3: Extract stream data from JavaScript
    console.log('3. Extracting stream data...');
    const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let script = null;
    let match;
    
    while ((match = scriptPattern.exec(embedHtml)) !== null) {
      if (match[1].includes('isPlayerLoaded') && match[1].includes('scode')) {
        script = match[1];
        break;
      }
    }
    
    if (!script) {
      throw new Error('Could not find stream script in embed');
    }
    
    // Extract all values
    const deviceId = script.match(/r="([a-z0-9]+)"/)?.[1];
    const streamId = script.match(/s="([a-z0-9]{15,})"/)?.[1];
    const hostId = script.match(/m="([a-z0-9-]+)"/)?.[1];
    
    // Base URL (single base64)
    const cMatch = script.match(/c=t\("([A-Za-z0-9+/=]+)"\)/);
    const baseUrl = cMatch ? Buffer.from(cMatch[1], 'base64').toString('utf8') : null;
    
    // Initial scode (char code array)
    const iMatch = script.match(/i=e\(\[([0-9,]+)\]\)/);
    const scode = iMatch ? String.fromCharCode(...JSON.parse('[' + iMatch[1] + ']')) : null;
    
    // Timestamp
    const timestamp = script.match(/a=parseInt\("(\d+)"/)?.[1];
    
    // X-CSRF-Auth header (single base64)
    const lMatch = script.match(/l=t\("([A-Za-z0-9+/=]+)"\)/);
    const csrfAuth = lMatch ? Buffer.from(lMatch[1], 'base64').toString('utf8') : null;
    
    // Manifest URL (double base64)
    const dMatch = script.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
    let manifestUrl = null;
    if (dMatch) {
      const charCodes = JSON.parse('[' + dMatch[1] + ']');
      const dString = String.fromCharCode(...charCodes);
      const dDecoded = Buffer.from(dString, 'base64').toString('utf8');
      manifestUrl = Buffer.from(dDecoded, 'base64').toString('utf8');
    }
    
    // Poster image
    const posterMatch = script.match(/f="([^"]+\.jpeg)"/);
    const poster = posterMatch?.[1];
    
    result.casthillData = {
      deviceId,
      streamId,
      hostId,
      baseUrl,
      scode,
      timestamp,
      csrfAuth,
      poster,
    };
    
    result.manifestUrl = manifestUrl;
    
    // Parse manifest URL for additional info
    if (manifestUrl) {
      const mUrl = new URL(manifestUrl);
      const pathParts = mUrl.pathname.split('/').filter(p => p);
      
      result.streamData = {
        manifestHost: mUrl.hostname,
        manifestPath: mUrl.pathname,
        streamId: pathParts[1],
        expiryTimestamp: pathParts[2],
        hash: pathParts[3],
        expiryDate: new Date(parseInt(pathParts[2]) * 1000).toISOString(),
      };
    }
    
    result.success = true;
    
    console.log('\n=== Extraction Complete ===');
    console.log('Device ID:', deviceId);
    console.log('Stream ID:', streamId);
    console.log('Host ID:', hostId);
    console.log('Base URL:', baseUrl);
    console.log('Scode:', scode);
    console.log('Timestamp:', timestamp);
    console.log('Manifest URL:', manifestUrl);
    
  } catch (error) {
    result.error = error.message;
    console.error('Error:', error.message);
  }
  
  return result;
}

async function main() {
  try {
    // Get a live event
    console.log('Fetching VIPRow schedule...\n');
    const scheduleRes = await fetch(`${VIPROW_BASE}/sports-big-games`, {
      headers: { 'User-Agent': USER_AGENT }
    });
    const scheduleHtml = await scheduleRes.text();
    
    const eventMatch = scheduleHtml.match(/href="([^"]+online-stream)"[^>]*role="button"/);
    if (!eventMatch) {
      console.log('No live events found');
      return;
    }
    
    const eventUrl = eventMatch[1];
    console.log('Found event:', eventUrl, '\n');
    
    // Extract stream data
    const result = await extractViprowStream(eventUrl);
    
    // Save result
    fs.writeFileSync('viprow-extract-result.json', JSON.stringify(result, null, 2));
    console.log('\nSaved result to viprow-extract-result.json');
    
    // Summary
    console.log('\n=== Summary ===');
    if (result.success) {
      console.log('✓ Successfully extracted stream data');
      console.log('');
      console.log('For iframe playback, use:');
      console.log('  embedUrl:', result.embedUrl);
      console.log('');
      console.log('For direct m3u8 (requires Cloudflare bypass):');
      console.log('  manifestUrl:', result.manifestUrl);
      console.log('');
      console.log('Token refresh endpoint (protected by Cloudflare):');
      const tokenUrl = `${result.casthillData.baseUrl}?scode=${result.casthillData.scode}&stream=${result.casthillData.streamId}&expires=${result.casthillData.timestamp}&u_id=${result.casthillData.deviceId}&host_id=${result.casthillData.hostId}`;
      console.log('  tokenUrl:', tokenUrl);
    } else {
      console.log('✗ Extraction failed:', result.error);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Export for use as module
module.exports = { extractViprowStream };

// Run if called directly
if (require.main === module) {
  main();
}
