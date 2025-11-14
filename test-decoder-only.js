// Test JUST the decoder on the encoded data from working extractor

const encoded = '946844e7f35848:7d7g325252525f538g5c7d7:7873564b778:765267778377698g7d77824358588:4745416g5f528471656';

console.log('Encoded preview:', encoded.substring(0, 100));
console.log('Encoded length:', encoded.length);
console.log('Contains g:', encoded.includes('g'));
console.log('Contains ::', encoded.includes(':'));

// Method 1: Replace g with 8, : with /
console.log('\n[Method 1] Replace g→8, :→/');
const method1 = encoded.replace(/g/g, '8').replace(/:/g, '/');
console.log('Result:', method1.substring(0, 100));
console.log('Contains http:', method1.includes('http'));

// Method 2: Hex decode after replacement
console.log('\n[Method 2] Hex decode after g→8, :→/');
try {
  const hexStr = method1.replace(/[^0-9a-fA-F]/g, '');
  console.log('Hex string length:', hexStr.length);
  const decoded = Buffer.from(hexStr, 'hex').toString('utf8');
  console.log('Decoded:', decoded.substring(0, 200));
  console.log('Contains http:', decoded.includes('http'));
} catch (err) {
  console.log('Error:', err.message);
}

// Method 3: Direct hex decode (no replacement)
console.log('\n[Method 3] Direct hex decode');
try {
  const hexStr = encoded.replace(/[^0-9a-fA-F]/g, '');
  console.log('Hex string length:', hexStr.length);
  const decoded = Buffer.from(hexStr, 'hex').toString('utf8');
  console.log('Decoded:', decoded.substring(0, 200));
  console.log('Contains http:', decoded.includes('http'));
} catch (err) {
  console.log('Error:', err.message);
}
