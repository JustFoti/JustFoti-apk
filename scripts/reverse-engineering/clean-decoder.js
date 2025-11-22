
// Reconstructed Superembed Decoder
function base64Decode(input) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';
  let output = '';
  
  for (let i = 0, char1, char2, enc1, enc2, enc3, enc4; char2 = input.charAt(i++);) {
    char2 = alphabet.indexOf(char2);
    if (~char2) {
      enc1 = i % 4 ? enc1 * 64 + char2 : char2;
      if (i++ % 4) {
        char1 = 255 & enc1 >> (-2 * i & 6);
        output += String.fromCharCode(char1);
      }
    }
  }
  return output;
}

function urldecode(str) {
  const decoded = base64Decode(str);
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    result += '%' + ('00' + decoded.charCodeAt(i).toString(16)).slice(-2);
  }
  return decodeURIComponent(result);
}

// Test with the play parameter from the HTML
const testParam = 'S0dhU1FEaUcxTUlhNTdMUFRGb0tTaXFUVStmQnNRdkFNcXFtOWtBaWljR09nQ1JNd210bmdFeTN5RGk1RFdRN2Q3SVcvT09YSVo1V0pHbzZjNlhLN2F4MDNZaWhzN2hDUDhRV1dtMFRoUnl4d0YyNFJWQVRlOTAvLzBEay9ZODZwOFdFQnJYUTYvUWRGVjJNQ0ZqbndURzY5QT09';

console.log('Testing decoder with play parameter...');
try {
  const decoded = urldecode(testParam);
  console.log('Decoded:', decoded);
} catch (e) {
  console.error('Decode failed:', e.message);
}
