const fs = require('fs');
const html = fs.readFileSync('casthill-embed-full.html', 'utf8');

console.log('=== Finding API call for stream tokens ===\n');

// The stream URL format is:
// https://boanki.net?scode=X&stream=bafogofab07i7opa9e30&expires=X&u_id=X&host_id=X

// Find where scode is obtained
const scodePattern = /scode[^;]{0,200}/gi;
let match;
console.log('scode references:');
while ((match = scodePattern.exec(html)) !== null) {
  if (!match[0].includes('encodeURIComponent')) {
    console.log(' ', match[0].substring(0, 150));
  }
}

// Find the API endpoint that returns tokens
const apiIdx = html.indexOf('X-CSRF-Auth');
if (apiIdx > 0) {
  console.log('\nAPI auth context:');
  console.log(html.substring(apiIdx - 100, apiIdx + 300));
}

// Look for the fetch that gets stream data
const fetchPattern = /fetch\s*\([^)]+\)[^;]*\.then/g;
console.log('\nFetch chains:');
const fetches = html.match(fetchPattern);
if (fetches) {
  fetches.slice(0, 5).forEach(f => console.log(' ', f.substring(0, 100)));
}

// Look for the endpoint URL
const endpointPattern = /["'](\/[a-z0-9/_-]+)["']/gi;
console.log('\nEndpoint paths:');
const endpoints = new Set();
while ((match = endpointPattern.exec(html)) !== null) {
  if (match[1].length > 3 && match[1].length < 50) {
    endpoints.add(match[1]);
  }
}
[...endpoints].slice(0, 20).forEach(e => console.log(' ', e));

// Look for the hash/token generation
const hashPattern = /hash[^;]{0,100}/gi;
console.log('\nHash references:');
while ((match = hashPattern.exec(html)) !== null) {
  console.log(' ', match[0].substring(0, 100));
}

// Find the actual API URL
const castApiPattern = /casthill\.net\/[a-z0-9/_-]+/gi;
console.log('\nCasthill API paths:');
while ((match = castApiPattern.exec(html)) !== null) {
  console.log(' ', match[0]);
}

// Look for the stream initialization
const initPattern = /init[^(]*\([^)]*\)[^{]*\{[^}]{0,500}/gi;
console.log('\nInit functions:');
while ((match = initPattern.exec(html)) !== null) {
  if (match[0].includes('stream') || match[0].includes('player') || match[0].includes('source')) {
    console.log(' ', match[0].substring(0, 200));
  }
}

// Decode the other base64 strings
const base64Pattern = /t\s*\(\s*["']([A-Za-z0-9+/=]{20,})["']\s*\)/g;
console.log('\nBase64 decoded values:');
while ((match = base64Pattern.exec(html)) !== null) {
  try {
    const decoded = Buffer.from(match[1], 'base64').toString('utf8');
    if (decoded.length < 200 && /^[\x20-\x7E]+$/.test(decoded)) {
      console.log(' ', decoded);
    }
  } catch (e) {}
}
