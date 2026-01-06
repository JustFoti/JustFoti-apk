/**
 * Analyze the k() function that fetches the manifest
 */

const fs = require('fs');

// Read the script
const script = fs.readFileSync('scripts/casthill-script-2.js', 'utf8');

// Find the k() function - it's the one that fetches the manifest
// Looking for: async function k()

// The relevant part of the code:
// async function k(){try{const t=new URL(u);t.searchParams.set("u_id",I);
// const n=await async function(e){const t=await A(e),...

// Let's extract and analyze the A() function which does the actual fetch
// A(e) fetches URL e and returns {finalURL, text}

console.log('=== Analyzing manifest fetch logic ===\n');

// Find the A function
const aFuncMatch = script.match(/async function A\(e\)\{([^}]+\}[^}]+\}[^}]+)\}/);
if (aFuncMatch) {
  console.log('A() function:');
  console.log(aFuncMatch[0].substring(0, 500));
}

// The A function does:
// 1. fetch(e, {redirect:"follow", mode:"cors", cache:"no-store"})
// 2. Returns {finalURL: response.url, text: response.text()}

// Then there's an inner function that:
// 1. Calls A(manifestUrl)
// 2. Extracts key URL from #EXT-X-KEY:.*URI="([^"]+)"
// 3. Fetches the key URL too
// 4. Returns the finalURL

console.log('\n\n=== Key observations ===');
console.log('1. The fetch uses: redirect:"follow", mode:"cors", cache:"no-store"');
console.log('2. NO credentials are passed to the manifest fetch');
console.log('3. The manifest URL already has the auth hash in the path');
console.log('4. After fetching manifest, it also fetches the key URL');

// Let's look at what headers are used
console.log('\n\n=== Headers analysis ===');

// The E object has headers for the boanki.net request
// But the manifest fetch (A function) doesn't use E headers

// Let's check if there's any header manipulation
const headerPattern = /headers\s*[=:]\s*\{([^}]+)\}/g;
let match;
console.log('Header definitions in script:');
while ((match = headerPattern.exec(script)) !== null) {
  console.log(' ', match[0].substring(0, 200));
}

// The key insight: the manifest fetch in A() has NO custom headers
// It's a simple fetch with just redirect/mode/cache options

console.log('\n\n=== The actual fetch in A() ===');
console.log('fetch(e, {redirect:"follow", mode:"cors", cache:"no-store", signal:t.signal})');
console.log('');
console.log('NO User-Agent, NO Referer, NO Origin headers are set!');
console.log('The browser adds these automatically, but Node.js does not.');
