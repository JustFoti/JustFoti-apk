#!/usr/bin/env bun
/**
 * Let's try a completely different approach:
 * 1. Fetch the embed page and extract any JavaScript that handles the decoding
 * 2. Look for patterns in the response that might indicate the encoding scheme
 */

const EMBED_BASE = 'https://embedsports.top';

async function fetchEmbedPage(source: string, id: string, streamNo: string) {
  const url = `${EMBED_BASE}/embed/${source}/${id}/${streamNo}`;
  console.log('Fetching embed page:', url);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });
  
  return response.text();
}

async function analyzeEmbedPage() {
  const source = 'golf';
  const id = '18634';
  const streamNo = '1';
  
  const html = await fetchEmbedPage(source, id, streamNo);
  
  console.log('\n--- Embed Page Analysis ---');
  console.log('Page length:', html.length);
  
  // Look for script tags
  const scriptMatches = html.match(/<script[^>]*src="([^"]+)"[^>]*>/g);
  console.log('\nExternal scripts:');
  scriptMatches?.forEach(s => console.log(' ', s));
  
  // Look for inline scripts
  const inlineScripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/g);
  console.log('\nInline scripts:', inlineScripts?.length || 0);
  
  // Look for any interesting patterns
  const patterns = [
    /fetch\s*\(/g,
    /\.what/gi,
    /decode/gi,
    /encrypt/gi,
    /decrypt/gi,
    /xor/gi,
    /strmd/gi,
    /playlist/gi,
    /m3u8/gi,
    /secure/gi,
  ];
  
  console.log('\nPattern matches in HTML:');
  for (const pattern of patterns) {
    const matches = html.match(pattern);
    if (matches) {
      console.log(` ${pattern}: ${matches.length} matches`);
    }
  }
  
  // Extract and analyze inline scripts
  if (inlineScripts) {
    for (let i = 0; i < inlineScripts.length; i++) {
      const script = inlineScripts[i];
      if (script.length > 100 && script.length < 10000) {
        console.log(`\n--- Inline Script ${i + 1} (${script.length} chars) ---`);
        // Look for interesting code
        if (script.includes('fetch') || script.includes('what') || script.includes('decode')) {
          console.log(script.substring(0, 500));
        }
      }
    }
  }
  
  // Look for the bundle.js URL
  const bundleMatch = html.match(/bundle[^"']*\.js[^"']*/);
  if (bundleMatch) {
    console.log('\nBundle JS:', bundleMatch[0]);
  }
  
  // Look for any data attributes or config
  const configMatch = html.match(/config\s*=\s*(\{[^}]+\})/);
  if (configMatch) {
    console.log('\nConfig:', configMatch[1]);
  }
  
  // Look for any base64 or encoded data
  const base64Match = html.match(/[A-Za-z0-9+/=]{50,}/g);
  if (base64Match) {
    console.log('\nPossible base64 strings:', base64Match.length);
    base64Match.slice(0, 3).forEach(s => console.log(' ', s.substring(0, 60) + '...'));
  }
}

// Now let's try to understand the encoding by looking at multiple samples
async function collectSamples() {
  const source = 'golf';
  const id = '18634';
  const streamNo = '1';
  
  console.log('\n\n=== Collecting Multiple Samples ===\n');
  
  const samples: { what: string; data: Uint8Array }[] = [];
  
  for (let i = 0; i < 5; i++) {
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
    if (!whatHeader) {
      console.log(`Sample ${i + 1}: No WHAT header`);
      continue;
    }
    
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    let idx = 1;
    while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) idx++;
    idx++;
    
    const data = bytes.slice(idx);
    samples.push({ what: whatHeader, data });
    
    console.log(`Sample ${i + 1}: WHAT=${whatHeader.substring(7)}`);
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  // Analyze the samples
  console.log('\n--- Sample Analysis ---');
  
  // The plaintext should be the same for all samples
  // So: data1 XOR key1 = data2 XOR key2 = ... = plaintext
  // Therefore: data1 XOR data2 = key1 XOR key2
  
  // If we can find the key derivation, we can decode
  
  // Let's see if there's a consistent relationship
  for (let i = 0; i < samples.length - 1; i++) {
    const s1 = samples[i];
    const s2 = samples[i + 1];
    
    console.log(`\nComparing samples ${i + 1} and ${i + 2}:`);
    
    // XOR the data
    const dataXor: number[] = [];
    for (let j = 0; j < Math.min(s1.data.length, s2.data.length); j++) {
      dataXor.push(s1.data[j] ^ s2.data[j]);
    }
    
    // XOR the WHAT headers (after "ISEEYO" prefix)
    const w1 = s1.what.substring(7);
    const w2 = s2.what.substring(7);
    const whatXor: number[] = [];
    for (let j = 0; j < Math.min(w1.length, w2.length); j++) {
      whatXor.push(w1.charCodeAt(j) ^ w2.charCodeAt(j));
    }
    
    console.log('Data XOR (first 25):', dataXor.slice(0, 25));
    console.log('WHAT XOR (25 chars):', whatXor);
    
    // Check if there's a pattern
    // Maybe the key is repeated with a different period
    for (let period = 1; period <= 32; period++) {
      let matches = 0;
      for (let j = 0; j < Math.min(dataXor.length, 100); j++) {
        if (dataXor[j] === whatXor[j % period]) {
          matches++;
        }
      }
      if (matches > 80) {
        console.log(`Period ${period}: ${matches} matches`);
      }
    }
  }
}

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

// Try a known-plaintext attack
async function knownPlaintextAttack() {
  console.log('\n\n=== Known Plaintext Attack ===\n');
  
  // We know the URL structure:
  // https://lb{N}.strmd.top/secure/{32-char-token}/{source}/stream/{id}/{streamNo}/playlist.m3u8
  
  // For golf/18634/1:
  // https://lb?.strmd.top/secure/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/golf/stream/18634/1/playlist.m3u8
  
  // We know these parts of the plaintext:
  const knownParts = [
    { offset: 0, text: 'https://lb' },
    { offset: 11, text: '.strmd.top/secure/' },
    // Token is at offset 29, length 32
    { offset: 61, text: '/golf/stream/18634/1/playlist.m3u8' },
  ];
  
  const source = 'golf';
  const id = '18634';
  const streamNo = '1';
  
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
  
  const data = bytes.slice(idx);
  
  console.log('WHAT:', whatHeader);
  console.log('Data length:', data.length);
  
  // The expected URL length is about 95 chars, but data is 128 bytes
  // Maybe there's padding or the URL is longer
  
  // Let's try to find where the known parts are
  console.log('\nSearching for known plaintext patterns...');
  
  // For each known part, derive what the key would need to be
  for (const part of knownParts) {
    if (part.offset + part.text.length > data.length) continue;
    
    console.log(`\nKnown part at offset ${part.offset}: "${part.text}"`);
    
    const derivedKey: number[] = [];
    for (let i = 0; i < part.text.length; i++) {
      derivedKey.push(data[part.offset + i] ^ part.text.charCodeAt(i));
    }
    
    console.log('Derived key:', derivedKey.map(b => String.fromCharCode(b)).join(''));
    console.log('Derived key bytes:', derivedKey);
    
    // Check if this key pattern appears in WHAT header
    const whatBytes = new TextEncoder().encode(whatHeader);
    const whatSuffix = new TextEncoder().encode(whatHeader.substring(7));
    
    // Try to find the key pattern in WHAT
    for (let startPos = 0; startPos < whatBytes.length; startPos++) {
      let matches = 0;
      for (let i = 0; i < derivedKey.length; i++) {
        if (whatBytes[(startPos + i) % whatBytes.length] === derivedKey[i]) {
          matches++;
        }
      }
      if (matches > derivedKey.length * 0.8) {
        console.log(`  Matches WHAT at offset ${startPos}: ${matches}/${derivedKey.length}`);
      }
    }
    
    // Try with WHAT suffix
    for (let startPos = 0; startPos < whatSuffix.length; startPos++) {
      let matches = 0;
      for (let i = 0; i < derivedKey.length; i++) {
        if (whatSuffix[(startPos + i) % whatSuffix.length] === derivedKey[i]) {
          matches++;
        }
      }
      if (matches > derivedKey.length * 0.8) {
        console.log(`  Matches WHAT[7:] at offset ${startPos}: ${matches}/${derivedKey.length}`);
      }
    }
  }
  
  // Try to decode assuming the key is derived from WHAT in some way
  console.log('\n--- Trying various key derivations ---');
  
  const whatSuffix = whatHeader.substring(7);
  const whatSuffixBytes = new TextEncoder().encode(whatSuffix);
  
  // Maybe the key is the WHAT suffix repeated, but with some transformation
  // Let's try: key[i] = WHAT_suffix[(i * multiplier) % 25]
  
  for (let mult = 1; mult <= 25; mult++) {
    const decoded: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const keyIdx = (i * mult) % whatSuffixBytes.length;
      decoded.push(data[i] ^ whatSuffixBytes[keyIdx]);
    }
    
    const result = String.fromCharCode(...decoded);
    if (result.startsWith('https://lb') || result.includes('strmd.top')) {
      console.log(`Multiplier ${mult} works!`);
      console.log('Result:', result);
    }
  }
  
  // Try: key[i] = WHAT_suffix[(i + offset) % 25]
  for (let offset = 0; offset < 25; offset++) {
    const decoded: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const keyIdx = (i + offset) % whatSuffixBytes.length;
      decoded.push(data[i] ^ whatSuffixBytes[keyIdx]);
    }
    
    const result = String.fromCharCode(...decoded);
    if (result.startsWith('https://lb') || result.includes('strmd.top')) {
      console.log(`Offset ${offset} works!`);
      console.log('Result:', result);
    }
  }
}

async function main() {
  await analyzeEmbedPage();
  await collectSamples();
  await knownPlaintextAttack();
}

main().catch(console.error);
