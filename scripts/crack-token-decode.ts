#!/usr/bin/env bun
/**
 * Analyze the token decoding
 * 
 * From the capture:
 * - WHAT header: ISEEYOUehpqObJUyTJSLpHoyxdinLxuj (32 chars)
 * - Token in URL: EVDGYtuWqdDJItznseLbIKZMzmlarinF (32 chars)
 * - Response bytes: 10,132,1,121,73,71,73,55,98,94,72,63,117,37,34,95,103,68,33,97,95,43,99,102,100,72,118,69,122,73,42,72,113,61,101,70,70,67,102,52,69,56,94,33,33,115,67,63,70,69
 * 
 * The protobuf structure:
 * - 10 = field 1, wire type 2 (length-delimited)
 * - 132,1 = varint length (132 + 1*128 = 260? No, it's 132 in varint = 132)
 * - Actually 132 = 0x84 = 0b10000100, so it's 4 + (1 << 7) = 132
 * - Next byte is 1, so length = 4 + (1 << 7) = 132
 * 
 * Wait, let me recalculate:
 * - 132 = 0x84 = 0b10000100 (MSB set, so continue)
 * - 1 = 0x01 = 0b00000001 (MSB not set, so stop)
 * - Length = (132 & 0x7F) | ((1 & 0x7F) << 7) = 4 | (1 << 7) = 4 + 128 = 132
 * 
 * So the data starts at byte 3 (after 10, 132, 1)
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

async function fetchAndAnalyze() {
  const source = 'alpha';
  const id = 'nba-tv-1';
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

  const whatHeader = response.headers.get('what')!;
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  console.log('WHAT header:', whatHeader);
  console.log('WHAT length:', whatHeader.length);
  console.log('Response bytes:', Array.from(bytes));
  console.log('Response length:', bytes.length);
  
  // Parse protobuf
  // Field 1, wire type 2 (length-delimited)
  // Byte 0: 0x0a = field 1, wire type 2
  // Bytes 1-2: varint length
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
  
  console.log('\nProtobuf parsing:');
  console.log('  Field tag:', bytes[0]);
  console.log('  Length varint ends at:', idx);
  console.log('  Data length:', length);
  console.log('  Data starts at:', idx);
  
  const data = bytes.slice(idx, idx + length);
  const dataStr = new TextDecoder().decode(data);
  
  console.log('\nEncoded data:');
  console.log('  Bytes:', Array.from(data.slice(0, 50)));
  console.log('  String:', dataStr.substring(0, 100));
  console.log('  Length:', data.length);
  
  // The expected URL format:
  // https://lb{N}.strmd.top/secure/{token}/{source}/stream/{id}/{streamNo}/playlist.m3u8
  const expectedUrl = `https://lb1.strmd.top/secure/`;
  
  console.log('\n=== Analyzing encoding ===');
  console.log('Expected URL prefix:', expectedUrl);
  
  // Derive the XOR key from known plaintext
  const derivedKey: number[] = [];
  for (let i = 0; i < expectedUrl.length; i++) {
    derivedKey.push(data[i] ^ expectedUrl.charCodeAt(i));
  }
  
  console.log('\nDerived key from known plaintext:');
  console.log('  Bytes:', derivedKey);
  console.log('  Chars:', derivedKey.map(b => String.fromCharCode(b)).join(''));
  
  // Compare with WHAT header
  console.log('\nComparing derived key with WHAT header:');
  const whatBytes = Array.from(whatHeader).map(c => c.charCodeAt(0));
  console.log('  WHAT bytes:', whatBytes);
  
  // Check if derived key = WHAT XOR something
  console.log('\n  XOR between derived key and WHAT:');
  for (let i = 0; i < Math.min(derivedKey.length, whatHeader.length); i++) {
    const xor = derivedKey[i] ^ whatBytes[i];
    console.log(`    [${i}] derived=${derivedKey[i]} WHAT=${whatBytes[i]} XOR=${xor} (${String.fromCharCode(xor)})`);
  }
  
  // The XOR values might form a pattern
  const xorValues = derivedKey.map((d, i) => d ^ whatBytes[i % whatBytes.length]);
  console.log('\n  XOR values:', xorValues);
  
  // Check if XOR values are sequential or have a pattern
  console.log('\n  Checking for patterns in XOR values:');
  console.log('    Differences:', xorValues.slice(1).map((v, i) => v - xorValues[i]));
  
  // Try: the key might be WHAT header with each byte XOR'd with its position
  console.log('\n=== Trying position-based transformations ===');
  
  for (let formula = 0; formula < 10; formula++) {
    let decoded = '';
    for (let i = 0; i < data.length; i++) {
      let key: number;
      switch (formula) {
        case 0: key = whatBytes[i % whatBytes.length] ^ i; break;
        case 1: key = whatBytes[i % whatBytes.length] ^ (i * 2); break;
        case 2: key = whatBytes[i % whatBytes.length] ^ (i % 256); break;
        case 3: key = whatBytes[(i + 7) % whatBytes.length]; break;
        case 4: key = whatBytes[(whatBytes.length - 1 - i % whatBytes.length)]; break;
        case 5: key = whatBytes[i % whatBytes.length] + i; break;
        case 6: key = whatBytes[i % whatBytes.length] - i; break;
        case 7: key = (whatBytes[i % whatBytes.length] * (i + 1)) % 256; break;
        case 8: key = whatBytes[i % whatBytes.length] ^ whatBytes[(i + 1) % whatBytes.length]; break;
        case 9: key = whatBytes[i % whatBytes.length] ^ (i & 0xFF); break;
        default: key = whatBytes[i % whatBytes.length];
      }
      decoded += String.fromCharCode(data[i] ^ (key & 0xFF));
    }
    if (decoded.startsWith('https://lb')) {
      console.log(`Formula ${formula}: SUCCESS!`);
      console.log(`  URL: ${decoded}`);
      return decoded;
    } else {
      console.log(`Formula ${formula}: ${decoded.substring(0, 30)}`);
    }
  }
  
  // Try: the encoding might use a different algorithm entirely
  // Let's check if the data is base64 encoded first
  console.log('\n=== Checking for base64 ===');
  try {
    const base64Decoded = atob(dataStr);
    console.log('Base64 decoded:', base64Decoded.substring(0, 50));
    
    // Try XOR with WHAT header on base64 decoded
    let decoded = '';
    for (let i = 0; i < base64Decoded.length; i++) {
      decoded += String.fromCharCode(base64Decoded.charCodeAt(i) ^ whatBytes[i % whatBytes.length]);
    }
    console.log('Base64 + XOR:', decoded.substring(0, 50));
  } catch (e) {
    console.log('Not valid base64');
  }
  
  // The key insight: the token in the URL is 32 chars, same as WHAT header
  // Maybe the token IS derived from WHAT header somehow
  console.log('\n=== Analyzing token vs WHAT header ===');
  
  // From the capture, the token was: EVDGYtuWqdDJItznseLbIKZMzmlarinF
  // And WHAT was: ISEEYOUehpqObJUyTJSLpHoyxdinLxuj
  
  // Let's see if there's a simple transformation
  const sampleToken = 'EVDGYtuWqdDJItznseLbIKZMzmlarinF';
  const sampleWhat = 'ISEEYOUehpqObJUyTJSLpHoyxdinLxuj';
  
  console.log('Sample token:', sampleToken);
  console.log('Sample WHAT:', sampleWhat);
  
  // XOR between token and WHAT
  console.log('\nToken XOR WHAT:');
  for (let i = 0; i < sampleToken.length; i++) {
    const xor = sampleToken.charCodeAt(i) ^ sampleWhat.charCodeAt(i);
    console.log(`  [${i}] token=${sampleToken.charCodeAt(i)} (${sampleToken[i]}) WHAT=${sampleWhat.charCodeAt(i)} (${sampleWhat[i]}) XOR=${xor} (${String.fromCharCode(xor)})`);
  }
  
  return null;
}

fetchAndAnalyze().catch(console.error);
