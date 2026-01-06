const fs = require('fs');
const html = fs.readFileSync('casthill-embed-full.html', 'utf8');

console.log('=== Finding token API ===\n');

// Look for the API call that gets the scode/token
// The pattern seems to be: fetch to some endpoint, get back scode, ts, device_id

// Find async functions that might be the token fetcher
const asyncPattern = /async\s+function\s*\w*\s*\([^)]*\)\s*\{[^}]{0,1000}scode/gi;
let match;
console.log('Async functions with scode:');
while ((match = asyncPattern.exec(html)) !== null) {
  console.log(match[0].substring(0, 300));
  console.log('---');
}

// Look for the T function which seems to refresh tokens
const tFuncIdx = html.indexOf('async function T');
if (tFuncIdx > 0) {
  console.log('\nFunction T context:');
  console.log(html.substring(tFuncIdx, tFuncIdx + 500));
}

// Look for where the API is called
const apiCallPattern = /fetch\s*\([^)]+\)[^;]*json\s*\(\s*\)/g;
console.log('\nFetch with JSON:');
const apiCalls = html.match(apiCallPattern);
if (apiCalls) {
  apiCalls.slice(0, 5).forEach(c => console.log(' ', c.substring(0, 100)));
}

// Look for the endpoint URL construction
const urlBuildPattern = /["'`][^"'`]*\/[a-z]+\/[a-z]+[^"'`]*["'`]/gi;
console.log('\nURL patterns:');
const urls = new Set();
while ((match = urlBuildPattern.exec(html)) !== null) {
  if (match[0].length < 100 && !match[0].includes('jsdelivr') && !match[0].includes('google')) {
    urls.add(match[0]);
  }
}
[...urls].slice(0, 20).forEach(u => console.log(' ', u));

// Look for the casthill API domain
const casthillApiPattern = /sts\.casthill\.net[^"'\s<>]*/gi;
console.log('\nCasthill STS API:');
while ((match = casthillApiPattern.exec(html)) !== null) {
  console.log(' ', match[0]);
}

// Look for POST requests
const postPattern = /method\s*:\s*["']POST["']/gi;
console.log('\nPOST requests:');
while ((match = postPattern.exec(html)) !== null) {
  const idx = match.index;
  console.log(' ', html.substring(idx - 100, idx + 100));
}

// Look for the stream ID being sent to API
const streamIdPattern = /stream[^=]*=\s*["']?bafogofab07i7opa9e30/gi;
console.log('\nStream ID in requests:');
while ((match = streamIdPattern.exec(html)) !== null) {
  console.log(' ', match[0]);
}

// Look for the v parameter (zmid) being used
const zmidPattern = /st1hd[^"'\s<>]*/gi;
console.log('\nzmid usage:');
while ((match = zmidPattern.exec(html)) !== null) {
  console.log(' ', match[0]);
}

// Find where the stream URL is actually used
const sourceUrlPattern = /sourceUrl[^;]{0,200}/gi;
console.log('\nsourceUrl context:');
while ((match = sourceUrlPattern.exec(html)) !== null) {
  console.log(' ', match[0]);
}
