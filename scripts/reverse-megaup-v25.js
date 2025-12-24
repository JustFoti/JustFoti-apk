#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v25
 * 
 * BREAKTHROUGH: At position 36, both samples have:
 * - Same plaintext ('2')
 * - Same keystream (0x9d)
 * 
 * This suggests: keystream[i] = f(i, plaintext[i])
 * NOT dependent on previous plaintext!
 * 
 * Let's verify this hypothesis.
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
  
  // Check hypothesis: when plaintext[i] is the same, keystream[i] should be the same
  console.log('=== Verifying hypothesis: ks[i] = f(i, pt[i]) ===\n');
  
  let sameCount = 0;
  let diffCount = 0;
  let hypothesis_holds = 0;
  let hypothesis_fails = 0;
  
  for (let i = 0; i < Math.min(samples[0].decBytes.length, samples[1].decBytes.length); i++) {
    const pt0 = samples[0].decBytes[i];
    const pt1 = samples[1].decBytes[i];
    const k0 = ks0[i];
    const k1 = ks1[i];
    
    if (pt0 === pt1) {
      sameCount++;
      if (k0 === k1) {
        hypothesis_holds++;
      } else {
        hypothesis_fails++;
        console.log(`FAIL at ${i}: same pt (${pt0.toString(16)}) but different ks (${k0.toString(16)} vs ${k1.toString(16)})`);
      }
    } else {
      diffCount++;
    }
  }
  
  console.log(`\nSame plaintext positions: ${sameCount}`);
  console.log(`Different plaintext positions: ${diffCount}`);
  console.log(`Hypothesis holds: ${hypothesis_holds}/${sameCount}`);
  console.log(`Hypothesis fails: ${hypothesis_fails}/${sameCount}`);
  
  if (hypothesis_fails === 0) {
    console.log('\n*** HYPOTHESIS CONFIRMED: keystream[i] = f(i, plaintext[i]) ***');
    
    // Now let's build the function f(i, pt)
    // It could be: f(i, pt) = S[(i + pt) mod 256] or similar
    
    console.log('\n=== Building the cipher function ===');
    
    // Collect all (position, plaintext, keystream) tuples
    const tuples = [];
    for (const sample of samples) {
      for (let i = 0; i < sample.decBytes.length; i++) {
        const pt = sample.decBytes[i];
        const ks = sample.encBytes[i] ^ pt;
        tuples.push({ pos: i, pt, ks });
      }
    }
    
    // Try to find the pattern
    // Hypothesis 1: ks = S[(pos + pt) mod 256]
    console.log('\nTrying: ks = S[(pos + pt) mod 256]');
    
    const sbox1 = new Array(256).fill(-1);
    let conflicts1 = 0;
    
    for (const { pos, pt, ks } of tuples) {
      const idx = (pos + pt) & 0xFF;
      if (sbox1[idx] === -1) {
        sbox1[idx] = ks;
      } else if (sbox1[idx] !== ks) {
        conflicts1++;
      }
    }
    console.log(`Conflicts: ${conflicts1}, Entries: ${sbox1.filter(x => x !== -1).length}`);
    
    // Hypothesis 2: ks = S[(pos * pt) mod 256]
    console.log('\nTrying: ks = S[(pos * pt) mod 256]');
    
    const sbox2 = new Array(256).fill(-1);
    let conflicts2 = 0;
    
    for (const { pos, pt, ks } of tuples) {
      const idx = (pos * pt) & 0xFF;
      if (sbox2[idx] === -1) {
        sbox2[idx] = ks;
      } else if (sbox2[idx] !== ks) {
        conflicts2++;
      }
    }
    console.log(`Conflicts: ${conflicts2}, Entries: ${sbox2.filter(x => x !== -1).length}`);
    
    // Hypothesis 3: ks = S[pos] XOR pt
    console.log('\nTrying: ks = S[pos mod 256] XOR pt');
    
    const sbox3 = new Array(256).fill(-1);
    let conflicts3 = 0;
    
    for (const { pos, pt, ks } of tuples) {
      const idx = pos & 0xFF;
      const expected_sbox_val = ks ^ pt;
      if (sbox3[idx] === -1) {
        sbox3[idx] = expected_sbox_val;
      } else if (sbox3[idx] !== expected_sbox_val) {
        conflicts3++;
      }
    }
    console.log(`Conflicts: ${conflicts3}, Entries: ${sbox3.filter(x => x !== -1).length}`);
    
    // Hypothesis 4: ks = S[pos mod N] XOR pt, for various N
    for (const N of [64, 128, 256, 512, 1024]) {
      const sbox = new Array(N).fill(-1);
      let conflicts = 0;
      
      for (const { pos, pt, ks } of tuples) {
        const idx = pos % N;
        const expected = ks ^ pt;
        if (sbox[idx] === -1) {
          sbox[idx] = expected;
        } else if (sbox[idx] !== expected) {
          conflicts++;
        }
      }
      
      if (conflicts === 0) {
        console.log(`\n*** FOUND: ks = S[pos mod ${N}] XOR pt ***`);
        console.log(`S-box (first 32): ${sbox.slice(0, 32).map(x => x.toString(16).padStart(2, '0')).join(' ')}`);
      } else {
        console.log(`N=${N}: ${conflicts} conflicts`);
      }
    }
    
    // Hypothesis 5: ks = S[pos] + pt (mod 256)
    console.log('\nTrying: ks = (S[pos mod 256] + pt) mod 256');
    
    const sbox5 = new Array(256).fill(-1);
    let conflicts5 = 0;
    
    for (const { pos, pt, ks } of tuples) {
      const idx = pos & 0xFF;
      const expected_sbox_val = (ks - pt + 256) & 0xFF;
      if (sbox5[idx] === -1) {
        sbox5[idx] = expected_sbox_val;
      } else if (sbox5[idx] !== expected_sbox_val) {
        conflicts5++;
      }
    }
    console.log(`Conflicts: ${conflicts5}, Entries: ${sbox5.filter(x => x !== -1).length}`);
  }
}

main().catch(console.error);
