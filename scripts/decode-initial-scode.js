const fs = require('fs');
const html = fs.readFileSync('casthill-embed-full.html', 'utf8');

console.log('=== Decoding initial scode ===\n');

// Find the i variable definition: i=e([98,52,101,...])
const iPattern = /i=e\(\[([0-9,]+)\]\)/;
const match = html.match(iPattern);

if (match) {
  const arr = JSON.parse('[' + match[1] + ']');
  const decoded = String.fromCharCode(...arr);
  console.log('Initial scode (i):', decoded);
}

// Find the a variable (timestamp)
const aPattern = /a=parseInt\("(\d+)"/;
const aMatch = html.match(aPattern);
if (aMatch) {
  console.log('Timestamp (a):', aMatch[1]);
  console.log('Date:', new Date(parseInt(aMatch[1]) * 1000).toISOString());
}

// Find the r variable (device_id)
const rPattern = /r="([a-z0-9]+)"/;
const rMatch = html.match(rPattern);
if (rMatch) {
  console.log('Device ID (r):', rMatch[1]);
}

// Find the s variable (stream ID) - it's the longer alphanumeric one
const sPattern = /,s="([a-z0-9]{15,})"/;
const sMatch = html.match(sPattern);
if (sMatch) {
  console.log('Stream ID (s):', sMatch[1]);
}

// Find the c variable (base URL)
const cPattern = /c=t\("([A-Za-z0-9+/=]+)"\)/;
const cMatch = html.match(cPattern);
if (cMatch) {
  const decoded = Buffer.from(cMatch[1], 'base64').toString('utf8');
  console.log('Base URL (c):', decoded);
}

// Find the m variable (host_id)
const mPattern = /m="([a-z0-9-]+)"/;
const mMatch = html.match(mPattern);
if (mMatch) {
  console.log('Host ID (m):', mMatch[1]);
}

// Now construct the full stream URL
console.log('\n=== Constructing stream URL ===\n');

if (match && aMatch && rMatch && sMatch && cMatch && mMatch) {
  const scode = String.fromCharCode(...JSON.parse('[' + match[1] + ']'));
  const ts = aMatch[1];
  const device_id = rMatch[1];
  const stream = sMatch[1];
  const baseUrl = Buffer.from(cMatch[1], 'base64').toString('utf8');
  const host_id = mMatch[1];
  
  const streamUrl = `${baseUrl}?scode=${encodeURIComponent(scode)}&stream=${encodeURIComponent(stream)}&expires=${encodeURIComponent(ts)}&u_id=${encodeURIComponent(device_id)}&host_id=${encodeURIComponent(host_id)}`;
  
  console.log('Stream URL:', streamUrl);
}
