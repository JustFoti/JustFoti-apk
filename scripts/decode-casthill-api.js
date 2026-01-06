/**
 * Decode the Casthill API endpoint and understand the flow
 */

const fs = require('fs');
const script = fs.readFileSync('scripts/casthill-script-2.js', 'utf8');

console.log('=== Decoding Casthill API ===\n');

// Extract the base64 encoded values
// c = base URL
const cMatch = script.match(/c=t\("([A-Za-z0-9+/=]+)"\)/);
if (cMatch) {
  const baseUrl = Buffer.from(cMatch[1], 'base64').toString('utf8');
  console.log('Base URL (c):', baseUrl);
}

// l = X-CSRF-Auth header value (double base64 encoded)
const lMatch = script.match(/l=t\("([A-Za-z0-9+/=]+)"\)/);
if (lMatch) {
  const csrfAuth = Buffer.from(lMatch[1], 'base64').toString('utf8');
  console.log('X-CSRF-Auth (l):', csrfAuth);
}

// d = intermediate value for u (the API endpoint)
// d is decoded from a char array, then base64 decoded
const dMatch = script.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
if (dMatch) {
  const charCodes = JSON.parse('[' + dMatch[1] + ']');
  const dString = String.fromCharCode(...charCodes);
  console.log('d string:', dString);
  const dDecoded = Buffer.from(dString, 'base64').toString('utf8');
  console.log('d decoded:', dDecoded);
}

// u = API endpoint (base64 decoded from d)
const uMatch = script.match(/u=t\(d\)/);
if (uMatch) {
  // u is t(d) where d is already decoded above
  // Let's find d's value and decode it
  const dMatch2 = script.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
  if (dMatch2) {
    const charCodes = JSON.parse('[' + dMatch2[1] + ']');
    const dString = String.fromCharCode(...charCodes);
    const dDecoded = Buffer.from(dString, 'base64').toString('utf8');
    const uDecoded = Buffer.from(dDecoded, 'base64').toString('utf8');
    console.log('API endpoint (u):', uDecoded);
  }
}

// Extract the initial values
const rMatch = script.match(/r="([a-z0-9]+)"/);
const iMatch = script.match(/i=e\(\[([0-9,]+)\]\)/);
const aMatch = script.match(/a=parseInt\("(\d+)"/);
const sMatch = script.match(/s="([a-z0-9]+)"/);
const mMatch = script.match(/m="([a-z0-9-]+)"/);

console.log('\nInitial values:');
if (rMatch) console.log('device_id (r):', rMatch[1]);
if (iMatch) {
  const scode = String.fromCharCode(...JSON.parse('[' + iMatch[1] + ']'));
  console.log('scode (i):', scode);
}
if (aMatch) console.log('timestamp (a):', aMatch[1]);
if (sMatch) console.log('stream_id (s):', sMatch[1]);
if (mMatch) console.log('host_id (m):', mMatch[1]);

// Now let's understand the flow:
console.log('\n=== Flow Analysis ===');
console.log('1. Initial scode is embedded in the page');
console.log('2. The API endpoint (u) is called to refresh the token');
console.log('3. The API returns: { scode, ts, device_id }');
console.log('4. The stream URL is constructed as:');
console.log('   {baseUrl}?scode={scode}&stream={stream_id}&expires={ts}&u_id={device_id}&host_id={host_id}');
console.log('5. The X-CSRF-Auth header is required for the API call');

// Let's also look at the E headers object
console.log('\n=== Headers ===');
console.log('The fetch uses these headers:');
console.log('  Accept: application/json');
console.log('  X-CSRF-Auth: (decoded from l)');
console.log('  credentials: include');
