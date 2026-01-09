// Fetch and analyze VidSrc decoder script
require('dotenv').config({ path: '.env.local' });

async function fetchDecoder() {
  console.log('Fetching VidSrc decoder script...\n');
  
  const decoderUrl = 'https://cloudnestra.com/pjs/pjs_main_drv_cast.261225.js';
  console.log('URL:', decoderUrl);
  
  const response = await fetch(decoderUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://cloudnestra.com/',
    }
  });
  
  if (!response.ok) {
    console.log('Fetch failed:', response.status);
    return;
  }
  
  const js = await response.text();
  console.log('Script length:', js.length, 'bytes\n');
  
  // Look for decode-related functions
  console.log('=== Looking for decode patterns ===\n');
  
  // Find atob usage
  const atobMatches = js.match(/atob\s*\([^)]+\)/g) || [];
  console.log('atob() calls:', atobMatches.length);
  atobMatches.slice(0, 3).forEach(m => console.log('  ', m.substring(0, 80)));
  
  // Find pako usage
  const pakoMatches = js.match(/pako\.[a-zA-Z]+\s*\([^)]+\)/g) || [];
  console.log('\npako calls:', pakoMatches.length);
  pakoMatches.slice(0, 5).forEach(m => console.log('  ', m.substring(0, 80)));
  
  // Find reverse() usage
  const reverseMatches = js.match(/\.reverse\s*\(\s*\)/g) || [];
  console.log('\n.reverse() calls:', reverseMatches.length);
  
  // Find charCodeAt usage
  const charCodeMatches = js.match(/charCodeAt\s*\([^)]+\)/g) || [];
  console.log('\ncharCodeAt() calls:', charCodeMatches.length);
  
  // Find fromCharCode usage
  const fromCharCodeMatches = js.match(/fromCharCode\s*\([^)]+\)/g) || [];
  console.log('fromCharCode() calls:', fromCharCodeMatches.length);
  
  // Look for the decode function
  console.log('\n=== Looking for decode function ===\n');
  
  // Find function that takes div ID
  const divIdPattern = js.match(/function\s+\w+\s*\([^)]*\)\s*\{[^}]*getElementById[^}]*\}/g) || [];
  console.log('Functions with getElementById:', divIdPattern.length);
  
  // Find the main decode logic
  const decodeLogic = js.match(/function\s+(\w+)\s*\([^)]*\)\s*\{[\s\S]{100,500}(atob|pako|reverse|charCodeAt)[\s\S]{100,500}\}/g) || [];
  console.log('\nPotential decode functions:', decodeLogic.length);
  
  // Extract a snippet around pako.inflate
  if (js.includes('pako.inflate')) {
    const idx = js.indexOf('pako.inflate');
    const start = Math.max(0, idx - 200);
    const end = Math.min(js.length, idx + 300);
    console.log('\n=== Context around pako.inflate ===');
    console.log(js.substring(start, end));
  }
  
  // Look for the specific decode pattern
  console.log('\n=== Looking for specific patterns ===');
  
  // Pattern: split('').reverse().join('')
  if (js.includes("split('')") && js.includes("reverse()") && js.includes("join('')")) {
    console.log('✓ Found split-reverse-join pattern');
  }
  
  // Pattern: substring(1) (strip first char)
  const substringMatches = js.match(/substring\s*\(\s*1\s*\)/g) || [];
  console.log('substring(1) calls:', substringMatches.length);
  
  // Save a portion of the script for analysis
  console.log('\n=== First 2000 chars of script ===');
  console.log(js.substring(0, 2000));
}

fetchDecoder().catch(console.error);
