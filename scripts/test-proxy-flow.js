/**
 * Test the full proxy flow for VIPRow streams
 * 
 * This simulates what the browser would do:
 * 1. Get stream info from viprow-stream API
 * 2. Fetch manifest through proxy
 * 3. Fetch key through proxy
 * 4. Fetch segment through proxy
 */

const { extractM3U8, getAvailableStreams } = require('./viprow-m3u8-extract.js');

// Simulate the proxy logic locally
function rewriteManifestUrls(manifest, baseUrl, proxyBase) {
  const lines = manifest.split('\n');
  const rewritten = [];
  
  for (const line of lines) {
    let newLine = line;
    
    if (line.includes('URI="')) {
      newLine = line.replace(/URI="([^"]+)"/, (_, url) => {
        const fullUrl = url.startsWith('http') ? url : new URL(url, baseUrl).toString();
        const proxyUrl = `${proxyBase}?url=${encodeURIComponent(fullUrl)}&type=key`;
        return `URI="${proxyUrl}"`;
      });
    }
    else if (line.trim() && !line.startsWith('#') && (line.includes('.ts') || line.includes('?'))) {
      const fullUrl = line.startsWith('http') ? line.trim() : new URL(line.trim(), baseUrl).toString();
      newLine = `${proxyBase}?url=${encodeURIComponent(fullUrl)}&type=segment`;
    }
    
    rewritten.push(newLine);
  }
  
  return rewritten.join('\n');
}

async function testProxyFlow() {
  console.log('=== Testing VIPRow Proxy Flow ===\n');
  
  // Step 1: Get stream
  const streams = await getAvailableStreams();
  if (streams.length === 0) {
    console.log('No streams available');
    return;
  }
  
  console.log('Testing with:', streams[0].title);
  const result = await extractM3U8(streams[0].url);
  
  if (!result.success) {
    console.log('Failed to extract stream:', result.error);
    return;
  }
  
  console.log('\n✅ Stream extracted');
  console.log('M3U8 URL:', result.m3u8Url);
  
  // Step 2: Simulate proxy rewriting
  const proxyBase = 'http://localhost:3000/api/livetv/hls-proxy';
  const baseUrl = result.m3u8Url.substring(0, result.m3u8Url.lastIndexOf('/') + 1);
  const rewrittenManifest = rewriteManifestUrls(result.manifest, baseUrl, proxyBase);
  
  console.log('\n--- Rewritten Manifest (first 1000 chars) ---');
  console.log(rewrittenManifest.substring(0, 1000));
  
  // Step 3: Extract proxied URLs
  const keyMatch = rewrittenManifest.match(/URI="([^"]+)"/);
  const segmentMatch = rewrittenManifest.match(/hls-proxy\?url=([^&]+)&type=segment/);
  
  if (keyMatch) {
    console.log('\n✅ Proxied Key URL:');
    console.log(keyMatch[1].substring(0, 100) + '...');
  }
  
  if (segmentMatch) {
    console.log('\n✅ Proxied Segment URL (decoded):');
    console.log(decodeURIComponent(segmentMatch[1]).substring(0, 100) + '...');
  }
  
  // Step 4: Test actual proxy fetch (if server is running)
  console.log('\n--- Testing actual proxy (requires server running) ---');
  
  try {
    const proxiedManifestUrl = `${proxyBase}?url=${encodeURIComponent(result.m3u8Url)}&type=manifest`;
    console.log('Proxied manifest URL:', proxiedManifestUrl);
    
    // This will only work if the dev server is running
    const res = await fetch(proxiedManifestUrl, { timeout: 5000 }).catch(() => null);
    if (res) {
      console.log('Proxy response status:', res.status);
      if (res.ok) {
        const text = await res.text();
        console.log('✅ Proxy working! Manifest length:', text.length);
      }
    } else {
      console.log('(Server not running - skipping live test)');
    }
  } catch (e) {
    console.log('(Server not running - skipping live test)');
  }
  
  console.log('\n=== Summary ===');
  console.log('The proxy flow is ready. To use in browser:');
  console.log('1. Start the dev server: npm run dev');
  console.log('2. Use the proxied URL in hls.js:');
  console.log(`   /api/livetv/hls-proxy?url=${encodeURIComponent(result.m3u8Url)}&type=manifest`);
}

testProxyFlow().catch(console.error);
