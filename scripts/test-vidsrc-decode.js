// Test VidSrc decode algorithms
const encoded = '=0je4I3M5hnbxRjRGZkRTt2Z6ZmdnZ0M9cWb3cjd6M1WQlTVzglZ8gHb1dWbs5EV3JVfpxkZzYmbWlzMPl3NydTacN1TLh0VsdDbwRXYvJHctVGdl1WYuFGajJXYwlHdpRXa0VGZvNmbl5WYyV2c1JXZoBXYyd2bsJXdjVmcpRXYtJ2byRXaul2bq1WZzNXYwRHdoJCI9ASPgkiIg0DI5JCLiACIgAiCNoQD';

function decodeBase64Format(encoded, shift = 3) {
  try {
    // Step 1: Strip leading "=" if present
    let data = encoded.startsWith('=') ? encoded.substring(1) : encoded;
    
    // Step 2: Reverse the string
    data = data.split('').reverse().join('');
    
    // Step 3: URL-safe base64 decode (replace - with + and _ with /)
    data = data.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    while (data.length % 4 !== 0) {
      data += '=';
    }
    
    // Decode base64
    const decoded = atob(data);
    
    // Step 4: Subtract shift value from each character
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) - shift);
    }
    
    return result;
  } catch (e) {
    console.log('Error with shift', shift, ':', e.message);
    return '';
  }
}

console.log('Testing VidSrc decode algorithms...\n');
console.log('Encoded (first 100 chars):', encoded.substring(0, 100));
console.log('Encoded length:', encoded.length);

// Try different shift values
const shifts = [0, 1, 2, 3, 4, 5, 6, 7];
for (const shift of shifts) {
  const decoded = decodeBase64Format(encoded, shift);
  if (decoded.includes('https://') || decoded.includes('http://')) {
    console.log(`\n✓ SUCCESS with shift ${shift}:`);
    console.log(decoded);
    break;
  } else if (decoded.length > 0) {
    console.log(`\nShift ${shift} result (first 100 chars):`, decoded.substring(0, 100));
  }
}

// Also try without reversing
console.log('\n--- Trying without reversing ---');
for (const shift of shifts) {
  try {
    let data = encoded.startsWith('=') ? encoded.substring(1) : encoded;
    data = data.replace(/-/g, '+').replace(/_/g, '/');
    while (data.length % 4 !== 0) data += '=';
    const decoded = atob(data);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) - shift);
    }
    if (result.includes('https://') || result.includes('http://')) {
      console.log(`\n✓ SUCCESS (no reverse) with shift ${shift}:`);
      console.log(result);
      break;
    }
  } catch (e) {
    // Skip
  }
}

// Try pako decompression (they include pako.min.js)
console.log('\n--- Checking if data might be compressed ---');
try {
  let data = encoded.startsWith('=') ? encoded.substring(1) : encoded;
  data = data.split('').reverse().join('');
  data = data.replace(/-/g, '+').replace(/_/g, '/');
  while (data.length % 4 !== 0) data += '=';
  const decoded = atob(data);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i);
  }
  console.log('First 20 bytes:', Array.from(bytes.slice(0, 20)));
  // Check for gzip magic number (0x1f 0x8b)
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    console.log('Data appears to be gzip compressed!');
  }
  // Check for zlib header (0x78)
  if (bytes[0] === 0x78) {
    console.log('Data appears to be zlib compressed!');
  }
} catch (e) {
  console.log('Error:', e.message);
}
