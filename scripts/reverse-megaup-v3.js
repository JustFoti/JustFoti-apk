#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v3
 * 
 * Strategy: Compare multiple encrypted/decrypted pairs with different UAs
 * to understand how the UA affects the encryption
 */

const videoId = 'jIrrLzj-WS2JcOLzF79O5xvpCQ';
const baseUrl = 'https://megaup22.online';

async function getEncryptedAndDecrypted(ua) {
  const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
  });
  const mediaData = await mediaResponse.json();
  const encrypted = mediaData.result;
  
  const decResponse = await fetch('https://enc-dec.app/api/dec-mega', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: encrypted, agent: ua }),
  });
  const decResult = await decResponse.json();
  const decrypted = decResult.result;
  
  return { encrypted, decrypted, ua };
}

async function main() {
  // Get pairs with different UAs
  const uas = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  ];
  
  const pairs = [];
  for (const ua of uas) {
    console.log(`Fetching with UA: Chrome/${ua.match(/Chrome\/([\d.]+)/)[1]}`);
    const pair = await getEncryptedAndDecrypted(ua);
    pairs.push(pair);
    console.log(`  Encrypted: ${pair.encrypted.substring(0, 50)}...`);
  }
  
  // All decrypted should be the same
  console.log('\n=== Comparing encrypted data ===');
  console.log('All decrypted same:', pairs.every(p => JSON.stringify(p.decrypted) === JSON.stringify(pairs[0].decrypted)));
  
  // Compare encrypted byte by byte
  const enc0 = Buffer.from(pairs[0].encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const enc1 = Buffer.from(pairs[1].encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const enc2 = Buffer.from(pairs[2].encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  
  console.log('\nEncrypted lengths:', enc0.length, enc1.length, enc2.length);
  
  // Find which bytes differ
  const diffPositions = [];
  for (let i = 0; i < enc0.length; i++) {
    if (enc0[i] !== enc1[i] || enc0[i] !== enc2[i]) {
      diffPositions.push(i);
    }
  }
  console.log('Bytes that differ:', diffPositions.length);
  console.log('First 20 diff positions:', diffPositions.slice(0, 20));
  
  // The UA difference is in the Chrome version number
  // Chrome/120 vs Chrome/119 vs Chrome/118
  // Let's see if the diff positions correlate with UA positions
  
  console.log('\n=== Analyzing UA correlation ===');
  const ua0 = pairs[0].ua;
  const ua1 = pairs[1].ua;
  
  // Find where UAs differ
  const uaDiffPos = [];
  for (let i = 0; i < ua0.length; i++) {
    if (ua0[i] !== ua1[i]) {
      uaDiffPos.push(i);
    }
  }
  console.log('UA diff positions:', uaDiffPos);
  console.log('UA diff chars:', uaDiffPos.map(i => `${i}:'${ua0[i]}'→'${ua1[i]}'`));
  
  // Check if encrypted diff positions match UA diff positions (mod something)
  console.log('\n=== Checking position correlation ===');
  for (const encPos of diffPositions.slice(0, 10)) {
    const uaPos = encPos % ua0.length;
    console.log(`Enc pos ${encPos} → UA pos ${uaPos} (char: '${ua0[uaPos]}')`);
  }
  
  // Try to find the XOR key by comparing encrypted bytes at diff positions
  console.log('\n=== Deriving XOR relationship ===');
  for (const pos of diffPositions.slice(0, 5)) {
    const e0 = enc0[pos];
    const e1 = enc1[pos];
    const e2 = enc2[pos];
    
    // The UA chars that differ
    const uaPos = pos % ua0.length;
    const u0 = ua0.charCodeAt(uaPos);
    const u1 = ua1.charCodeAt(uaPos);
    const u2 = ua2 ? pairs[2].ua.charCodeAt(uaPos) : 0;
    
    console.log(`Pos ${pos}: enc=[${e0},${e1},${e2}] ua=[${u0},${u1},${u2}]`);
    console.log(`  e0^e1=${e0^e1}, u0^u1=${u0^u1}, match=${(e0^e1)===(u0^u1)}`);
  }
  
  // If e0^e1 === u0^u1, then the cipher is: ciphertext[i] = plaintext[i] ^ ua[i % ua.length] ^ something
  // Let's try to find that "something"
  
  console.log('\n=== Trying to decrypt with XOR ===');
  const decryptedStr = JSON.stringify(pairs[0].decrypted);
  const decryptedBytes = Buffer.from(decryptedStr, 'utf8');
  
  // If cipher is: enc = plain ^ ua ^ constant
  // Then: plain = enc ^ ua ^ constant
  // And: constant = enc ^ plain ^ ua
  
  const constant = Buffer.alloc(Math.min(enc0.length, decryptedBytes.length));
  for (let i = 0; i < constant.length; i++) {
    constant[i] = enc0[i] ^ decryptedBytes[i] ^ ua0.charCodeAt(i % ua0.length);
  }
  console.log('Derived constant (first 64 bytes):', constant.slice(0, 64).toString('hex'));
  
  // Check if constant is repeating
  const constHex = constant.toString('hex');
  for (let period = 1; period <= 64; period++) {
    let matches = true;
    for (let i = period * 2; i < Math.min(constHex.length, period * 8); i++) {
      if (constHex[i] !== constHex[i % (period * 2)]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      console.log(`Constant repeats with period ${period}`);
      console.log('Pattern:', constHex.substring(0, period * 2));
      break;
    }
  }
  
  // Try decrypting with just UA XOR
  console.log('\n=== Trying simple UA XOR ===');
  let xorResult = '';
  for (let i = 0; i < enc0.length; i++) {
    xorResult += String.fromCharCode(enc0[i] ^ ua0.charCodeAt(i % ua0.length));
  }
  console.log('XOR result (first 100):', xorResult.substring(0, 100));
  
  // The result might be base64 encoded
  try {
    const decoded = Buffer.from(xorResult, 'base64').toString('utf8');
    console.log('Base64 decoded:', decoded.substring(0, 100));
  } catch {}
}

main().catch(console.error);
