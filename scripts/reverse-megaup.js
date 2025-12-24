#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption
 * 
 * The encryption uses the User-Agent as a key.
 * Let's analyze the relationship between:
 * - Input: encrypted data from /media/ endpoint
 * - Key: User-Agent string
 * - Output: JSON with stream URLs
 */

const videoId = 'jIrrLzj-WS2JcOLzF79O5xvpCQ';
const baseUrl = 'https://megaup22.online';

async function analyzeEncryption() {
  // Test with different User-Agents to understand the key derivation
  const testUAs = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];
  
  console.log('=== Analyzing MegaUp Encryption ===\n');
  
  for (const ua of testUAs) {
    console.log(`UA: ${ua.substring(0, 60)}...`);
    
    // Fetch encrypted data
    const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
      headers: {
        'User-Agent': ua,
        'Referer': `${baseUrl}/e/${videoId}`,
      },
    });
    
    const mediaData = await mediaResponse.json();
    if (mediaData.status !== 200) {
      console.log('  Failed to get media data');
      continue;
    }
    
    const encrypted = mediaData.result;
    console.log(`  Encrypted length: ${encrypted.length}`);
    console.log(`  Encrypted preview: ${encrypted.substring(0, 50)}...`);
    
    // Get decrypted from enc-dec.app for comparison
    const decResponse = await fetch('https://enc-dec.app/api/dec-mega', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: encrypted, agent: ua }),
    });
    
    const decResult = await decResponse.json();
    if (decResult.status === 200) {
      const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
      console.log(`  Decrypted length: ${decrypted.length}`);
      console.log(`  Decrypted preview: ${decrypted.substring(0, 100)}...`);
      
      // Analyze the relationship
      console.log(`  Ratio: ${(encrypted.length / decrypted.length).toFixed(2)}`);
    } else {
      console.log(`  Decryption failed: ${decResult.error}`);
    }
    console.log('');
  }
  
  // Now let's try to figure out the algorithm
  console.log('=== Trying to reverse the algorithm ===\n');
  
  const ua = testUAs[0];
  const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
  });
  const mediaData = await mediaResponse.json();
  const encrypted = mediaData.result;
  
  // Get the decrypted version
  const decResponse = await fetch('https://enc-dec.app/api/dec-mega', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: encrypted, agent: ua }),
  });
  const decResult = await decResponse.json();
  const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
  
  console.log('Encrypted:', encrypted);
  console.log('\nDecrypted:', decrypted);
  
  // Check if it's base64
  console.log('\n=== Base64 Analysis ===');
  const isBase64Chars = /^[A-Za-z0-9+/=_-]+$/.test(encrypted);
  console.log('Is base64 charset:', isBase64Chars);
  
  // Try URL-safe base64 decode
  try {
    const urlSafeB64 = encrypted.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(urlSafeB64, 'base64');
    console.log('Base64 decoded length:', decoded.length);
    console.log('Base64 decoded (hex):', decoded.toString('hex').substring(0, 100));
    console.log('Base64 decoded (utf8):', decoded.toString('utf8').substring(0, 100));
    
    // Try XOR with UA
    console.log('\n=== XOR Analysis ===');
    let xorResult = '';
    for (let i = 0; i < Math.min(decoded.length, 200); i++) {
      xorResult += String.fromCharCode(decoded[i] ^ ua.charCodeAt(i % ua.length));
    }
    console.log('XOR with UA:', xorResult.substring(0, 100));
    
    // Try XOR with parts of UA
    const uaParts = [
      ua.substring(0, 32),
      ua.match(/Chrome\/[\d.]+/)?.[0] || '',
      'Chrome/120.0.0.0',
    ];
    
    for (const part of uaParts) {
      if (!part) continue;
      let result = '';
      for (let i = 0; i < Math.min(decoded.length, 100); i++) {
        result += String.fromCharCode(decoded[i] ^ part.charCodeAt(i % part.length));
      }
      if (result.includes('{') || result.includes('http')) {
        console.log(`XOR with "${part}":`, result.substring(0, 100));
      }
    }
    
    // Try RC4
    console.log('\n=== RC4 Analysis ===');
    function rc4(key, data) {
      const S = [];
      for (let i = 0; i < 256; i++) S[i] = i;
      let j = 0;
      for (let i = 0; i < 256; i++) {
        j = (j + S[i] + key.charCodeAt(i % key.length)) % 256;
        [S[i], S[j]] = [S[j], S[i]];
      }
      let result = '';
      let ii = 0;
      j = 0;
      for (let k = 0; k < data.length; k++) {
        ii = (ii + 1) % 256;
        j = (j + S[ii]) % 256;
        [S[ii], S[j]] = [S[j], S[ii]];
        result += String.fromCharCode(data[k] ^ S[(S[ii] + S[j]) % 256]);
      }
      return result;
    }
    
    const rc4Result = rc4(ua, decoded);
    console.log('RC4 with full UA:', rc4Result.substring(0, 100));
    
    // Try with different key derivations
    const keys = [
      ua,
      ua.split(' ')[0],
      ua.match(/Chrome\/[\d.]+/)?.[0] || '',
      Buffer.from(ua).toString('base64').substring(0, 32),
    ];
    
    for (const key of keys) {
      if (!key) continue;
      const result = rc4(key, decoded);
      if (result.includes('{') || result.includes('sources') || result.includes('http')) {
        console.log(`RC4 with "${key.substring(0, 30)}...":`, result.substring(0, 150));
      }
    }
    
  } catch (e) {
    console.log('Base64 decode error:', e.message);
  }
  
  // Check character frequency
  console.log('\n=== Character Analysis ===');
  const freq = {};
  for (const c of encrypted) {
    freq[c] = (freq[c] || 0) + 1;
  }
  console.log('Unique chars:', Object.keys(freq).length);
  console.log('Chars:', Object.keys(freq).sort().join(''));
}

analyzeEncryption().catch(console.error);
