#!/usr/bin/env bun
/**
 * Try RC4 decryption with WHAT header as key
 */

const EMBED_BASE = 'https://embedsports.top';

function encodeProtobuf(source: string, id: string, streamNo: string): Uint8Array {
  const sourceBytes = new TextEncoder().encode(source);
  const idBytes = new TextEncoder().encode(id);
  const streamNoBytes = new TextEncoder().encode(streamNo);
  
  const result: number[] = [];
  result.push(0x0a, sourceBytes.length, ...sourceBytes);
  result.push(0x12, idBytes.length, ...idBytes);
  result.push(0x1a, streamNoBytes.length, ...streamNoBytes);
  
  return new Uint8Array(result);
}

// RC4 implementation
function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
  // Key-scheduling algorithm (KSA)
  const S = new Uint8Array(256);
  for (let i = 0; i < 256; i++) S[i] = i;
  
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + key[i % key.length]) % 256;
    [S[i], S[j]] = [S[j], S[i]];
  }
  
  // Pseudo-random generation algorithm (PRGA)
  const result = new Uint8Array(data.length);
  let i = 0;
  j = 0;
  
  for (let k = 0; k < data.length; k++) {
    i = (i + 1) % 256;
    j = (j + S[i]) % 256;
    [S[i], S[j]] = [S[j], S[i]];
    const K = S[(S[i] + S[j]) % 256];
    result[k] = data[k] ^ K;
  }
  
  return result;
}

async function fetchEncoded(source: string, id: string, streamNo: string) {
  const protoBody = encodeProtobuf(source, id, streamNo);
  
  const response = await fetch(`${EMBED_BASE}/fetch`, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Content-Type': 'application/octet-stream',
      'Origin': EMBED_BASE,
      'Referer': `${EMBED_BASE}/embed/${source}/${id}/${streamNo}`,
    },
    body: protoBody,
  });

  const whatHeader = response.headers.get('what');
  if (!whatHeader) throw new Error('No WHAT header');
  
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  let idx = 1;
  while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) idx++;
  idx++;
  
  return { data: bytes.slice(idx), whatHeader };
}

async function tryRC4() {
  const source = 'charlie';
  const id = 'wellington-firebirds-vs-auckland-aces-1629472738';
  const streamNo = '1';
  
  const { data, whatHeader } = await fetchEncoded(source, id, streamNo);
  
  console.log('WHAT:', whatHeader);
  console.log('Encoded:', new TextDecoder().decode(data));
  console.log('Length:', data.length);
  
  // Try RC4 with different keys
  const keys = [
    whatHeader,
    whatHeader.slice(7), // Without "ISEEYO" prefix
    whatHeader.split('').reverse().join(''),
    'ISEEYO' + whatHeader,
    whatHeader + 'ISEEYO',
  ];
  
  console.log('\n--- Trying RC4 decryption ---');
  
  for (const key of keys) {
    const keyBytes = new TextEncoder().encode(key);
    const decrypted = rc4(keyBytes, data);
    const result = new TextDecoder('utf-8', { fatal: false }).decode(decrypted);
    
    console.log(`\nKey: ${key.substring(0, 20)}...`);
    console.log('Result:', result.substring(0, 100));
    
    if (result.startsWith('https://lb') || result.includes('strmd.top')) {
      console.log('\n*** FOUND IT! ***');
      console.log('Full:', result);
      return result;
    }
  }
  
  // Try with key derived from WHAT header bytes
  console.log('\n--- Trying modified RC4 keys ---');
  
  const whatBytes = new TextEncoder().encode(whatHeader);
  
  // Try XOR-ing key bytes with position
  for (let mod = 0; mod < 10; mod++) {
    const modKey = new Uint8Array(whatBytes.length);
    for (let i = 0; i < whatBytes.length; i++) {
      modKey[i] = whatBytes[i] ^ mod;
    }
    
    const decrypted = rc4(modKey, data);
    const result = new TextDecoder('utf-8', { fatal: false }).decode(decrypted);
    
    if (result.startsWith('https://lb') || result.includes('strmd.top')) {
      console.log(`Mod ${mod}: ${result}`);
      return result;
    }
  }
  
  // Maybe it's not RC4 but a simpler stream cipher
  // Try: each byte XOR'd with a pseudo-random sequence seeded by WHAT
  
  console.log('\n--- Trying seeded XOR ---');
  
  // Simple LCG PRNG seeded with WHAT header hash
  function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  let seed = simpleHash(whatHeader);
  const prng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed % 256;
  };
  
  const xorDecrypted = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    xorDecrypted[i] = data[i] ^ prng();
  }
  
  const xorResult = new TextDecoder('utf-8', { fatal: false }).decode(xorDecrypted);
  console.log('Seeded XOR:', xorResult.substring(0, 100));
  
  if (xorResult.startsWith('https://lb')) {
    console.log('\n*** FOUND IT! ***');
    return xorResult;
  }
  
  return null;
}

tryRC4().catch(console.error);
