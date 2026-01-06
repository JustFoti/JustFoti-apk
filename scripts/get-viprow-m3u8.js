/**
 * VIPRow M3U8 Extractor
 * 
 * This script extracts the actual m3u8 stream URL from VIPRow/Casthill.
 * 
 * Flow:
 * 1. Fetch VIPRow stream page -> get zmid, csrf tokens
 * 2. Fetch Casthill embed -> get scode, timestamp, device_id, stream_id, base_url
 * 3. Construct stream URL -> fetch to get m3u8
 */

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function getViprowStreamParams(eventUrl) {
  const streamPageUrl = `${VIPROW_BASE}${eventUrl}-1`;
  
  const response = await fetch(streamPageUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html',
      'Referer': VIPROW_BASE,
    }
  });
  
  const html = await response.text();
  
  const zmid = html.match(/const\s+zmid\s*=\s*"([^"]+)"/)?.[1];
  const pid = html.match(/const\s+pid\s*=\s*(\d+)/)?.[1];
  const edm = html.match(/const\s+edm\s*=\s*"([^"]+)"/)?.[1];
  const config = JSON.parse(html.match(/const siteConfig = (\{[^;]+\});/)?.[1] || '{}');
  
  return {
    zmid,
    pid,
    edm,
    csrf: config.csrf,
    csrf_ip: config.csrf_ip,
    category: config.linkAppendUri,
    referer: streamPageUrl,
  };
}

async function getCasthillStreamData(params) {
  const embedParams = new URLSearchParams({
    pid: params.pid,
    gacat: '',
    gatxt: params.category,
    v: params.zmid,
    csrf: params.csrf,
    csrf_ip: params.csrf_ip,
  });
  
  const embedUrl = `https://${params.edm}/sd0embed/${params.category}?${embedParams}`;
  
  const response = await fetch(embedUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html',
      'Referer': params.referer,
    }
  });
  
  const html = await response.text();
  
  // Extract the stream parameters from the embed page
  // i = scode (from char codes)
  const iMatch = html.match(/i=e\(\[([0-9,]+)\]\)/);
  const scode = iMatch ? String.fromCharCode(...JSON.parse('[' + iMatch[1] + ']')) : null;
  
  // a = timestamp
  const timestamp = html.match(/a=parseInt\("(\d+)"/)?.[1];
  
  // r = device_id
  const deviceId = html.match(/r="([a-z0-9]{20,})"/)?.[1];
  
  // s = stream_id
  const streamId = html.match(/,s="([a-z0-9]{15,})"/)?.[1];
  
  // c = base URL (base64 encoded)
  const cMatch = html.match(/c=t\("([A-Za-z0-9+/=]+)"\)/);
  const baseUrl = cMatch ? Buffer.from(cMatch[1], 'base64').toString('utf8') : null;
  
  // m = host_id
  const hostId = html.match(/m="([a-z0-9-]+)"/)?.[1];
  
  return {
    scode,
    timestamp,
    deviceId,
    streamId,
    baseUrl,
    hostId,
    embedUrl,
  };
}

function constructStreamUrl(data) {
  if (!data.baseUrl || !data.scode || !data.streamId || !data.timestamp || !data.deviceId || !data.hostId) {
    return null;
  }
  
  const params = new URLSearchParams({
    scode: data.scode,
    stream: data.streamId,
    expires: data.timestamp,
    u_id: data.deviceId,
    host_id: data.hostId,
  });
  
  return `${data.baseUrl}?${params}`;
}

async function fetchStreamUrl(url, referer) {
  console.log('\nFetching stream URL:', url);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': '*/*',
      'Referer': referer,
      'Origin': 'https://casthill.net',
    },
    redirect: 'follow',
  });
  
  console.log('Status:', response.status);
  console.log('Content-Type:', response.headers.get('content-type'));
  console.log('Location:', response.headers.get('location'));
  
  const text = await response.text();
  console.log('Response (first 500 chars):', text.substring(0, 500));
  
  // Check if it's an m3u8
  if (text.includes('#EXTM3U')) {
    console.log('\n✓ Got M3U8 playlist!');
    return text;
  }
  
  // Check if there's a redirect URL in the response
  const m3u8Match = text.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
  if (m3u8Match) {
    console.log('\nFound m3u8 URL in response:', m3u8Match[0]);
    return m3u8Match[0];
  }
  
  return null;
}

async function main() {
  try {
    // 1. Get a live event
    console.log('1. Fetching VIPRow schedule...');
    const scheduleRes = await fetch(`${VIPROW_BASE}/sports-big-games`, {
      headers: { 'User-Agent': USER_AGENT }
    });
    const scheduleHtml = await scheduleRes.text();
    
    const eventMatch = scheduleHtml.match(/href="([^"]+online-stream)"[^>]*role="button"/);
    if (!eventMatch) throw new Error('No events found');
    
    const eventUrl = eventMatch[1];
    console.log('   Event:', eventUrl);
    
    // 2. Get VIPRow stream params
    console.log('\n2. Getting VIPRow stream params...');
    const viprowParams = await getViprowStreamParams(eventUrl);
    console.log('   zmid:', viprowParams.zmid);
    console.log('   category:', viprowParams.category);
    
    // 3. Get Casthill stream data
    console.log('\n3. Getting Casthill stream data...');
    const casthillData = await getCasthillStreamData(viprowParams);
    console.log('   scode:', casthillData.scode);
    console.log('   timestamp:', casthillData.timestamp);
    console.log('   deviceId:', casthillData.deviceId);
    console.log('   streamId:', casthillData.streamId);
    console.log('   baseUrl:', casthillData.baseUrl);
    console.log('   hostId:', casthillData.hostId);
    
    // 4. Construct and fetch stream URL
    console.log('\n4. Constructing stream URL...');
    const streamUrl = constructStreamUrl(casthillData);
    console.log('   URL:', streamUrl);
    
    if (streamUrl) {
      // 5. Fetch the stream
      console.log('\n5. Fetching stream...');
      const result = await fetchStreamUrl(streamUrl, casthillData.embedUrl);
      
      if (result) {
        console.log('\n=== SUCCESS ===');
        console.log('M3U8 content or URL obtained!');
      } else {
        console.log('\n=== FAILED ===');
        console.log('Could not get m3u8 stream');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
