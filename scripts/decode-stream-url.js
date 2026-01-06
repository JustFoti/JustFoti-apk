const fs = require('fs');
const html = fs.readFileSync('casthill-embed-full.html', 'utf8');

console.log('=== Decoding stream URL (u) ===\n');

// Find d = e([...]) - the char codes that become base64
const dPattern = /d=e\(\[([0-9,]+)\]\)/;
const dMatch = html.match(dPattern);

if (dMatch) {
  const arr = JSON.parse('[' + dMatch[1] + ']');
  const base64Str = String.fromCharCode(...arr);
  console.log('d (base64 string):', base64Str);
  
  // u = t(d) where t is atob (base64 decode)
  const u = Buffer.from(base64Str, 'base64').toString('utf8');
  console.log('u (decoded URL):', u);
}

// Also find the device_id (I) that gets added
const deviceIdPattern = /I=o\.device_id/;
const deviceMatch = html.match(deviceIdPattern);
if (deviceMatch) {
  console.log('\nDevice ID is set from o.device_id');
}

// Find where I is initially set
const iInitPattern = /I}=function\(\)/;
const iInitMatch = html.match(iInitPattern);
if (iInitMatch) {
  const idx = iInitMatch.index;
  console.log('\nI initialization context:');
  console.log(html.substring(idx - 100, idx + 200));
}
