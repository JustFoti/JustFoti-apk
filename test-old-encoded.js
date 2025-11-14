const fs = require('fs');

// This is the encoded data from the WORKING-CLOUDSTREAM-EXTRACTOR run
const encoded = fs.readFileSync('encoded-full.txt', 'utf8');

console.log('Testing OLD encoded data (uppercase letters format)...\n');
console.log('Length:', encoded.length);
console.log('First 100:', encoded.substring(0, 100));

function caesarShift(text, shift) {
  return text.split('').map(c => {
    const code = c.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + shift + 26) % 26) + 65);
    if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + shift + 26) % 26) + 97);
    return c;
  }).join('');
}

// The docs say the decoded URL looks like "kwwsv://" which is "https://" shifted by +3
// So we need to shift BACK by -3
console.log('\n[Test] Caesar -3:');
const result = caesarShift(encoded, -3);
console.log('First 100:', result.substring(0, 100));
console.log('Contains "http":', result.includes('http'));

// Maybe it needs URL decoding after Caesar?
if (result.includes('%')) {
  console.log('\n[Test] Caesar -3 + URL decode:');
  try {
    const urlDecoded = decodeURIComponent(result);
    console.log('First 100:', urlDecoded.substring(0, 100));
    console.log('Contains "http":', urlDecoded.includes('http'));
  } catch (err) {
    console.log('URL decode error:', err.message);
  }
}
