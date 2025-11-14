const fs = require('fs');
const encoded = fs.readFileSync('encoded-full.txt', 'utf8');

function caesarShift(text, shift) {
  return text.split('').map(c => {
    const code = c.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + shift + 26) % 26) + 65);
    if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + shift + 26) % 26) + 97);
    return c;
  }).join('');
}

console.log('Testing Caesar shifts -5 to +5...\n');

for (let shift = -5; shift <= 5; shift++) {
  if (shift === 0) continue;
  const result = caesarShift(encoded, shift);
  const hasHttp = result.includes('http://') || result.includes('https://');
  console.log(`Caesar ${shift}: ${hasHttp ? '✓ HAS HTTP!' : '✗'} - First 80: ${result.substring(0, 80)}`);
  
  if (hasHttp) {
    console.log('\n*** FOUND IT! ***');
    console.log('Full result:', result);
    break;
  }
}
