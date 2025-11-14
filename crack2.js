// What shift would turn 'D' into 'h'?
// D = 68, h = 104
// Lowercase: d = 100, h = 104 (shift +4)
// But D is uppercase...

// Let's check what 'http' would be with different shifts
function caesar(text, shift) {
  return text.split('').map(c => {
    const code = c.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      return String.fromCharCode(((code - 65 + shift + 26) % 26) + 65);
    }
    if (code >= 97 && code <= 122) {
      return String.fromCharCode(((code - 97 + shift + 26) % 26) + 97);
    }
    return c;
  }).join('');
}

console.log('Testing what "http" becomes with different shifts:');
for (let i = -25; i <= 25; i++) {
  if (i === 0) continue;
  const shifted = caesar('http', i);
  console.log(`Shift ${i}: http -> ${shifted}`);
  if (shifted === 'Dqw6' || shifted.toLowerCase() === 'dqw6') {
    console.log(`  ^^^ MATCH! Shift ${i} turns http into ${shifted}`);
  }
}
