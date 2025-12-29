#!/usr/bin/env bun
/**
 * Let's try a different approach:
 * 1. The response from /fetch is protobuf encoded
 * 2. The protobuf contains a field with the encoded URL
 * 3. The URL is decoded using some algorithm
 * 
 * Let's parse the protobuf response ourselves and see what's in it
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

// Simple protobuf reader
class ProtobufReader {
  private pos = 0;
  private data: Uint8Array;
  
  constructor(data: Uint8Array) {
    this.data = data;
  }
  
  readVarint(): number {
    let result = 0;
    let shift = 0;
    while (this.pos < this.data.length) {
      const byte = this.data[this.pos++];
      result |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) break;
      shift += 7;
    }
    return result;
  }
  
  readString(): string {
    const length = this.readVarint();
    const bytes = this.data.slice(this.pos, this.pos + length);
    this.pos += length;
    return new TextDecoder().decode(bytes);
  }
  
  readBytes(): Uint8Array {
    const length = this.readVarint();
    const bytes = this.data.slice(this.pos, this.pos + length);
    this.pos += length;
    return bytes;
  }
  
  readFields(): { [key: number]: any } {
    const fields: { [key: number]: any } = {};
    
    while (this.pos < this.data.length) {
      const tag = this.readVarint();
      const fieldNumber = tag >> 3;
      const wireType = tag & 0x7;
      
      switch (wireType) {
        case 0: // Varint
          fields[fieldNumber] = this.readVarint();
          break;
        case 1: // 64-bit
          fields[fieldNumber] = this.data.slice(this.pos, this.pos + 8);
          this.pos += 8;
          break;
        case 2: // Length-delimited
          fields[fieldNumber] = this.readString();
          break;
        case 5: // 32-bit
          fields[fieldNumber] = this.data.slice(this.pos, this.pos + 4);
          this.pos += 4;
          break;
        default:
          console.log(`Unknown wire type ${wireType} for field ${fieldNumber}`);
          return fields;
      }
    }
    
    return fields;
  }
  
  get remaining(): number {
    return this.data.length - this.pos;
  }
}

async function analyzeResponse() {
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
  console.log('WHAT header:', whatHeader);
  console.log('All headers:');
  response.headers.forEach((value, key) => {
    console.log(`  ${key}: ${value}`);
  });
  
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  console.log('\nRaw response length:', bytes.length);
  console.log('Raw response (first 50 bytes):', Array.from(bytes.slice(0, 50)));
  console.log('Raw response as string:', new TextDecoder().decode(bytes).substring(0, 100));
  
  // Parse as protobuf
  console.log('\n=== Parsing as protobuf ===');
  const reader = new ProtobufReader(bytes);
  const fields = reader.readFields();
  
  console.log('Parsed fields:');
  for (const [fieldNum, value] of Object.entries(fields)) {
    if (typeof value === 'string') {
      console.log(`  Field ${fieldNum}: "${value.substring(0, 100)}${value.length > 100 ? '...' : ''}" (length: ${value.length})`);
    } else if (value instanceof Uint8Array) {
      console.log(`  Field ${fieldNum}: [bytes] length=${value.length}`);
    } else {
      console.log(`  Field ${fieldNum}: ${value}`);
    }
  }
  
  // The encoded data is in field 1
  const encodedData = fields[1];
  if (typeof encodedData === 'string') {
    console.log('\n=== Analyzing encoded data ===');
    console.log('Encoded data length:', encodedData.length);
    console.log('Encoded data:', encodedData);
    
    // Try various decoding methods with WHAT header
    if (whatHeader) {
      console.log('\n=== Trying to decode with WHAT header ===');
      
      // Method 1: Simple XOR
      let decoded1 = '';
      for (let i = 0; i < encodedData.length; i++) {
        decoded1 += String.fromCharCode(encodedData.charCodeAt(i) ^ whatHeader.charCodeAt(i % whatHeader.length));
      }
      console.log('Simple XOR:', decoded1.substring(0, 80));
      
      // Method 2: XOR with WHAT[7:] (skip "ISEEYO" prefix)
      const whatSuffix = whatHeader.substring(7);
      let decoded2 = '';
      for (let i = 0; i < encodedData.length; i++) {
        decoded2 += String.fromCharCode(encodedData.charCodeAt(i) ^ whatSuffix.charCodeAt(i % whatSuffix.length));
      }
      console.log('XOR with WHAT[7:]:', decoded2.substring(0, 80));
      
      // Method 3: The key might be in a different order
      // Try: key[i] = WHAT[(i * 7) % 32]
      let decoded3 = '';
      for (let i = 0; i < encodedData.length; i++) {
        decoded3 += String.fromCharCode(encodedData.charCodeAt(i) ^ whatHeader.charCodeAt((i * 7) % whatHeader.length));
      }
      console.log('XOR with WHAT[(i*7)%32]:', decoded3.substring(0, 80));
      
      // Method 4: The encoding might use a different base
      // Try: decode as base64 first, then XOR
      try {
        const base64Decoded = atob(encodedData);
        let decoded4 = '';
        for (let i = 0; i < base64Decoded.length; i++) {
          decoded4 += String.fromCharCode(base64Decoded.charCodeAt(i) ^ whatHeader.charCodeAt(i % whatHeader.length));
        }
        console.log('Base64 then XOR:', decoded4.substring(0, 80));
      } catch (e) {
        console.log('Not valid base64');
      }
      
      // Method 5: The WHAT header might be used as a seed for a PRNG
      // Try: simple LCG seeded with WHAT header hash
      function hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = ((hash << 5) - hash) + str.charCodeAt(i);
          hash = hash & hash;
        }
        return Math.abs(hash);
      }
      
      let seed = hashString(whatHeader);
      const lcg = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed % 256;
      };
      
      let decoded5 = '';
      for (let i = 0; i < encodedData.length; i++) {
        decoded5 += String.fromCharCode(encodedData.charCodeAt(i) ^ lcg());
      }
      console.log('LCG seeded XOR:', decoded5.substring(0, 80));
      
      // Method 6: Try RC4 with WHAT header as key
      function rc4(key: string, data: string): string {
        const S = new Array(256);
        for (let i = 0; i < 256; i++) S[i] = i;
        
        let j = 0;
        for (let i = 0; i < 256; i++) {
          j = (j + S[i] + key.charCodeAt(i % key.length)) % 256;
          [S[i], S[j]] = [S[j], S[i]];
        }
        
        let result = '';
        let i = 0;
        j = 0;
        for (let k = 0; k < data.length; k++) {
          i = (i + 1) % 256;
          j = (j + S[i]) % 256;
          [S[i], S[j]] = [S[j], S[i]];
          const K = S[(S[i] + S[j]) % 256];
          result += String.fromCharCode(data.charCodeAt(k) ^ K);
        }
        
        return result;
      }
      
      const decoded6 = rc4(whatHeader, encodedData);
      console.log('RC4 with WHAT:', decoded6.substring(0, 80));
      
      const decoded7 = rc4(whatSuffix, encodedData);
      console.log('RC4 with WHAT[7:]:', decoded7.substring(0, 80));
    }
  }
}

analyzeResponse().catch(console.error);
