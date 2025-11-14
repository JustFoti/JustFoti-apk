// Sample encoded data from the test
const encoded = "Dqw6nfuzf7Wyc1KQ0ZCnZcO1ZKR1YBIhETWWgrIEd5Rjh9IHp2LipyEgAYCXtnaxpgYXd0JW5pIRtnMRg2DGZKeUUpbUIXEnYLKQ0tF2kYfyRoZFkSXWhJDEc";

console.log('Encoded sample:', encoded);
console.log('Length:', encoded.length);
console.log('First char code:', encoded.charCodeAt(0));
console.log('Char D code:', 'D'.charCodeAt(0));

// Try Caesar -3
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

console.log('\nCaesar -3:', caesar(encoded, -3).substring(0, 50));
console.log('Caesar +3:', caesar(encoded, 3).substring(0, 50));
