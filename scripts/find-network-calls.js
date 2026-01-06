/**
 * Find all network calls in the obfuscated script
 */

const fs = require('fs');
const script = fs.readFileSync('scripts/casthill-script-1.js', 'utf8');

console.log('Script length:', script.length);
console.log('');

// The script is obfuscated with string array lookup
// Let's find all the string lookups and decode them

// First, find the string array
const arrayMatch = script.match(/const [a-z_$]+=\['([^']+)'(?:,'[^']*')*\]/i);
if (arrayMatch) {
  console.log('Found string array pattern');
}

// Look for fetch patterns
const fetchPattern = /fetch\s*\(/g;
let match;
let count = 0;
while ((match = fetchPattern.exec(script)) !== null) {
  count++;
  const context = script.substring(match.index - 50, match.index + 200);
  console.log(`\nFetch #${count} at position ${match.index}:`);
  console.log(context.replace(/\n/g, ' ').substring(0, 200));
}

console.log('\n\nTotal fetch calls:', count);

// Look for XMLHttpRequest
const xhrPattern = /XMLHttpRequest/g;
count = 0;
while ((match = xhrPattern.exec(script)) !== null) {
  count++;
}
console.log('XMLHttpRequest references:', count);

// Look for any URLs that might be API endpoints
const urlPattern = /["'`](https?:\/\/[^"'`\s]+)["'`]/g;
const urls = new Set();
while ((match = urlPattern.exec(script)) !== null) {
  urls.add(match[1]);
}

console.log('\n\nURLs found:');
[...urls].forEach(u => console.log(' ', u));

// Look for base64 encoded strings that might be URLs
const base64Pattern = /["']([A-Za-z0-9+/]{20,}={0,2})["']/g;
console.log('\n\nBase64 strings (decoded):');
while ((match = base64Pattern.exec(script)) !== null) {
  try {
    const decoded = Buffer.from(match[1], 'base64').toString('utf8');
    if (decoded.includes('http') || decoded.includes('.net') || decoded.includes('.com')) {
      console.log(' ', decoded.substring(0, 100));
    }
  } catch (e) {}
}

// Look for the P2P/WebRTC related code
const p2pPattern = /kingsig|swarmcloud|p2p|webrtc/gi;
const p2pMatches = script.match(p2pPattern);
if (p2pMatches) {
  console.log('\n\nP2P/WebRTC references:', [...new Set(p2pMatches)]);
}

// Look for any authentication-related patterns
const authPattern = /auth|token|key|secret|credential/gi;
const authMatches = script.match(authPattern);
if (authMatches) {
  console.log('\n\nAuth-related references:', [...new Set(authMatches)].slice(0, 20));
}
