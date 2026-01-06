/**
 * Analyze the manifest URL structure
 */

const fs = require('fs');
const script = fs.readFileSync('scripts/casthill-script-2.js', 'utf8');

// Extract the manifest URL
const dMatch = script.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
const charCodes = JSON.parse('[' + dMatch[1] + ']');
const dString = String.fromCharCode(...charCodes);
const dDecoded = Buffer.from(dString, 'base64').toString('utf8');
const manifestUrl = Buffer.from(dDecoded, 'base64').toString('utf8');

console.log('Manifest URL:', manifestUrl);

// Parse the URL
const url = new URL(manifestUrl);
console.log('\nURL parts:');
console.log('  Protocol:', url.protocol);
console.log('  Host:', url.hostname);
console.log('  Path:', url.pathname);

// The path structure is:
// /pavel/{stream_id}/{timestamp}/{hash}/manifest.ts
const pathParts = url.pathname.split('/').filter(p => p);
console.log('\nPath parts:');
pathParts.forEach((part, i) => console.log(`  ${i}: ${part}`));

// Extract timestamp from path
const timestamp = pathParts[2];
console.log('\nTimestamp in URL:', timestamp);
console.log('Date:', new Date(parseInt(timestamp) * 1000).toISOString());

// The hash appears to be a signature
const hash = pathParts[3];
console.log('\nHash:', hash);
console.log('Hash length:', hash.length);

// Compare with the timestamp in the script
const aMatch = script.match(/a=parseInt\("(\d+)"/);
const scriptTimestamp = aMatch?.[1];
console.log('\nScript timestamp (a):', scriptTimestamp);
console.log('URL timestamp:', timestamp);
console.log('Difference:', parseInt(timestamp) - parseInt(scriptTimestamp), 'seconds');

// The hash is likely: sha256(stream_id + timestamp + secret)
// Or it could be a signed token

// Let's also check the host_id
const mMatch = script.match(/m="([a-z0-9-]+)"/);
const hostId = mMatch?.[1];
console.log('\nHost ID (m):', hostId);
console.log('URL host:', url.hostname);
console.log('Host matches:', url.hostname.includes(hostId));

// The URL structure suggests:
// - The hash is pre-computed server-side
// - It's valid for a limited time (timestamp)
// - The u_id parameter is added client-side for tracking

console.log('\n=== Analysis ===');
console.log('The manifest URL contains a pre-signed hash that expires.');
console.log('The hash is generated when the embed page is created.');
console.log('We need to fetch the embed fresh and use the URL immediately.');
console.log('The 401 error suggests the hash has expired or is invalid.');
