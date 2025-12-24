#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v14
 * 
 * Let's try to understand the encryption by testing the enc-dec.app API
 * with custom inputs to see how it behaves.
 */

const crypto = require('crypto');

const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function testDecryption(encrypted, agent) {
  const response = await fetch('https://enc-dec.app/api/dec-mega', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: encrypted, agent }),
  });
  return await response.json();
}

async function main() {
  // Test 1: What happens with a simple base64 input?
  console.log('=== Test 1: Simple base64 input ===');
  
  const simpleText = 'Hello World!';
  const simpleBase64 = Buffer.from(simpleText).toString('base64');
  console.log('Input:', simpleBase64);
  
  const result1 = await testDecryption(simpleBase64, ua);
  console.log('Result:', result1);
  
  // Test 2: What happens with all zeros?
  console.log('\n=== Test 2: All zeros ===');
  
  const zeros = Buffer.alloc(32, 0).toString('base64');
  console.log('Input:', zeros);
  
  const result2 = await testDecryption(zeros, ua);
  console.log('Result:', result2);
  
  // Test 3: What happens with all 0xFF?
  console.log('\n=== Test 3: All 0xFF ===');
  
  const ones = Buffer.alloc(32, 0xFF).toString('base64');
  console.log('Input:', ones);
  
  const result3 = await testDecryption(ones, ua);
  console.log('Result:', result3);
  
  // Test 4: What happens with sequential bytes?
  console.log('\n=== Test 4: Sequential bytes ===');
  
  const sequential = Buffer.from(Array.from({ length: 32 }, (_, i) => i));
  const seqBase64 = sequential.toString('base64');
  console.log('Input:', seqBase64);
  
  const result4 = await testDecryption(seqBase64, ua);
  console.log('Result:', result4);
  
  // If the decryption works, we can XOR to find the keystream
  if (result4.status === 200 && result4.result) {
    const decrypted = typeof result4.result === 'string' ? result4.result : JSON.stringify(result4.result);
    console.log('Decrypted:', decrypted);
    console.log('Decrypted hex:', Buffer.from(decrypted).toString('hex'));
    
    // XOR to find keystream
    const keystream = [];
    for (let i = 0; i < Math.min(sequential.length, decrypted.length); i++) {
      keystream.push(sequential[i] ^ decrypted.charCodeAt(i));
    }
    console.log('Keystream:', Buffer.from(keystream).toString('hex'));
  }
  
  // Test 5: What happens with different UAs?
  console.log('\n=== Test 5: Different UAs ===');
  
  const testUAs = [
    'Mozilla/5.0',
    'TestAgent',
    'A',
  ];
  
  for (const testUA of testUAs) {
    const result = await testDecryption(seqBase64, testUA);
    if (result.status === 200 && result.result) {
      const decrypted = typeof result.result === 'string' ? result.result : JSON.stringify(result.result);
      console.log(`UA "${testUA}": ${Buffer.from(decrypted).toString('hex')}`);
    } else {
      console.log(`UA "${testUA}": ${result.error || 'failed'}`);
    }
  }
  
  // Test 6: Real encrypted data analysis
  console.log('\n=== Test 6: Real encrypted data ===');
  
  const videoId = 'jIrrLzj-WS2JcOLzF79O5xvpCQ';
  const baseUrl = 'https://megaup22.online';
  
  const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
  });
  const mediaData = await mediaResponse.json();
  const encrypted = mediaData.result;
  
  console.log('Encrypted (first 80):', encrypted.substring(0, 80));
  
  // Decode and analyze
  const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  console.log('Decoded length:', encBytes.length);
  
  // Get decrypted
  const decResult = await testDecryption(encrypted, ua);
  const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
  
  console.log('Decrypted length:', decrypted.length);
  
  // The key insight: encrypted is 717 bytes, decrypted is 521 bytes
  // But the XOR keystream we extracted works perfectly
  // This means the encryption only uses the first 521 bytes of the encrypted data
  // The remaining 196 bytes might be padding or metadata
  
  console.log('\n=== Analyzing the extra 196 bytes ===');
  const extraBytes = encBytes.slice(521);
  console.log('Extra bytes (first 32):', extraBytes.slice(0, 32).toString('hex'));
  console.log('Extra bytes (last 32):', extraBytes.slice(-32).toString('hex'));
  
  // Check if extra bytes are padding
  const lastByte = extraBytes[extraBytes.length - 1];
  console.log('Last byte:', lastByte);
  
  // Check if it's PKCS7 padding
  const isPKCS7 = extraBytes.slice(-lastByte).every(b => b === lastByte);
  console.log('Is PKCS7 padding:', isPKCS7);
}

main().catch(console.error);
