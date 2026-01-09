// Fetch and analyze VidSrc decoder script
require('dotenv').config({ path: '.env.local' });

async function fetchDecoder() {
  console.log('Fetching VidSrc decoder script...\n');
  
  // The main decoder script
  const decoderUrl = 'https://cloudnestra.com/pjs/pjs_main_drv_cast.261225.js';
  console.log('Fetching:', decoderUrl);
  
  const res = await fetch(decoderUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://cloudnestra.com/'
    }
  });
  
  const js = await res.text();
  console.log('Size:', js.length, 'bytes\n');
  
  // Check if it's packed/obfuscated
  if (js.includes('eval(') || js.includes('_0x')) {
    console.log('⚠️ Script is packed/obfuscated\n');
  }
  
  // Look for decode functions
  console.log('=== Looking for decode patterns ===');
  
  // Look for the div ID pattern
  const divIdPattern = js.match(/getElementById\s*\(\s*["']([^"']+)["']\s*\)/g) || [];
  console.log('getElementById calls:', divIdPattern.slice(0, 10));
  
  // Look for innerHTML access
  const innerHtmlPattern = js.match(/\.innerHTML/g) || [];
  console.log('innerHTML accesses:', innerHtmlPattern.length);
  
  // Look for charCodeAt
  const charCodePattern = js.match(/charCodeAt/g) || [];
  console.log('charCodeAt calls:', charCodePattern.length);
  
  // Look for fromCharCode
  const fromCharCodePattern = js.match(/fromCharCode/g) || [];
  console.log('fromCharCode calls:', fromCharCodePattern.length);
  
  // Look for parseInt with base 16
  const parseIntPattern = js.match(/parseInt\s*\([^,]+,\s*16\s*\)/g) || [];
  console.log('parseInt(x, 16) calls:', parseIntPattern.length);
  
  // Look for split/join patterns
  const splitPattern = js.match(/\.split\s*\(\s*["'][^"']*["']\s*\)/g) || [];
  console.log('split() calls:', splitPattern.slice(0, 10));
  
  // Look for reverse
  const reversePattern = js.match(/\.reverse\s*\(\s*\)/g) || [];
  console.log('reverse() calls:', reversePattern.length);
  
  // Look for XOR operations
  const xorPattern = js.match(/\^\s*\d+/g) || [];
  console.log('XOR operations:', xorPattern.slice(0, 20));
  
  // Look for the actual decode function
  console.log('\n=== Looking for decode function ===');
  
  // Common patterns for decode functions
  const decodePatterns = [
    /function\s+\w*[Dd]ecode\w*\s*\([^)]*\)\s*\{[^}]+\}/g,
    /\w+\s*=\s*function\s*\([^)]*\)\s*\{[^}]*charCodeAt[^}]+\}/g,
    /\w+\s*=\s*function\s*\([^)]*\)\s*\{[^}]*parseInt[^}]+16[^}]+\}/g,
  ];
  
  for (const pattern of decodePatterns) {
    const matches = js.match(pattern) || [];
    if (matches.length > 0) {
      console.log('\nFound decode-like function:');
      matches.slice(0, 3).forEach(m => console.log(m.substring(0, 300)));
    }
  }
  
  // Look for the specific pattern that processes hex
  console.log('\n=== Looking for hex processing ===');
  
  // Find where hex is converted to string
  const hexProcessIndex = js.indexOf('parseInt');
  if (hexProcessIndex > -1) {
    const context = js.substring(Math.max(0, hexProcessIndex - 200), hexProcessIndex + 300);
    console.log('Context around parseInt:\n', context.substring(0, 500));
  }
  
  // Look for the file variable assignment (where decoded URL goes)
  console.log('\n=== Looking for file/source assignment ===');
  const filePatterns = js.match(/file\s*[:=]\s*[^,;]+/g) || [];
  console.log('file assignments:', filePatterns.slice(0, 10));
  
  const sourcePatterns = js.match(/sources?\s*[:=]\s*\[/g) || [];
  console.log('source assignments:', sourcePatterns.length);
  
  // Save the script for manual analysis
  require('fs').writeFileSync('vidsrc-decoder-script.js', js);
  console.log('\n✓ Saved to vidsrc-decoder-script.js for manual analysis');
  
  // Now let's try to find the actual decode logic
  console.log('\n=== Searching for decode algorithm ===');
  
  // Look for the pattern that reads from div and decodes
  const divReadPattern = js.match(/getElementById[^;]+innerHTML[^;]+/g) || [];
  console.log('Div read patterns:', divReadPattern.slice(0, 5));
  
  // Look for loops that process characters
  const loopPattern = js.match(/for\s*\([^)]+\)\s*\{[^}]*charCodeAt[^}]+\}/g) || [];
  console.log('Character processing loops:', loopPattern.length);
  if (loopPattern.length > 0) {
    console.log('First loop:', loopPattern[0].substring(0, 200));
  }
}

fetchDecoder().catch(console.error);
