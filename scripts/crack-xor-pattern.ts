#!/usr/bin/env bun
/**
 * Crack the XOR pattern by analyzing multiple samples
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

function parseProtobuf(bytes: Uint8Array): string {
  let idx = 1;
  let length = 0;
  let shift = 0;
  while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) {
    length |= (bytes[idx] & 0x7f) << shift;
    shift += 7;
    idx++;
  }
  length |= (bytes[idx] & 0x7f) << shift;
  idx++;
  return String.fromCharCode(...bytes.slice(idx, idx + length));
}

interface Sample {
  what: string;
  encoded: string;
  // We'll derive the key by trying different known URL prefixes
}

async function fetchSample(source: string, id: string, streamNo: string): Promise<Sample | null> {
  try {
    const protoBody = encodeProtobuf(source, id, streamNo);
    
    const response = await fetch(`${EMBED_BASE}/fetch`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Content-Type': 'application/octet-stream',
        'Origin': EMBED_BASE,
        'Referer': `${EMBED_BASE}/embed/${source}/${id}/${streamNo}`,
      },
      body: protoBody,
    });

    const what = response.headers.get('what');
    console.log('Response status:', response.status, 'WHAT:', what);
    
    if (!what || !response.ok) return null;

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const encoded = parseProtobuf(bytes);
    
    return { what, encoded };
  } catch (e) {
    console.error('Fetch error:', e);
    return null;
  }
}

async function main() {
  console.log('Fetching samples...\n');
  
  // Fetch multiple samples
  const samples: { source: string; id: string; streamNo: string; data: Sample }[] = [];
  
  const testCases = [
    { source: 'alpha', id: 'nba-tv-1', streamNo: '1' },
    { source: 'alpha', id: 'nba-tv-1', streamNo: '1' },
    { source: 'alpha', id: 'nba-tv-1', streamNo: '1' },
  ];
  
  for (const tc of testCases) {
    const data = await fetchSample(tc.source, tc.id, tc.streamNo);
    if (data) {
      samples.push({ ...tc, data });
      console.log(`Sample: WHAT=${data.what}`);
      console.log(`        Encoded=${data.encoded.substring(0, 60)}...`);
      await new Promise(r => setTimeout(r, 500)); // Rate limit
    }
  }
  
  if (samples.length === 0) {
    console.log('No samples collected');
    return;
  }
  
  // The URL format is known:
  // https://lb{N}.strmd.top/secure/{32-char-token}/{source}/stream/{id}/{streamNo}/playlist.m3u8
  
  // We know the prefix: "https://lb" (10 chars)
  // Then a digit 1-6
  // Then ".strmd.top/secure/" (18 chars)
  // Then 32-char token
  // Then "/{source}/stream/{id}/{streamNo}/playlist.m3u8"
  
  const knownPrefix = 'https://lb';
  
  console.log('\n=== Analyzing XOR pattern ===\n');
  
  for (const sample of samples) {
    const { what, encoded } = sample.data;
    const { source, id, streamNo } = sample;
    
    console.log(`\nSample: ${source}/${id}/${streamNo}`);
    console.log(`WHAT: ${what}`);
    
    // Derive key for the known prefix
    const keyForPrefix: number[] = [];
    for (let i = 0; i < knownPrefix.length; i++) {
      keyForPrefix.push(encoded.charCodeAt(i) ^ knownPrefix.charCodeAt(i));
    }
    console.log(`Key for "https://lb": ${keyForPrefix}`);
    console.log(`As chars: ${keyForPrefix.map(b => String.fromCharCode(b)).join('')}`);
    
    // Check if key matches WHAT
    const whatBytes = what.split('').map(c => c.charCodeAt(0));
    let matchesWhat = true;
    for (let i = 0; i < keyForPrefix.length; i++) {
      if (keyForPrefix[i] !== whatBytes[i]) {
        matchesWhat = false;
        break;
      }
    }
    console.log(`Key matches WHAT prefix: ${matchesWhat}`);
    
    if (!matchesWhat) {
      // Check XOR with WHAT
      const xorWithWhat = keyForPrefix.map((k, i) => k ^ whatBytes[i]);
      console.log(`Key XOR WHAT: ${xorWithWhat}`);
      console.log(`As chars: ${xorWithWhat.map(b => String.fromCharCode(b)).join('')}`);
    }
    
    // Try to decode with just WHAT as key
    let decodedWithWhat = '';
    for (let i = 0; i < encoded.length; i++) {
      decodedWithWhat += String.fromCharCode(encoded.charCodeAt(i) ^ whatBytes[i % 32]);
    }
    console.log(`\nDecoded with WHAT: ${decodedWithWhat.substring(0, 80)}`);
    
    // Check if it starts with http
    if (decodedWithWhat.startsWith('http')) {
      console.log('>>> SUCCESS! Simple XOR with WHAT works!');
      console.log(`Full URL: ${decodedWithWhat}`);
    } else {
      // The decoded result XOR'd with the actual URL should give us the "extra" key
      // Let's assume the URL starts with "https://lb" and find what lb number works
      
      for (let lb = 1; lb <= 6; lb++) {
        const testPrefix = `https://lb${lb}.strmd.top/secure/`;
        let matches = true;
        
        for (let i = 0; i < Math.min(testPrefix.length, decodedWithWhat.length); i++) {
          // decodedWithWhat[i] XOR extraKey[i] = testPrefix[i]
          // So extraKey[i] = decodedWithWhat[i] XOR testPrefix[i]
        }
        
        // Calculate what the extra key would need to be
        const extraKey: number[] = [];
        for (let i = 0; i < testPrefix.length; i++) {
          extraKey.push(decodedWithWhat.charCodeAt(i) ^ testPrefix.charCodeAt(i));
        }
        
        // Check if extra key has a pattern
        const uniqueExtra = [...new Set(extraKey)];
        if (uniqueExtra.length <= 5) {
          console.log(`\nLB${lb}: Extra key has only ${uniqueExtra.length} unique values: ${uniqueExtra}`);
          console.log(`Extra key: ${extraKey.slice(0, 30)}`);
        }
        
        // Check if extra key is constant
        if (uniqueExtra.length === 1) {
          console.log(`>>> LB${lb}: Constant XOR value ${uniqueExtra[0]}!`);
          
          // Apply the constant XOR to get the full URL
          let fullUrl = '';
          for (let i = 0; i < decodedWithWhat.length; i++) {
            fullUrl += String.fromCharCode(decodedWithWhat.charCodeAt(i) ^ uniqueExtra[0]);
          }
          console.log(`Full URL: ${fullUrl}`);
        }
      }
    }
  }
}

main().catch(console.error);
