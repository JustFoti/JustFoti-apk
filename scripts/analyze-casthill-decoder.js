/**
 * Analyze the Casthill decoder to understand the obfuscation
 */
const https = require('https');

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function fetch(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: { 'User-Agent': USER_AGENT, ...headers }
    };
    
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function analyze() {
  const eventUrl = '/nba/houston-rockets-vs-phoenix-suns-online-stream';
  const streamPageUrl = `${VIPROW_BASE}${eventUrl}-1`;
  
  const streamRes = await fetch(streamPageUrl, { 'Referer': VIPROW_BASE });
  const streamHtml = streamRes.data;
  
  const zmid = streamHtml.match(/const\s+zmid\s*=\s*["']([^"']+)["']/)?.[1];
  const pid = streamHtml.match(/const\s+pid\s*=\s*(\d+)/)?.[1];
  const edm = streamHtml.match(/const\s+edm\s*=\s*["']([^"']+)["']/)?.[1];
  const csrf = streamHtml.match(/"csrf"\s*:\s*"([^"]+)"/)?.[1] || '';
  const csrf_ip = streamHtml.match(/"csrf_ip"\s*:\s*"([^"]+)"/)?.[1] || '';
  const category = streamHtml.match(/"linkAppendUri"\s*:\s*"([^"]+)"/)?.[1] || '';
  
  const embedParams = new URLSearchParams({ pid, gacat: '', gatxt: category, v: zmid, csrf, csrf_ip });
  const embedUrl = `https://${edm}/sd0embed/${category}?${embedParams}`;
  
  const embedRes = await fetch(embedUrl, { 'Referer': streamPageUrl });
  const embedHtml = embedRes.data;
  
  // Find the encoded data pattern
  const encodedMatch = embedHtml.match(/window\['([^']+)'\]\s*=\s*'([^']+)'/);
  if (encodedMatch) {
    const [, key, encoded] = encodedMatch;
    console.log('Encoded data key:', key);
    console.log('Encoded data length:', encoded.length);
    console.log('First 100 chars:', encoded.substring(0, 100));
    
    // The encoded data is NOT base64 - it's a custom encoding
    // Let's look at the character distribution
    const charCounts = {};
    for (const c of encoded) {
      charCounts[c] = (charCounts[c] || 0) + 1;
    }
    console.log('\nUnique characters:', Object.keys(charCounts).length);
    console.log('Character set:', Object.keys(charCounts).sort().join(''));
  }
  
  // Find the decoder function - look for the function that uses the encoded data
  const scripts = embedHtml.match(/<script>([\s\S]*?)<\/script>/g) || [];
  let bigScript = '';
  for (const s of scripts) {
    const content = s.replace(/<\/?script>/g, '');
    if (content.length > 100000) {
      bigScript = content;
      break;
    }
  }
  
  // Look for the decoder pattern
  console.log('\n=== Analyzing decoder ===');
  
  // Find where the encoded data is used
  const windowUsage = bigScript.match(/window\[['"][^'"]+['"]\]/g) || [];
  console.log('window[] usages:', windowUsage.length);
  windowUsage.slice(0, 5).forEach(u => console.log('  ', u));
  
  // Look for string manipulation functions
  const stringOps = bigScript.match(/\.charAt\(|\.charCodeAt\(|\.fromCharCode\(|\.substring\(|\.substr\(/g) || [];
  console.log('\nString operations:', stringOps.length);
  
  // Look for the actual decoder - usually involves XOR or character shifting
  // Pattern: something like decoded[i] = encoded.charCodeAt(i) ^ key
  const xorMatch = bigScript.match(/\^\s*\d+|\^\s*0x[0-9a-f]+/gi);
  console.log('XOR operations:', xorMatch?.length || 0);
  if (xorMatch) {
    console.log('XOR values:', [...new Set(xorMatch)].slice(0, 10));
  }
  
  // Look for eval or Function calls that would execute the decoded script
  const evalMatch = bigScript.match(/eval\s*\(|Function\s*\(/g);
  console.log('eval/Function calls:', evalMatch?.length || 0);
  
  // The key insight: the obfuscated script likely decodes to the original player script
  // We need to find the decoder and run it
  
  // Look for the main decoder function pattern
  // Usually: function decode(str) { ... return decoded; }
  const funcPattern = /function\s+(_0x[a-f0-9]+)\s*\(([^)]*)\)\s*\{/g;
  let funcMatch;
  let funcCount = 0;
  while ((funcMatch = funcPattern.exec(bigScript)) !== null && funcCount < 5) {
    console.log(`\nFunction: ${funcMatch[1]}(${funcMatch[2]})`);
    funcCount++;
  }
}

analyze().catch(console.error);
