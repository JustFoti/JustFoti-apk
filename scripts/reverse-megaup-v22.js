#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v22
 * 
 * The cipher has plaintext feedback. Let's try to find the exact algorithm.
 * 
 * Observation: keystream[i] depends on plaintext[i-1]
 * 
 * Let's try to find the relationship by analyzing the state transitions.
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
  // Get a single video for analysis
  const videoId = 'jIrrLzj-WS2JcOLzF79O5xvpCQ';
  const baseUrl = 'https://megaup22.online';
  
  const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
  });
  const mediaData = await mediaResponse.json();
  const encrypted = mediaData.result;
  
  const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  
  const decResult = await testDecryption(encrypted, ua);
  const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
  const decBytes = Buffer.from(decrypted, 'utf8');
  
  // Extract keystream
  const keystream = [];
  for (let i = 0; i < decBytes.length; i++) {
    keystream.push(encBytes[i] ^ decBytes[i]);
  }
  
  console.log('=== Analyzing state transitions ===');
  
  // The cipher might be RC4-like with plaintext feedback
  // In RC4, the state is an S-box that gets permuted
  // Let's see if we can find a pattern
  
  // Try to find: keystream[i] = S[f(plaintext[i-1])]
  // where S is some substitution table
  
  // First, let's see if there's a simple relationship
  console.log('\nLooking for patterns in keystream transitions:');
  
  for (let i = 1; i < 20; i++) {
    const ks_prev = keystream[i - 1];
    const ks_curr = keystream[i];
    const pt_prev = decBytes[i - 1];
    
    // Try various combinations
    const xor = ks_prev ^ pt_prev;
    const add = (ks_prev + pt_prev) & 0xFF;
    const sub = (ks_prev - pt_prev + 256) & 0xFF;
    
    console.log(`[${i}] ks_prev=${ks_prev.toString(16).padStart(2, '0')} pt_prev=${pt_prev.toString(16).padStart(2, '0')} -> ks_curr=${ks_curr.toString(16).padStart(2, '0')} | xor=${xor.toString(16).padStart(2, '0')} add=${add.toString(16).padStart(2, '0')} sub=${sub.toString(16).padStart(2, '0')}`);
  }
  
  // The cipher might use a more complex state
  // Let's try to find if it's RC4 with plaintext feedback
  
  console.log('\n=== Testing RC4 with plaintext feedback ===');
  
  // RC4 state: S[256], i, j
  // Normal RC4: i++, j += S[i], swap(S[i], S[j]), output S[(S[i]+S[j]) % 256]
  // With feedback: after output, update state based on plaintext
  
  // Let's try to simulate this
  const S = new Array(256);
  for (let i = 0; i < 256; i++) S[i] = i;
  
  // Initialize with UA (like RC4 KSA)
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + ua.charCodeAt(i % ua.length)) % 256;
    [S[i], S[j]] = [S[j], S[i]];
  }
  
  // Generate keystream with plaintext feedback
  let i = 0;
  j = 0;
  const generatedKs = [];
  
  for (let k = 0; k < decBytes.length; k++) {
    i = (i + 1) % 256;
    j = (j + S[i]) % 256;
    [S[i], S[j]] = [S[j], S[i]];
    const ksb = S[(S[i] + S[j]) % 256];
    generatedKs.push(ksb);
    
    // Feedback: update j based on plaintext
    // Try: j = (j + plaintext[k]) % 256
    j = (j + decBytes[k]) % 256;
  }
  
  // Compare
  let matches = 0;
  for (let k = 0; k < keystream.length; k++) {
    if (generatedKs[k] === keystream[k]) matches++;
  }
  console.log(`RC4 with j += plaintext feedback: ${matches}/${keystream.length} matches`);
  
  // Try different feedback mechanisms
  const feedbackMechanisms = [
    { name: 'j += pt', fn: (S, i, j, pt) => (j + pt) % 256 },
    { name: 'j ^= pt', fn: (S, i, j, pt) => j ^ pt },
    { name: 'j = (j + S[pt]) % 256', fn: (S, i, j, pt) => (j + S[pt]) % 256 },
    { name: 'swap S[j] with S[pt]', fn: (S, i, j, pt) => { [S[j], S[pt % 256]] = [S[pt % 256], S[j]]; return j; } },
  ];
  
  for (const { name, fn } of feedbackMechanisms) {
    // Reset state
    for (let i = 0; i < 256; i++) S[i] = i;
    j = 0;
    for (let i = 0; i < 256; i++) {
      j = (j + S[i] + ua.charCodeAt(i % ua.length)) % 256;
      [S[i], S[j]] = [S[j], S[i]];
    }
    
    i = 0;
    j = 0;
    const ks = [];
    
    for (let k = 0; k < decBytes.length; k++) {
      i = (i + 1) % 256;
      j = (j + S[i]) % 256;
      [S[i], S[j]] = [S[j], S[i]];
      ks.push(S[(S[i] + S[j]) % 256]);
      
      // Apply feedback
      j = fn(S, i, j, decBytes[k]);
    }
    
    let m = 0;
    for (let k = 0; k < keystream.length; k++) {
      if (ks[k] === keystream[k]) m++;
    }
    console.log(`${name}: ${m}/${keystream.length} matches`);
  }
}

main().catch(console.error);
