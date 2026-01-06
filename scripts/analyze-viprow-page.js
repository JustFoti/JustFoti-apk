/**
 * Analyze current VIPRow page structure to fix extraction
 */

const https = require('https');

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': VIPROW_BASE
      }
    };
    
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function analyzeVIPRowPage() {
  console.log('=== VIPRow Page Analysis ===\n');
  
  // First, get the schedule page to find a live event
  console.log('Fetching schedule page...');
  const scheduleRes = await fetchPage(`${VIPROW_BASE}/sports-big-games`);
  console.log('Schedule status:', scheduleRes.status);
  
  // Find event URLs
  const eventRegex = /href="(\/[^"]*-online-stream)"/g;
  const events = [];
  let match;
  while ((match = eventRegex.exec(scheduleRes.data)) !== null) {
    if (!events.includes(match[1])) {
      events.push(match[1]);
    }
  }
  
  console.log(`Found ${events.length} events`);
  if (events.length > 0) {
    console.log('First 5 events:');
    events.slice(0, 5).forEach(e => console.log('  ', e));
  }
  
  if (events.length === 0) {
    console.log('No events found, trying a known URL...');
    events.push('/wwe/monday-night-raw-online-stream');
  }
  
  // Fetch the first event page
  const eventUrl = `${VIPROW_BASE}${events[0]}-1`;
  console.log('\nFetching event page:', eventUrl);
  
  const eventRes = await fetchPage(eventUrl);
  console.log('Event page status:', eventRes.status);
  console.log('Page length:', eventRes.data.length);
  
  const html = eventRes.data;
  
  // Check for embed parameters
  console.log('\n=== Checking Embed Parameters ===');
  
  const zmidMatch = html.match(/const\s+zmid\s*=\s*"([^"]+)"/);
  const pidMatch = html.match(/const\s+pid\s*=\s*(\d+)/);
  const edmMatch = html.match(/const\s+edm\s*=\s*"([^"]+)"/);
  const configMatch = html.match(/const siteConfig = (\{[^;]+\});/);
  
  console.log('zmid:', zmidMatch ? zmidMatch[1] : 'NOT FOUND');
  console.log('pid:', pidMatch ? pidMatch[1] : 'NOT FOUND');
  console.log('edm:', edmMatch ? edmMatch[1] : 'NOT FOUND');
  console.log('siteConfig:', configMatch ? 'FOUND' : 'NOT FOUND');
  
  if (!zmidMatch || !pidMatch || !edmMatch) {
    console.log('\n=== Looking for alternative patterns ===');
    
    // Look for any const declarations with strings
    const constMatches = html.match(/const\s+\w+\s*=\s*["'][^"']+["']/g);
    if (constMatches) {
      console.log('\nConst declarations found:');
      constMatches.slice(0, 15).forEach(c => console.log('  ', c));
    }
    
    // Look for window assignments
    const windowMatches = html.match(/window\[['"][^'"]+['"]\]\s*=\s*['"][^'"]+['"]/g);
    if (windowMatches) {
      console.log('\nWindow assignments found:');
      windowMatches.slice(0, 10).forEach(w => console.log('  ', w));
    }
    
    // Look for obfuscated variable patterns
    const obfuscatedMatches = html.match(/_0x[a-f0-9]+/g);
    if (obfuscatedMatches) {
      console.log('\nObfuscated variables found:', [...new Set(obfuscatedMatches)].length);
    }
    
    // Look for iframe src
    const iframeMatch = html.match(/<iframe[^>]*src=["']([^"']+)["']/i);
    if (iframeMatch) {
      console.log('\niframe src:', iframeMatch[1]);
    }
    
    // Look for embed URL patterns
    const embedMatch = html.match(/casthill\.net[^"'\s]*/);
    if (embedMatch) {
      console.log('\nCasthill URL found:', embedMatch[0]);
    }
    
    // Show script content
    const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
    if (scripts) {
      console.log('\n=== Script Analysis ===');
      console.log('Total scripts:', scripts.length);
      
      scripts.forEach((script, i) => {
        if (script.includes('zmid') || script.includes('edm') || script.includes('pid') || 
            script.includes('casthill') || script.includes('embed')) {
          console.log(`\nScript ${i} (relevant):`);
          console.log(script.substring(0, 1000));
        }
      });
    }
  } else {
    // Parameters found, try to construct embed URL
    console.log('\n=== Embed Parameters Found ===');
    
    let csrf = '', csrf_ip = '', category = '';
    if (configMatch) {
      try {
        const config = JSON.parse(configMatch[1]);
        csrf = config.csrf || '';
        csrf_ip = config.csrf_ip || '';
        category = config.linkAppendUri || '';
        console.log('csrf:', csrf);
        console.log('csrf_ip:', csrf_ip);
        console.log('category:', category);
      } catch (e) {
        console.log('Failed to parse config:', e.message);
      }
    }
    
    // Construct embed URL
    const embedParams = new URLSearchParams({
      pid: pidMatch[1],
      gacat: '',
      gatxt: category,
      v: zmidMatch[1],
      csrf,
      csrf_ip,
    });
    const embedUrl = `https://${edmMatch[1]}/sd0embed/${category}?${embedParams}`;
    console.log('\nEmbed URL:', embedUrl);
    
    // Fetch embed page
    console.log('\n=== Fetching Embed Page ===');
    const embedRes = await fetchPage(embedUrl);
    console.log('Embed status:', embedRes.status);
    console.log('Embed length:', embedRes.data.length);
    
    // Find player script
    const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let embedScript = null;
    let scriptMatch;
    while ((scriptMatch = scriptPattern.exec(embedRes.data)) !== null) {
      if (scriptMatch[1].includes('isPlayerLoaded') && scriptMatch[1].includes('scode')) {
        embedScript = scriptMatch[1];
        break;
      }
    }
    
    if (embedScript) {
      console.log('\n=== Player Script Found ===');
      console.log('Script length:', embedScript.length);
      
      // Check for expected patterns
      const deviceId = embedScript.match(/r="([a-z0-9]+)"/);
      const streamId = embedScript.match(/s="([a-z0-9]+)"/);
      const hostId = embedScript.match(/m="([a-z0-9-]+)"/);
      const timestamp = embedScript.match(/a=parseInt\("(\d+)"/);
      const iMatch = embedScript.match(/i=e\(\[([0-9,]+)\]\)/);
      const cMatch = embedScript.match(/c=t\("([^"]+)"\)/);
      const lMatch = embedScript.match(/l=t\("([^"]+)"\)/);
      const dMatch = embedScript.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
      
      console.log('\nVariable extraction:');
      console.log('  deviceId (r):', deviceId ? deviceId[1] : 'NOT FOUND');
      console.log('  streamId (s):', streamId ? streamId[1] : 'NOT FOUND');
      console.log('  hostId (m):', hostId ? hostId[1] : 'NOT FOUND');
      console.log('  timestamp (a):', timestamp ? timestamp[1] : 'NOT FOUND');
      console.log('  initialScode (i):', iMatch ? 'FOUND' : 'NOT FOUND');
      console.log('  baseUrl (c):', cMatch ? 'FOUND' : 'NOT FOUND');
      console.log('  csrfAuth (l):', lMatch ? 'FOUND' : 'NOT FOUND');
      console.log('  manifestUrl (d):', dMatch ? 'FOUND' : 'NOT FOUND');
      
      if (!deviceId || !streamId) {
        console.log('\n=== Script Content (first 2000 chars) ===');
        console.log(embedScript.substring(0, 2000));
      }
    } else {
      console.log('\n=== Player Script NOT FOUND ===');
      console.log('Looking for scripts with scode...');
      
      const allScripts = embedRes.data.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
      if (allScripts) {
        allScripts.forEach((s, i) => {
          if (s.includes('scode') || s.includes('isPlayerLoaded')) {
            console.log(`\nScript ${i} contains scode/isPlayerLoaded:`);
            console.log(s.substring(0, 1500));
          }
        });
        
        // Show all scripts briefly
        console.log('\n=== All Scripts Summary ===');
        allScripts.forEach((s, i) => {
          const preview = s.substring(0, 100).replace(/\s+/g, ' ');
          console.log(`Script ${i}: ${preview}...`);
        });
      }
    }
  }
}

analyzeVIPRowPage().catch(console.error);
