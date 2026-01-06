/**
 * Analyze the JavaScript flow in the casthill embed
 * to understand how the stream URL is fetched
 */

const fs = require('fs');
const html = fs.readFileSync('casthill-embed-full.html', 'utf8');

console.log('=== Analyzing JavaScript Flow ===\n');

// Find the main inline script
const scriptPattern = /<script>([^<]+window\['ZpQw9XkLmN8c3vR3'\][^<]+)<\/script>/s;
const scriptMatch = html.match(scriptPattern);

if (!scriptMatch) {
  console.log('Could not find main script');
  process.exit(1);
}

const script = scriptMatch[1];
console.log('Script length:', script.length, 'chars');

// Look for the X-CSRF-Auth header usage
const csrfIdx = script.indexOf('X-CSRF-Auth');
if (csrfIdx > 0) {
  console.log('\nX-CSRF-Auth context:');
  console.log(script.substring(csrfIdx - 200, csrfIdx + 200));
}

// Look for fetch calls
const fetchPattern = /fetch\s*\([^)]+\)/g;
const fetches = script.match(fetchPattern);
if (fetches) {
  console.log('\nFetch calls found:', fetches.length);
  fetches.forEach((f, i) => console.log(`  ${i + 1}:`, f.substring(0, 100)));
}

// Look for the async function that makes the API call
const asyncPattern = /async\s+function\s+(\w+)\s*\([^)]*\)\s*\{/g;
let match;
console.log('\nAsync functions:');
while ((match = asyncPattern.exec(script)) !== null) {
  console.log(' ', match[1]);
  // Get the function body
  const startIdx = match.index;
  let braceCount = 0;
  let endIdx = startIdx;
  for (let i = startIdx; i < script.length; i++) {
    if (script[i] === '{') braceCount++;
    if (script[i] === '}') braceCount--;
    if (braceCount === 0 && i > startIdx + 10) {
      endIdx = i + 1;
      break;
    }
  }
  const funcBody = script.substring(startIdx, endIdx);
  if (funcBody.includes('fetch') || funcBody.includes('scode')) {
    console.log('   Contains fetch/scode, length:', funcBody.length);
    // Save for analysis
    fs.writeFileSync(`scripts/func-${match[1]}.js`, funcBody);
    console.log(`   Saved to scripts/func-${match[1]}.js`);
  }
}

// Look for the sourceUrl construction
const sourceUrlIdx = script.indexOf('sourceUrl');
if (sourceUrlIdx > 0) {
  console.log('\nsourceUrl context:');
  console.log(script.substring(sourceUrlIdx - 100, sourceUrlIdx + 300));
}

// Look for the Clappr player initialization
const clapprIdx = script.indexOf('Clappr.Player');
if (clapprIdx > 0) {
  console.log('\nClappr.Player context:');
  console.log(script.substring(clapprIdx - 50, clapprIdx + 500));
}

// Look for the token refresh logic
const refreshIdx = script.indexOf('refresh');
if (refreshIdx > 0) {
  console.log('\nRefresh context:');
  console.log(script.substring(refreshIdx - 100, refreshIdx + 300));
}

// Look for the API endpoint
const apiPattern = /["'`]([^"'`]*\/[a-z]+\/[a-z]+[^"'`]*)["'`]/gi;
console.log('\nAPI-like paths:');
const apis = new Set();
while ((match = apiPattern.exec(script)) !== null) {
  if (match[1].length < 50 && !match[1].includes('jsdelivr') && !match[1].includes('google')) {
    apis.add(match[1]);
  }
}
[...apis].forEach(a => console.log(' ', a));

// Look for the hash/token generation
const hashIdx = script.indexOf('hash');
if (hashIdx > 0) {
  console.log('\nHash context:');
  console.log(script.substring(hashIdx - 50, hashIdx + 200));
}

// Look for the obfuscated string array
const obfArrayPattern = /window\['ZpQw9XkLmN8c3vR3'\]\s*=\s*'([^']+)'/;
const obfMatch = script.match(obfArrayPattern);
if (obfMatch) {
  console.log('\nObfuscated string (first 200 chars):');
  console.log(obfMatch[1].substring(0, 200));
}

// Look for the deobfuscation function
const deobfPattern = /_0x[a-f0-9]+\s*=\s*function/g;
const deobfs = script.match(deobfPattern);
if (deobfs) {
  console.log('\nDeobfuscation functions:', deobfs.length);
}

// Find where the stream URL is actually used
const streamUrlPattern = /[a-z_$]+\s*=\s*[`"'][^`"']*\$\{[^}]*scode[^}]*\}[^`"']*[`"']/gi;
console.log('\nStream URL template:');
while ((match = streamUrlPattern.exec(script)) !== null) {
  console.log(' ', match[0].substring(0, 200));
}

// Look for the actual URL construction with template literal
const templateIdx = script.indexOf('`${');
if (templateIdx > 0) {
  // Find all template literals
  const templatePattern = /`[^`]*\$\{[^}]+\}[^`]*`/g;
  console.log('\nTemplate literals with variables:');
  let count = 0;
  while ((match = templatePattern.exec(script)) !== null && count < 20) {
    if (match[0].includes('http') || match[0].includes('scode') || match[0].includes('stream')) {
      console.log(' ', match[0].substring(0, 150));
      count++;
    }
  }
}
