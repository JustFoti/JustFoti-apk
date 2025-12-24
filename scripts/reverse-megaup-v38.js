#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v38
 * 
 * Debug why 'M' (77) isn't matching - it should be in our lookup tables!
 */

const fs = require('fs');

// Read the rules
const rulesData = JSON.parse(fs.readFileSync('megaup-keystream-rules-v3.json', 'utf8'));
const { positionRules } = rulesData;

console.log('Checking if M (77) is in lookup tables...\n');

// 'M' = 77 = 0x4D
const mCode = 77;

let hasM = 0;
let missingM = 0;

for (let i = 0; i < positionRules.length; i++) {
  const rule = positionRules[i];
  
  if (rule.type === 'lookup') {
    if (rule.table[mCode] !== undefined) {
      hasM++;
    } else {
      missingM++;
      if (missingM <= 10) {
        console.log(`Position ${i}: MISSING M in lookup table`);
        console.log(`  Available keys: ${Object.keys(rule.table).join(', ')}`);
      }
    }
  }
}

console.log(`\nLookup tables with M: ${hasM}`);
console.log(`Lookup tables missing M: ${missingM}`);

// Check what characters ARE in the lookup tables
const firstLookup = positionRules.find(r => r.type === 'lookup');
if (firstLookup) {
  const keys = Object.keys(firstLookup.table).map(Number).sort((a, b) => a - b);
  console.log(`\nCharacters in lookup tables: ${keys.map(k => `${k}(${String.fromCharCode(k)})`).join(', ')}`);
}

// The issue is clear: we collected data for A-Z (65-90) and 0-9 (48-57)
// But 'M' is 77, which IS in 65-90!
// Let me check if the data was actually collected

console.log('\n=== Checking position 7 (first lookup) ===');
const pos7 = positionRules[7];
console.log('Keys:', Object.keys(pos7.table).map(Number).sort((a, b) => a - b));
console.log('Has 77 (M)?', pos7.table[77] !== undefined);
console.log('Value for 77:', pos7.table[77]);

// The problem might be that the encrypted data changes between requests
// Let me verify by checking if the keystream is consistent

async function testDecryption(encrypted, agent) {
  const response = await fetch('https://enc-dec.app/api/dec-mega', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: encrypted, agent }),
  });
  return await response.json();
}

async function main() {
  const videoId = 'jIrrLzj-WS2JcOLzF79O5xvpCQ';
  const baseUrl = 'https://megaup22.online';
  
  // Get fresh data for 'M'
  console.log('\n=== Getting fresh data for M ===\n');
  
  const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: { 'User-Agent': 'M', 'Referer': `${baseUrl}/e/${videoId}` },
  });
  const mediaData = await mediaResponse.json();
  const encrypted = mediaData.result;
  const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  
  const decResult = await testDecryption(encrypted, 'M');
  const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
  const decBytes = Buffer.from(decrypted, 'utf8');
  
  // Calculate keystream
  const keystream = [];
  for (let i = 0; i < decBytes.length; i++) {
    keystream.push(encBytes[i] ^ decBytes[i]);
  }
  
  console.log('Fresh keystream for M (first 20):', keystream.slice(0, 20).map(k => k.toString(16).padStart(2, '0')).join(' '));
  
  // Compare with stored rules
  console.log('\nComparing with stored rules:');
  for (let i = 0; i < 20; i++) {
    const rule = positionRules[i];
    let expected;
    
    switch (rule.type) {
      case 'fixed':
        expected = rule.value;
        break;
      case 'xor':
        expected = 77 ^ rule.constant;
        break;
      case 'highNibble':
        expected = 77 ^ (rule.map[77 & 0xF0] || 0);
        break;
      case 'lookup':
        expected = rule.table[77];
        break;
    }
    
    const actual = keystream[i];
    const match = expected === actual ? '✓' : '✗';
    console.log(`[${i.toString().padStart(2)}] ${rule.type.padEnd(10)} expected=${expected?.toString(16).padStart(2, '0')} actual=${actual.toString(16).padStart(2, '0')} ${match}`);
  }
  
  // Now test with real UA
  console.log('\n=== Testing with Mozilla UA ===\n');
  
  const realUA = 'Mozilla/5.0';
  const mediaResponse2 = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: { 'User-Agent': realUA, 'Referer': `${baseUrl}/e/${videoId}` },
  });
  const mediaData2 = await mediaResponse2.json();
  const encrypted2 = mediaData2.result;
  const encBytes2 = Buffer.from(encrypted2.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  
  const decResult2 = await testDecryption(encrypted2, realUA);
  const decrypted2 = typeof decResult2.result === 'string' ? decResult2.result : JSON.stringify(decResult2.result);
  const decBytes2 = Buffer.from(decrypted2, 'utf8');
  
  // Calculate keystream
  const keystream2 = [];
  for (let i = 0; i < decBytes2.length; i++) {
    keystream2.push(encBytes2[i] ^ decBytes2[i]);
  }
  
  console.log('Keystream for Mozilla (first 20):', keystream2.slice(0, 20).map(k => k.toString(16).padStart(2, '0')).join(' '));
  
  // Compare M keystream with Mozilla keystream
  console.log('\nComparing M vs Mozilla keystrams:');
  for (let i = 0; i < 20; i++) {
    const ksM = keystream[i];
    const ksMoz = keystream2[i];
    const diff = ksM ^ ksMoz;
    const match = ksM === ksMoz ? '=' : `diff=${diff.toString(16)}`;
    console.log(`[${i.toString().padStart(2)}] M=${ksM.toString(16).padStart(2, '0')} Moz=${ksMoz.toString(16).padStart(2, '0')} ${match}`);
  }
  
  // They should be the same since both start with 'M'!
  // If they're different, the encrypted data is different
  
  console.log('\n=== Comparing encrypted data ===');
  console.log('M encrypted (first 50):', encBytes.slice(0, 50).toString('hex'));
  console.log('Moz encrypted (first 50):', encBytes2.slice(0, 50).toString('hex'));
  
  // XOR the encrypted data
  const xorEnc = [];
  for (let i = 0; i < Math.min(encBytes.length, encBytes2.length); i++) {
    xorEnc.push(encBytes[i] ^ encBytes2[i]);
  }
  console.log('XOR (first 50):', Buffer.from(xorEnc.slice(0, 50)).toString('hex'));
  
  // Count non-zero XOR bytes
  const nonZero = xorEnc.filter(x => x !== 0).length;
  console.log(`Non-zero XOR bytes: ${nonZero}/${xorEnc.length}`);
}

main().catch(console.error);
