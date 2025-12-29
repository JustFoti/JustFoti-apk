#!/usr/bin/env bun
/**
 * Implement the base91-like decoding from the obfuscated setStream function
 * 
 * From the code, the alphabet is something like:
 * "KfZ&S[`>W^|3/R:(h<XD;@Gs)4^Ee:`9<f=`E^J~AEx6uG4^bA2ad}sD`yI?^5<zAa=)6b%C9;<2Zxw!%5+H"
 * 
 * The decoding algorithm from the obfuscated code:
 * - Uses indexOf to find character position in alphabet
 * - Accumulates bits using shifts
 * - Outputs bytes when enough bits accumulated
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

/**
 * Base91-like decode from the obfuscated code
 * The algorithm accumulates bits and outputs bytes
 */
function base91Decode(input: string, alphabet: string): Uint8Array {
  const result: number[] = [];
  let acc = 0;
  let bits = 0;
  let v = -1;
  
  for (let i = 0; i < input.length; i++) {
    const p = alphabet.indexOf(input[i]);
    if (p === -1) continue;
    
    if (v < 0) {
      v = p;
    } else {
      v += p * 91;
      acc |= v << bits;
      // The condition (v & 8191) > 88 determines if we add 13 or 14 bits
      bits += (v & 8191) > 88 ? 13 : 14;
      
      do {
        result.push(acc & 255);
        acc >>= 8;
        bits -= 8;
      } while (bits > 7);
      
      v = -1;
    }
  }
  
  if (v > -1) {
    result.push((acc | v << bits) & 255);
  }
  
  return new Uint8Array(result);
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
  
  return { what, encoded };
}

async function main() {
  const source = 'alpha';
  const id = 'nba-tv-1';
  const streamNo = '1';
  
  console.log('Fetching data...\n');
  const { what, encoded } = await fetchData(source, id, streamNo);
  
  console.log('WHAT header:', what);
  console.log('Encoded data:', encoded);
  console.log('Encoded length:', encoded.length);
  
  // From the obfuscated code, there are multiple alphabets used
  // Let me extract them from the captured setStream function
  const alphabets = [
    // From vir8fbO[0x80] in the captured code
    'KfZ&S[`>W^|3/R:(h<XD;@Gs)4^Ee:`9<f=`E^J~AEx6uG4^bA2ad}sD`yI?^5<zAa=)6b%C9;<2Zxw!%5+H',
    // Standard base91
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~"',
    // Another variant from the code
    'AM6}P_)=|[p@<:]/Z?K.,9*+;a8`1^xJOvU{~>"5IlugeqEoG4jz#fkVcsX3BFrYR0Cb7d!SDweW2nimhTyHQNt$%&(',
  ];
  
  console.log('\n=== Trying base91 decode with different alphabets ===\n');
  
  for (let i = 0; i < alphabets.length; i++) {
    const alphabet = alphabets[i];
    console.log(`\nAlphabet ${i + 1}: ${alphabet.substring(0, 30)}...`);
    
    try {
      const decoded = base91Decode(encoded, alphabet);
      console.log(`Decoded length: ${decoded.length}`);
      console.log(`Decoded bytes (first 30): ${Array.from(decoded.slice(0, 30))}`);
      
      const decodedStr = new TextDecoder().decode(decoded);
      console.log(`As string: ${decodedStr.substring(0, 80)}`);
      
      // Check if it looks like a URL or can be XOR'd with WHAT to get URL
      if (decodedStr.includes('http') || decodedStr.includes('strmd')) {
        console.log('>>> Found URL directly!');
        continue;
      }
      
      // Try XOR with WHAT
      const whatBytes = what.split('').map(c => c.charCodeAt(0));
      let xorResult = '';
      for (let j = 0; j < decoded.length; j++) {
        xorResult += String.fromCharCode(decoded[j] ^ whatBytes[j % 32]);
      }
      console.log(`XOR with WHAT: ${xorResult.substring(0, 80)}`);
      
      if (xorResult.includes('http') || xorResult.includes('strmd')) {
        console.log('>>> Found URL after XOR with WHAT!');
      }
    } catch (e) {
      console.log(`Error: ${(e as Error).message}`);
    }
  }
  
  // Let's also try to figure out the alphabet from the encoded data
  console.log('\n=== Analyzing encoded data characters ===\n');
  
  const charSet = new Set(encoded.split(''));
  const sortedChars = [...charSet].sort();
  console.log(`Unique characters (${charSet.size}): ${sortedChars.join('')}`);
  
  // The encoded data uses these characters, so the alphabet must contain them
  // Let's build a potential alphabet from printable ASCII
  const printableAscii = [];
  for (let i = 33; i <= 126; i++) {
    printableAscii.push(String.fromCharCode(i));
  }
  console.log(`Printable ASCII: ${printableAscii.join('')}`);
  
  // Check which printable chars are NOT in the encoded data
  const notUsed = printableAscii.filter(c => !charSet.has(c));
  console.log(`Not used in encoded: ${notUsed.join('')}`);
}

main().catch(console.error);
