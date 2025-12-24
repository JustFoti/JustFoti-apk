/**
 * Test native decryption with extended tables
 * Standalone version that doesn't require TypeScript
 */
const https = require('https');
const fs = require('fs');

// Read the crypto file and extract the tables
const cryptoFile = fs.readFileSync('app/lib/animekai-crypto.ts', 'utf8');

// Extract ENCRYPT_TABLES
const tablesMatch = cryptoFile.match(/const ENCRYPT_TABLES[^=]*=\s*(\{[\s\S]*?\n\};)/);
if (!tablesMatch) {
  console.error('Could not extract ENCRYPT_TABLES');
  process.exit(1);
}

// Evaluate the tables (they're valid JS object syntax)
let ENCRYPT_TABLES;
try {
  eval('ENCRYPT_TABLES = ' + tablesMatch[1]);
} catch (e) {
  console.error('Could not parse tables:', e.message);
  process.exit(1);
}

console.log('Loaded tables for positions:', Object.keys(ENCRYPT_TABLES).length);

// Build decrypt tables
const DECRYPT_TABLES = {};
for (const [pos, table] of Object.entries(ENCRYPT_TABLES)) {
  DECRYPT_TABLES[Number(pos)] = {};
  for (const [char, byte] of Object.entries(table)) {
    DECRYPT_TABLES[Number(pos)][byte] = char;
  }
}

// Constants
const HEADER = Buffer.from('c509bdb497cbc06873ff412af12fd8007624c29faa', 'hex');
const HEADER_LEN = 21;

function urlSafeBase64Decode(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return Buffer.from(padded, 'base64');
}

function urlSafeBase64Encode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function getCipherPosition(plainPos) {
  if (plainPos === 0) return 0;
  if (plainPos === 1) return 7;
  if (plainPos === 2) return 11;
  if (plainPos === 3) return 13;
  if (plainPos === 4) return 15;
  if (plainPos === 5) return 17;
  if (plainPos === 6) return 19;
  return 20 + (plainPos - 7);
}


const CONSTANT_BYTES = {
  1: 0xf2, 2: 0xdf, 3: 0x9b, 4: 0x9d, 5: 0x16, 6: 0xe5,
  8: 0x67, 9: 0xc9, 10: 0xdd, 12: 0x9c, 14: 0x29, 16: 0x35, 18: 0xc8,
};

function encryptAnimeKai(text) {
  const cipherData = [];
  for (let i = 0; i < text.length; i++) {
    const cipherPos = getCipherPosition(i);
    const char = text[i];
    while (cipherData.length < cipherPos) {
      const constByte = CONSTANT_BYTES[cipherData.length];
      cipherData.push(constByte !== undefined ? constByte : 0x00);
    }
    const tablePos = i;
    const table = ENCRYPT_TABLES[tablePos];
    const cipherByte = table?.[char];
    if (cipherByte !== undefined) {
      cipherData[cipherPos] = cipherByte;
    } else {
      cipherData[cipherPos] = 0xd4;
    }
  }
  const output = Buffer.concat([HEADER, Buffer.from(cipherData)]);
  return urlSafeBase64Encode(output);
}

function decryptAnimeKai(ciphertext) {
  const decoded = urlSafeBase64Decode(ciphertext);
  const data = Buffer.from(decoded.subarray(HEADER_LEN));
  let plaintext = '';
  let plainPos = 0;
  while (true) {
    const cipherPos = getCipherPosition(plainPos);
    if (cipherPos >= data.length) break;
    const cipherByte = data[cipherPos];
    const tablePos = plainPos;
    const table = DECRYPT_TABLES[tablePos];
    const char = table?.[cipherByte];
    if (char) {
      plaintext += char;
    } else {
      break;
    }
    plainPos++;
  }
  return plaintext;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}


async function main() {
  console.log('Testing native AnimeKai decryption with extended tables...\n');
  
  // Test with a real anime
  const kaiId = 'c4S88Q'; // One Piece
  console.log('1. Testing encryption of kai_id:', kaiId);
  const encKaiId = encryptAnimeKai(kaiId);
  console.log('   Encrypted:', encKaiId.substring(0, 50) + '...');
  
  // Get episodes
  console.log('\n2. Fetching episodes...');
  const episodes = await fetchJson(`https://animekai.to/ajax/episodes/list?ani_id=${kaiId}&_=${encKaiId}`);
  const tokenMatch = episodes.result.match(/token="([^"]+)"/);
  if (!tokenMatch) {
    console.error('   No token found in episodes response');
    return;
  }
  const token = tokenMatch[1];
  console.log('   Token:', token.substring(0, 30) + '...');
  
  // Get servers
  console.log('\n3. Fetching servers...');
  const encToken = encryptAnimeKai(token);
  const servers = await fetchJson(`https://animekai.to/ajax/links/list?token=${token}&_=${encToken}`);
  const lidMatch = servers.result.match(/data-lid="([^"]+)"/);
  if (!lidMatch) {
    console.error('   No lid found in servers response');
    return;
  }
  const lid = lidMatch[1];
  console.log('   LID:', lid.substring(0, 30) + '...');
  
  // Get embed
  console.log('\n4. Fetching embed...');
  const encLid = encryptAnimeKai(lid);
  const embed = await fetchJson(`https://animekai.to/ajax/links/view?id=${lid}&_=${encLid}`);
  console.log('   Encrypted embed result length:', embed.result.length);
  
  // Decrypt with our native implementation
  console.log('\n5. Decrypting with native implementation...');
  let decrypted = decryptAnimeKai(embed.result);
  console.log('   Raw decrypted length:', decrypted.length);
  console.log('   Raw decrypted:', decrypted.substring(0, 100));
  
  // Decode }XX format
  decrypted = decrypted.replace(/}([0-9A-Fa-f]{2})/g, (_, hex) => 
    String.fromCharCode(parseInt(hex, 16))
  );
  console.log('\n   After }XX decode:', decrypted.substring(0, 150));
  
  // Try to parse as JSON
  console.log('\n6. Parsing decrypted JSON...');
  try {
    const parsed = JSON.parse(decrypted);
    console.log('   ✓ Valid JSON!');
    console.log('   URL:', parsed.url);
    console.log('   Skip:', JSON.stringify(parsed.skip));
    console.log('\n✓✓✓ NATIVE DECRYPTION WORKING! No enc-dec.app needed! ✓✓✓');
  } catch (e) {
    console.log('   JSON parse error:', e.message);
    console.log('   Decrypted so far:', decrypted);
    console.log('\n   Need more tables or there is a decryption issue');
  }
}

main().catch(console.error);
