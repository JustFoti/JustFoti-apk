#!/usr/bin/env bun
/**
 * Crack the key derivation by comparing encoded data with known URL structure
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

async function fetchData(source: string, id: string, streamNo: string) {
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
  if (!what || !response.ok) throw new Error('Failed to fetch');

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const encoded = parseProtobuf(bytes);
  
  return { what, encoded, rawBytes: bytes };
}

async function main() {
  const source = 'alpha';
  const id = 'nba-tv-1';
  const streamNo = '1';
  
  console.log('Fetching data...\n');
  const { what, encoded, rawBytes } = await fetchData(source, id, streamNo);
  
  console.log('WHAT header:', what);
  console.log('WHAT length:', what.length);
  console.log('Encoded data:', encoded);
  console.log('Encoded length:', encoded.length);
  
  // The URL structure is:
  // https://lb{N}.strmd.top/secure/{32-char-token}/{source}/stream/{id}/{streamNo}/playlist.m3u8
  // For alpha/nba-tv-1/1:
  // https://lb{N}.strmd.top/secure/{TOKEN}/alpha/stream/nba-tv-1/1/playlist.m3u8
  
  // Total length: 10 + 1 + 18 + 32 + 1 + 5 + 8 + 8 + 2 + 14 = ~99 chars minimum
  // But encoded is 132 chars, so there might be padding or the URL is longer
  
  // Let's try to find the lb number by testing each one
  console.log('\n=== Testing different lb numbers ===\n');
  
  for (let lb = 1; lb <= 6; lb++) {
    // Build the expected URL prefix
    const prefix = `https://lb${lb}.strmd.top/secure/`;
    
    // Derive what the key would need to be for this prefix
    const derivedKey: number[] = [];
    for (let i = 0; i < prefix.length; i++) {
      derivedKey.push(encoded.charCodeAt(i) ^ prefix.charCodeAt(i));
    }
    
    console.log(`LB${lb} derived key (first 29): ${derivedKey.join(',')}`);
    
    // Check if this key has a pattern related to WHAT
    const whatBytes = what.split('').map(c => c.charCodeAt(0));
    
    // Check if key[i] = WHAT[i] for all i
    let matchesWhat = true;
    for (let i = 0; i < derivedKey.length; i++) {
      if (derivedKey[i] !== whatBytes[i % 32]) {
        matchesWhat = false;
        break;
      }
    }
    
    if (matchesWhat) {
      console.log(`>>> LB${lb}: Key matches WHAT!`);
      
      // Decode the full URL
      let url = '';
      for (let i = 0; i < encoded.length; i++) {
        url += String.fromCharCode(encoded.charCodeAt(i) ^ whatBytes[i % 32]);
      }
      console.log(`URL: ${url}`);
      continue;
    }
    
    // Check if key[i] = WHAT[i] XOR constant
    const xorWithWhat = derivedKey.map((k, i) => k ^ whatBytes[i % 32]);
    const uniqueXors = [...new Set(xorWithWhat)];
    
    if (uniqueXors.length === 1) {
      console.log(`>>> LB${lb}: Key = WHAT XOR ${uniqueXors[0]}`);
      
      // Decode with this constant
      let url = '';
      for (let i = 0; i < encoded.length; i++) {
        url += String.fromCharCode(encoded.charCodeAt(i) ^ whatBytes[i % 32] ^ uniqueXors[0]);
      }
      console.log(`URL: ${url}`);
      continue;
    }
    
    // Check if the XOR values follow a pattern
    console.log(`   XOR with WHAT: ${xorWithWhat.join(',')}`);
    
    // Check if XOR values are sequential or have arithmetic pattern
    let isSequential = true;
    for (let i = 1; i < xorWithWhat.length; i++) {
      if (xorWithWhat[i] - xorWithWhat[i-1] !== xorWithWhat[1] - xorWithWhat[0]) {
        isSequential = false;
        break;
      }
    }
    if (isSequential) {
      console.log(`   >>> Sequential pattern detected!`);
    }
  }
  
  // Let's also check if the key is derived from the request parameters
  console.log('\n=== Checking if key involves request params ===\n');
  
  const requestStr = `${source}${id}${streamNo}`;
  const requestBytes = requestStr.split('').map(c => c.charCodeAt(0));
  console.log(`Request string: ${requestStr}`);
  console.log(`Request bytes: ${requestBytes.join(',')}`);
  
  // Check if key involves XOR with request params
  const prefix = 'https://lb1.strmd.top/secure/';
  const derivedKey: number[] = [];
  for (let i = 0; i < prefix.length; i++) {
    derivedKey.push(encoded.charCodeAt(i) ^ prefix.charCodeAt(i));
  }
  
  // Check key XOR WHAT XOR request
  const whatBytes = what.split('').map(c => c.charCodeAt(0));
  const tripleXor = derivedKey.map((k, i) => k ^ whatBytes[i % 32] ^ requestBytes[i % requestBytes.length]);
  console.log(`Key XOR WHAT XOR request: ${tripleXor.join(',')}`);
  
  // Check if the raw response bytes contain any hints
  console.log('\n=== Raw response analysis ===\n');
  console.log('First 20 raw bytes:', Array.from(rawBytes.slice(0, 20)));
  
  // The protobuf structure might have additional fields
  // Let's parse all fields
  let idx = 0;
  while (idx < rawBytes.length) {
    const byte = rawBytes[idx];
    const tag = byte >> 3;
    const wireType = byte & 0x07;
    idx++;
    
    if (wireType === 2) { // Length-delimited
      let length = 0;
      let shift = 0;
      while (idx < rawBytes.length && (rawBytes[idx] & 0x80) !== 0) {
        length |= (rawBytes[idx] & 0x7f) << shift;
        shift += 7;
        idx++;
      }
      length |= (rawBytes[idx] & 0x7f) << shift;
      idx++;
      
      const data = rawBytes.slice(idx, idx + length);
      console.log(`Field ${tag} (wire type 2, length ${length}): ${String.fromCharCode(...data).substring(0, 50)}...`);
      idx += length;
    } else if (wireType === 0) { // Varint
      let value = 0;
      let shift = 0;
      while (idx < rawBytes.length && (rawBytes[idx] & 0x80) !== 0) {
        value |= (rawBytes[idx] & 0x7f) << shift;
        shift += 7;
        idx++;
      }
      value |= (rawBytes[idx] & 0x7f) << shift;
      idx++;
      console.log(`Field ${tag} (wire type 0, varint): ${value}`);
    } else {
      console.log(`Field ${tag} (wire type ${wireType}): unknown`);
      break;
    }
  }
}

main().catch(console.error);
