/**
 * Decode Casthill obfuscated player script
 * The script uses window['key'] = 'encoded_data' pattern
 * with a custom decoder function
 */

const https = require('https');
const vm = require('vm');

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

async function analyzeObfuscation() {
  const eventUrl = '/nba/houston-rockets-vs-phoenix-suns-online-stream';
  const linkNum = '1';
  
  // Get embed page
  const streamRes = await fetch(`${VIPROW_BASE}${eventUrl}-${linkNum}`, { 'Referer': VIPROW_BASE });
  
  const zmid = streamRes.data.match(/const\s+zmid\s*=\s*["']([^"']+)["']/)?.[1];
  const pid = streamRes.data.match(/const\s+pid\s*=\s*(\d+)/)?.[1];
  const edm = streamRes.data.match(/const\s+edm\s*=\s*["']([^"']+)["']/)?.[1];
  const csrf = streamRes.data.match(/"csrf"\s*:\s*"([^"]+)"/)?.[1] || '';
  const csrf_ip = streamRes.data.match(/"csrf_ip"\s*:\s*"([^"]+)"/)?.[1] || '';
  const category = streamRes.data.match(/"linkAppendUri"\s*:\s*"([^"]+)"/)?.[1] || '';
  
  const embedParams = new URLSearchParams({ pid, gacat: '', gatxt: category, v: zmid, csrf, csrf_ip });
  const embedUrl = `https://${edm}/sd0embed/${category}?${embedParams}`;
  
  console.log('Fetching embed:', embedUrl.substring(0, 80) + '...');
  
  const embedRes = await fetch(embedUrl, { 
    'Referer': `${VIPROW_BASE}${eventUrl}-${linkNum}`,
    'Origin': 'https://www.viprow.nu'
  });
  
  // Find the big script
  const scripts = embedRes.data.match(/<script>([\s\S]*?)<\/script>/g) || [];
  let bigScript = '';
  for (const s of scripts) {
    if (s.length > 10000) {
      bigScript = s.replace(/<\/?script>/g, '');
      break;
    }
  }
  
  if (!bigScript) {
    console.log('No big script found');
    return;
  }
  
  console.log('Big script length:', bigScript.length);
  
  // Find the encoded data
  const encodedMatch = bigScript.match(/window\['([^']+)'\]\s*=\s*'([^']+)'/);
  if (!encodedMatch) {
    console.log('No encoded data found');
    return;
  }
  
  const [, key, encoded] = encodedMatch;
  console.log('Key:', key);
  console.log('Encoded length:', encoded.length);
  
  // Try to find and execute the decoder
  // The script likely has a function that decodes and evals the result
  
  // Look for the decoder pattern - usually involves charCodeAt and fromCharCode
  const decoderPatterns = [
    /function\s+(\w+)\s*\([^)]*\)\s*\{[^}]*charCodeAt[^}]*\}/g,
    /(\w+)\s*=\s*function\s*\([^)]*\)\s*\{[^}]*fromCharCode[^}]*\}/g,
  ];
  
  console.log('\nLooking for decoder functions...');
  
  // Extract all function definitions
  const funcMatches = bigScript.match(/function\s+\w+\s*\([^)]*\)\s*\{/g) || [];
  console.log('Found', funcMatches.length, 'function definitions');
  
  // Look for the main execution - usually at the end
  const lastLines = bigScript.slice(-2000);
  console.log('\nLast 500 chars of script:');
  console.log(lastLines.slice(-500));
  
  // Try to run the script in a sandbox to see what it produces
  console.log('\n=== Attempting sandbox execution ===');
  
  try {
    const sandbox = {
      window: {},
      document: {
        createElement: () => ({ style: {} }),
        getElementsByTagName: () => [{ appendChild: () => {} }],
        head: { appendChild: () => {} },
      },
      console: { log: (...args) => console.log('[Sandbox]', ...args) },
      setTimeout: (fn) => fn(),
      setInterval: () => {},
      navigator: { userAgent: USER_AGENT },
      location: { href: embedUrl, hostname: 'casthill.net' },
      eval: (code) => {
        console.log('\n=== EVAL CALLED ===');
        console.log('Code length:', code.length);
        console.log('First 1000 chars:');
        console.log(code.substring(0, 1000));
        
        // Check if this contains our player code
        if (code.includes('isPlayerLoaded') || code.includes('scode')) {
          console.log('\n✅ Found player code!');
          
          // Extract the variables we need
          const deviceId = code.match(/r\s*=\s*["']([a-z0-9]+)["']/)?.[1];
          const streamId = code.match(/s\s*=\s*["']([a-z0-9]+)["']/)?.[1];
          console.log('deviceId:', deviceId);
          console.log('streamId:', streamId);
        }
        
        return code;
      }
    };
    
    const context = vm.createContext(sandbox);
    
    // Run the script
    vm.runInContext(bigScript, context, { timeout: 5000 });
    
    console.log('\nwindow keys:', Object.keys(sandbox.window));
    
  } catch (e) {
    console.log('Sandbox error:', e.message);
  }
}

analyzeObfuscation().catch(console.error);
