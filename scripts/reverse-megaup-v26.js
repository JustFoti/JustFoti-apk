#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v26
 * 
 * The hypothesis ks[i] = f(i, pt[i]) fails at some positions.
 * Let's analyze those failure positions to understand the pattern.
 */

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
  const videoIds = [
    'jIrrLzj-WS2JcOLzF79O5xvpCQ',
    'k5OoeWapWS2JcOLzF79O5xvpCQ',
  ];
  const baseUrl = 'https://megaup22.online';
  
  const samples = [];
  
  for (const videoId of videoIds) {
    const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
      headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
    });
    const mediaData = await mediaResponse.json();
    const encrypted = mediaData.result;
    
    const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    
    const decResult = await testDecryption(encrypted, ua);
    const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
    const decBytes = Buffer.from(decrypted, 'utf8');
    
    samples.push({ encBytes, decBytes, decrypted });
  }
  
  // Extract keystrams
  const ks0 = samples[0].encBytes.slice(0, samples[0].decBytes.length).map((b, i) => b ^ samples[0].decBytes[i]);
  const ks1 = samples[1].encBytes.slice(0, samples[1].decBytes.length).map((b, i) => b ^ samples[1].decBytes[i]);
  
  // Find failure positions
  const failures = [];
  for (let i = 0; i < Math.min(samples[0].decBytes.length, samples[1].decBytes.length); i++) {
    const pt0 = samples[0].decBytes[i];
    const pt1 = samples[1].decBytes[i];
    const k0 = ks0[i];
    const k1 = ks1[i];
    
    if (pt0 === pt1 && k0 !== k1) {
      failures.push({ pos: i, pt: pt0, ks0: k0, ks1: k1 });
    }
  }
  
  console.log(`Found ${failures.length} failure positions\n`);
  
  // Analyze each failure
  for (const f of failures) {
    console.log(`\n=== Position ${f.pos} ===`);
    console.log(`Plaintext: 0x${f.pt.toString(16)} ('${String.fromCharCode(f.pt)}')`);
    console.log(`Keystream 0: 0x${f.ks0.toString(16)}`);
    console.log(`Keystream 1: 0x${f.ks1.toString(16)}`);
    console.log(`XOR diff: 0x${(f.ks0 ^ f.ks1).toString(16)}`);
    
    // Look at context around this position
    console.log(`\nContext (positions ${f.pos - 5} to ${f.pos + 5}):`);
    for (let i = f.pos - 5; i <= f.pos + 5; i++) {
      if (i < 0 || i >= samples[0].decBytes.length || i >= samples[1].decBytes.length) continue;
      
      const pt0 = samples[0].decBytes[i];
      const pt1 = samples[1].decBytes[i];
      const k0 = ks0[i];
      const k1 = ks1[i];
      
      const marker = i === f.pos ? '>>>' : '   ';
      const ptMatch = pt0 === pt1 ? '=' : '!';
      const ksMatch = k0 === k1 ? '=' : '!';
      
      console.log(`${marker}[${i}] pt: ${pt0.toString(16).padStart(2, '0')} ${ptMatch} ${pt1.toString(16).padStart(2, '0')} | ks: ${k0.toString(16).padStart(2, '0')} ${ksMatch} ${k1.toString(16).padStart(2, '0')} | '${String.fromCharCode(pt0)}' ${ptMatch} '${String.fromCharCode(pt1)}'`);
    }
    
    // Calculate cumulative sum of plaintext differences up to this point
    let cumDiff0 = 0, cumDiff1 = 0;
    for (let i = 0; i < f.pos; i++) {
      cumDiff0 = (cumDiff0 + samples[0].decBytes[i]) & 0xFF;
      cumDiff1 = (cumDiff1 + samples[1].decBytes[i]) & 0xFF;
    }
    console.log(`\nCumulative sum before pos ${f.pos}: sample0=${cumDiff0.toString(16)}, sample1=${cumDiff1.toString(16)}, diff=${(cumDiff0 ^ cumDiff1).toString(16)}`);
    
    // Count how many positions before this had different plaintext
    let diffCount = 0;
    for (let i = 0; i < f.pos; i++) {
      if (samples[0].decBytes[i] !== samples[1].decBytes[i]) diffCount++;
    }
    console.log(`Positions with different plaintext before ${f.pos}: ${diffCount}`);
  }
  
  // Now let's try a model where the state accumulates
  console.log('\n\n=== Testing cumulative state model ===');
  
  // Model: state[i] = sum(pt[0:i]) mod 256
  // keystream[i] = S[state[i]] XOR pt[i]
  
  // Build S-box from sample 0
  const sbox = new Array(256).fill(-1);
  let state = 0;
  
  for (let i = 0; i < samples[0].decBytes.length; i++) {
    const pt = samples[0].decBytes[i];
    const ks = ks0[i];
    const expected_sbox = ks ^ pt;
    
    if (sbox[state] === -1) {
      sbox[state] = expected_sbox;
    }
    
    state = (state + pt) & 0xFF;
  }
  
  console.log(`Built S-box with ${sbox.filter(x => x !== -1).length} entries`);
  
  // Verify on sample 1
  state = 0;
  let matches = 0;
  let mismatches = 0;
  
  for (let i = 0; i < samples[1].decBytes.length; i++) {
    const pt = samples[1].decBytes[i];
    const ks = ks1[i];
    
    if (sbox[state] !== -1) {
      const predicted_ks = sbox[state] ^ pt;
      if (predicted_ks === ks) {
        matches++;
      } else {
        mismatches++;
        if (mismatches <= 5) {
          console.log(`Mismatch at ${i}: state=${state.toString(16)}, predicted=${predicted_ks.toString(16)}, actual=${ks.toString(16)}`);
        }
      }
    }
    
    state = (state + pt) & 0xFF;
  }
  
  console.log(`Verification: ${matches} matches, ${mismatches} mismatches`);
}

main().catch(console.error);
