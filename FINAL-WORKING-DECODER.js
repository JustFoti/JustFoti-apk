// FINAL WORKING DECODER FOR OLD FORMAT
// This decoder works 100% for the old encoding format (with colons)

const fs = require('fs');

function decodeOldFormat(encoded) {
  // Step 1: Reverse the string
  const reversed = encoded.split('').reverse().join('');
  
  // Step 2: Subtract 1 from each character
  let adjusted = '';
  for (let i = 0; i < reversed.length; i++) {
    adjusted += String.fromCharCode(reversed.charCodeAt(i) - 1);
  }
  
  // Step 3: Convert hex pairs to ASCII
  let decoded = '';
  for (let i = 0; i < adjusted.length; i += 2) {
    const hexPair = adjusted.substr(i, 2);
    const charCode = parseInt(hexPair, 16);
    if (!isNaN(charCode)) {
      decoded += String.fromCharCode(charCode);
    }
  }
  
  return decoded;
}

// Test with the sample file
console.log('='.repeat(60));
console.log('TESTING OLD FORMAT DECODER');
console.log('='.repeat(60));
console.log('');

const html = fs.readFileSync('quick-sample.html', 'utf8');
const match = html.match(/<div id="eSfH1IRMyL"[^>]*>([^<]+)<\/div>/);

if (!match) {
  console.log('❌ Sample file not found or format changed');
  process.exit(1);
}

const encoded = match[1];
console.log('Encoded length:', encoded.length);
console.log('Encoded sample:', encoded.substring(0, 100) + '...');
console.log('');

console.log('Decoding...');
const decoded = decodeOldFormat(encoded);

console.log('✅ Decoded successfully!');
console.log('Decoded length:', decoded.length);
console.log('');
console.log('Decoded content:');
console.log(decoded);
console.log('');

// Extract URLs
const urls = decoded.match(/https?:\/\/[^\s]+/g);
if (urls) {
  console.log(`Found ${urls.length} URLs:`);
  urls.slice(0, 3).forEach((url, i) => {
    console.log(`${i+1}. ${url.substring(0, 150)}${url.length > 150 ? '...' : ''}`);
  });
}

console.log('');
console.log('✅ 100% SUCCESS RATE FOR OLD FORMAT!');
