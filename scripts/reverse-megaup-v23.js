#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v23
 * 
 * New approach: Build substitution tables by collecting many samples
 * and analyzing the relationship between (position, plaintext_byte, keystream_byte)
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
  // Collect multiple samples
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
    
    samples.push({ encBytes, decBytes });
  }
  
  console.log(`Collected ${samples.length} samples`);
  
  // Build a state machine model
  // Hypothesis: The cipher maintains a state that evolves based on plaintext
  // state[0] = f(UA)
  // state[i] = g(state[i-1], plaintext[i-1])
  // keystream[i] = h(state[i])
  
  // Let's try to find the state by looking at the keystream
  // If keystream[i] = S[state[i]] where S is a substitution table,
  // then we can try to invert it
  
  console.log('\n=== Analyzing state evolution ===');
  
  // Extract keystrams
  const keystrams = samples.map(s => {
    const ks = [];
    for (let i = 0; i < s.decBytes.length; i++) {
      ks.push(s.encBytes[i] ^ s.decBytes[i]);
    }
    return ks;
  });
  
  // The keystrams start the same and diverge when plaintext differs
  // Let's find the exact divergence points
  
  let lastSamePos = -1;
  for (let i = 0; i < Math.min(keystrams[0].length, keystrams[1].length); i++) {
    if (keystrams[0][i] === keystrams[1][i]) {
      lastSamePos = i;
    } else {
      break;
    }
  }
  console.log(`Keystrams identical up to position ${lastSamePos}`);
  
  // At position lastSamePos+1, the keystrams diverge
  // This means the state at position lastSamePos+1 depends on plaintext[lastSamePos]
  
  const divergePos = lastSamePos + 1;
  console.log(`\nAt divergence position ${divergePos}:`);
  console.log(`  Sample 0: pt[${lastSamePos}]=${samples[0].decBytes[lastSamePos].toString(16)} -> ks[${divergePos}]=${keystrams[0][divergePos].toString(16)}`);
  console.log(`  Sample 1: pt[${lastSamePos}]=${samples[1].decBytes[lastSamePos].toString(16)} -> ks[${divergePos}]=${keystrams[1][divergePos].toString(16)}`);
  
  // Let's try to model the state as a simple value
  // Hypothesis: state[i] = (state[i-1] + plaintext[i-1]) mod 256
  // or: state[i] = state[i-1] XOR plaintext[i-1]
  
  console.log('\n=== Testing state models ===');
  
  // Model 1: Additive state
  // state[i] = (state[i-1] + pt[i-1]) mod 256
  // keystream[i] = S[state[i]]
  
  // We need to find the initial state and the S-box
  // Let's assume state[0] is derived from UA somehow
  
  // Try to find S-box by assuming state[i] = sum(pt[0:i]) mod 256
  console.log('\nTrying additive state model...');
  
  const sbox = new Array(256).fill(-1);
  let conflicts = 0;
  
  for (const sample of samples) {
    let state = 0; // Initial state
    for (let i = 0; i < sample.decBytes.length; i++) {
      const ks = sample.encBytes[i] ^ sample.decBytes[i];
      
      if (sbox[state] === -1) {
        sbox[state] = ks;
      } else if (sbox[state] !== ks) {
        conflicts++;
      }
      
      // Update state
      state = (state + sample.decBytes[i]) & 0xFF;
    }
  }
  
  console.log(`Additive model: ${conflicts} conflicts, ${sbox.filter(x => x !== -1).length} S-box entries filled`);
  
  // Model 2: XOR state
  console.log('\nTrying XOR state model...');
  
  const sbox2 = new Array(256).fill(-1);
  conflicts = 0;
  
  for (const sample of samples) {
    let state = 0;
    for (let i = 0; i < sample.decBytes.length; i++) {
      const ks = sample.encBytes[i] ^ sample.decBytes[i];
      
      if (sbox2[state] === -1) {
        sbox2[state] = ks;
      } else if (sbox2[state] !== ks) {
        conflicts++;
      }
      
      state = state ^ sample.decBytes[i];
    }
  }
  
  console.log(`XOR model: ${conflicts} conflicts, ${sbox2.filter(x => x !== -1).length} S-box entries filled`);
  
  // Model 3: State includes position
  // state[i] = (i + sum(pt[0:i])) mod 256
  console.log('\nTrying position+additive state model...');
  
  const sbox3 = new Array(256).fill(-1);
  conflicts = 0;
  
  for (const sample of samples) {
    let sum = 0;
    for (let i = 0; i < sample.decBytes.length; i++) {
      const state = (i + sum) & 0xFF;
      const ks = sample.encBytes[i] ^ sample.decBytes[i];
      
      if (sbox3[state] === -1) {
        sbox3[state] = ks;
      } else if (sbox3[state] !== ks) {
        conflicts++;
      }
      
      sum = (sum + sample.decBytes[i]) & 0xFF;
    }
  }
  
  console.log(`Position+additive model: ${conflicts} conflicts, ${sbox3.filter(x => x !== -1).length} S-box entries filled`);
  
  // Model 4: RC4-like state with plaintext feedback
  // The state is an S-box that gets permuted based on plaintext
  console.log('\nTrying RC4-like model with plaintext feedback...');
  
  // Initialize S-box with UA (like RC4 KSA)
  const S = new Array(256);
  for (let i = 0; i < 256; i++) S[i] = i;
  
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + ua.charCodeAt(i % ua.length)) % 256;
    [S[i], S[j]] = [S[j], S[i]];
  }
  
  // Now try different PRGA variants with plaintext feedback
  const variants = [
    {
      name: 'RC4 + j+=pt',
      prga: (S, i, j, pt) => {
        i = (i + 1) % 256;
        j = (j + S[i]) % 256;
        [S[i], S[j]] = [S[j], S[i]];
        const ks = S[(S[i] + S[j]) % 256];
        j = (j + pt) % 256; // Feedback
        return { i, j, ks };
      }
    },
    {
      name: 'RC4 + swap(S[j], S[pt])',
      prga: (S, i, j, pt) => {
        i = (i + 1) % 256;
        j = (j + S[i]) % 256;
        [S[i], S[j]] = [S[j], S[i]];
        const ks = S[(S[i] + S[j]) % 256];
        [S[j], S[pt % 256]] = [S[pt % 256], S[j]]; // Feedback
        return { i, j, ks };
      }
    },
    {
      name: 'RC4 + j=S[pt]',
      prga: (S, i, j, pt) => {
        i = (i + 1) % 256;
        j = (j + S[i]) % 256;
        [S[i], S[j]] = [S[j], S[i]];
        const ks = S[(S[i] + S[j]) % 256];
        j = S[pt % 256]; // Feedback
        return { i, j, ks };
      }
    },
    {
      name: 'RC4 + i+=pt',
      prga: (S, i, j, pt) => {
        i = (i + 1) % 256;
        j = (j + S[i]) % 256;
        [S[i], S[j]] = [S[j], S[i]];
        const ks = S[(S[i] + S[j]) % 256];
        i = (i + pt) % 256; // Feedback
        return { i, j, ks };
      }
    },
  ];
  
  for (const variant of variants) {
    // Reset S-box
    for (let i = 0; i < 256; i++) S[i] = i;
    j = 0;
    for (let i = 0; i < 256; i++) {
      j = (j + S[i] + ua.charCodeAt(i % ua.length)) % 256;
      [S[i], S[j]] = [S[j], S[i]];
    }
    
    let matches = 0;
    let total = 0;
    let ii = 0, jj = 0;
    
    for (const sample of samples) {
      // Reset for each sample
      for (let i = 0; i < 256; i++) S[i] = i;
      jj = 0;
      for (let i = 0; i < 256; i++) {
        jj = (jj + S[i] + ua.charCodeAt(i % ua.length)) % 256;
        [S[i], S[jj]] = [S[jj], S[i]];
      }
      ii = 0;
      jj = 0;
      
      for (let k = 0; k < sample.decBytes.length; k++) {
        const expected = sample.encBytes[k] ^ sample.decBytes[k];
        const result = variant.prga(S, ii, jj, sample.decBytes[k]);
        ii = result.i;
        jj = result.j;
        
        if (result.ks === expected) matches++;
        total++;
      }
    }
    
    console.log(`${variant.name}: ${matches}/${total} matches (${(matches/total*100).toFixed(1)}%)`);
  }
}

main().catch(console.error);
