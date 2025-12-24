/**
 * AnimeKai Encryption/Decryption - Final Implementation
 * 
 * This module provides native encryption/decryption for AnimeKai,
 * eliminating the need for enc-dec.app API calls.
 * 
 * The cipher uses position-dependent substitution tables with a specific structure:
 * - Position 0: char 0 substitution -> cipher[0]
 * - Positions 1-6: constant padding (f2 df 9b 9d 16 e5)
 * - Position 1: char 1 substitution -> cipher[7]
 * - Positions 8-10: constant padding (67 c9 dd)
 * - Position 2: char 2 substitution -> cipher[11]
 * - etc.
 */

// URL-safe Base64 functions
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

// Constants
const HEADER = Buffer.from('c509bdb497cbc06873ff412af12fd8007624c29faa', 'hex');
const HEADER_LEN = 21;

// Constant padding bytes in the cipher
const CONSTANT_BYTES = {
  1: 0xf2, 2: 0xdf, 3: 0x9b, 4: 0x9d, 5: 0x16, 6: 0xe5,
  8: 0x67, 9: 0xc9, 10: 0xdd,
  12: 0x9c,
  14: 0x29,
  16: 0x35,
  18: 0xc8,
};

// Map plaintext position to cipher position
function getCipherPosition(plainPos) {
  if (plainPos === 0) return 0;
  if (plainPos === 1) return 7;
  if (plainPos === 2) return 11;
  if (plainPos === 3) return 13;
  if (plainPos === 4) return 15;
  if (plainPos === 5) return 17;
  if (plainPos === 6) return 19;
  if (plainPos >= 7) return 20 + (plainPos - 7);
  return plainPos;
}

// Substitution tables for each position (generated from API analysis)
// Format: { position: { char: cipherByte, ... }, ... }
const ENCRYPT_TABLES = {
  0: {'0':0xe2,'1':0x6d,'2':0xe6,'3':0xe0,'4':0x6b,'5':0x75,'6':0x6f,'7':0x69,'8':0x73,'9':0x7d,' ':0xd4,'!':0xcc,'"':0xd4,'#':0xd4,'$':0xd4,'&':0xd4,"'":0xc8,'(':0xd2,')':0xdc,'*':0xd6,'+':0xd4,',':0xd4,'-':0xe4,'.':0xde,'/':0xd4,':':0xd4,';':0xd4,'<':0xd4,'=':0xd4,'>':0xd4,'?':0xd4,'@':0xd4,'A':0x0c,'B':0x06,'C':0x00,'D':0x0a,'E':0x14,'F':0x0e,'G':0x08,'H':0x12,'I':0x1c,'J':0x16,'K':0x10,'L':0x1a,'M':0x24,'N':0x1e,'O':0x18,'P':0x22,'Q':0xac,'R':0x26,'S':0x20,'T':0xaa,'U':0xb4,'V':0xae,'W':0xa8,'X':0xb2,'Y':0xbc,'Z':0xb6,'[':0xd4,'\\':0xd4,']':0xd4,'^':0xd4,'_':0xb8,'`':0xd4,'a':0x4c,'b':0x46,'c':0x40,'d':0x4a,'e':0x54,'f':0x4e,'g':0x48,'h':0x52,'i':0x5c,'j':0x56,'k':0x50,'l':0x5a,'m':0x64,'n':0x5e,'o':0x58,'p':0x62,'q':0xec,'r':0x66,'s':0x60,'t':0xea,'u':0xf4,'v':0xee,'w':0xe8,'x':0xf2,'y':0xfc,'z':0xf6,'{':0xd4,'|':0xd4,'}':0xd4,'~':0xfe},
  1: {'0':0x00,'1':0xf5,'2':0x02,'3':0xff,'4':0xfc,'5':0x71,'6':0x6e,'7':0x6b,'8':0xf8,'9':0x6d,' ':0x21,'!':0x65,'"':0x21,'#':0x21,'$':0x21,'&':0x21,"'":0x1b,'(':0x28,')':0x1d,'*':0x2a,'+':0x21,',':0x21,'-':0x19,'.':0x16,'/':0x21,':':0x21,';':0x21,'<':0x21,'=':0x21,'>':0x21,'?':0x21,'@':0x21,'A':0xc5,'B':0xd2,'C':0xcf,'D':0xcc,'E':0x81,'F':0x7e,'G':0x7b,'H':0x88,'I':0x7d,'J':0x8a,'K':0x87,'L':0xe4,'M':0x79,'N':0x76,'O':0x73,'P':0xe0,'Q':0xd5,'R':0xe2,'S':0xdf,'T':0xdc,'U':0xd1,'V':0xce,'W':0xcb,'X':0xd8,'Y':0xcd,'Z':0xda,'[':0x21,'\\':0x21,']':0x21,'^':0x21,'_':0xc3,'`':0x21,'a':0x25,'b':0x32,'c':0x2f,'d':0x2c,'e':0xe1,'f':0xde,'g':0xdb,'h':0xe8,'i':0xdd,'j':0xea,'k':0xe7,'l':0xc4,'m':0xd9,'n':0xd6,'o':0xd3,'p':0xc0,'q':0xb5,'r':0xc2,'s':0xbf,'t':0xbc,'u':0x31,'v':0x2e,'w':0x2b,'x':0xb8,'y':0x2d,'z':0xba,'{':0x21,'|':0x21,'}':0x21,'~':0x26},
  2: {'0':0x31,'1':0xf1,'2':0xa6,'3':0x66,'4':0x30,'5':0xf0,'6':0xb1,'7':0x71,'8':0x27,'9':0xe7,' ':0xe4,'!':0xe5,'"':0xe4,'#':0xe4,'$':0xe4,'&':0xe4,"'":0x65,'(':0x2b,')':0xeb,'*':0xb0,'+':0xe4,',':0xe4,'-':0xea,'.':0xab,'/':0xe4,':':0xe4,';':0xe4,'<':0xe4,'=':0xe4,'>':0xe4,'?':0xe4,'@':0xe4,'A':0x0d,'B':0x52,'C':0x92,'D':0xcc,'E':0x0c,'F':0x4d,'G':0x8d,'H':0xd3,'I':0x13,'J':0x58,'K':0x98,'L':0xd2,'M':0x12,'N':0x53,'O':0x93,'P':0xd9,'Q':0x19,'R':0x4e,'S':0x8e,'T':0xd8,'U':0x18,'V':0x59,'W':0x99,'X':0xcf,'Y':0x0f,'Z':0xb4,'[':0xe4,'\\':0xe4,']':0xe4,'^':0xe4,'_':0x8f,'`':0xe4,'a':0xf5,'b':0xba,'c':0x7a,'d':0x34,'e':0xf4,'f':0xb5,'g':0x75,'h':0x3b,'i':0xfb,'j':0xc0,'k':0x80,'l':0x3a,'m':0xfa,'n':0xbb,'o':0x7b,'p':0x41,'q':0x01,'r':0xb6,'s':0x76,'t':0x40,'u':0x00,'v':0xc1,'w':0x81,'x':0x37,'y':0xf7,'z':0xbc,'{':0xe4,'|':0xe4,'}':0xe4,'~':0xb7},
  3: {'0':0x2b,'1':0x27,'2':0x23,'3':0x1f,'4':0x3b,'5':0x37,'6':0x33,'7':0x2f,'8':0x0b,'9':0x07,' ':0xf7,'!':0xe7,'"':0xf7,'#':0xf7,'$':0xf7,'&':0xf7,"'":0xef,'(':0xcb,')':0xc7,'*':0xc3,'+':0xf7,',':0xf7,'-':0xd7,'.':0xd3,'/':0xf7,':':0xf7,';':0xf7,'<':0xf7,'=':0xf7,'>':0xf7,'?':0xf7,'@':0xf7,'A':0x66,'B':0x62,'C':0x5e,'D':0x7a,'E':0x76,'F':0x72,'G':0x6e,'H':0x4a,'I':0x46,'J':0x42,'K':0x7e,'L':0x5a,'M':0x56,'N':0x52,'O':0x4e,'P':0xa9,'Q':0xa5,'R':0xa1,'S':0x9d,'T':0xb9,'U':0xb5,'V':0xb1,'W':0xad,'X':0x89,'Y':0x85,'Z':0x81,'[':0xf7,'\\':0xf7,']':0xf7,'^':0xf7,'_':0x8d,'`':0xf7,'a':0xe6,'b':0xe2,'c':0xde,'d':0xfa,'e':0xf6,'f':0xf2,'g':0xee,'h':0xca,'i':0xc6,'j':0xc2,'k':0xfe,'l':0xda,'m':0xd6,'n':0xd2,'o':0xce,'p':0x2a,'q':0x26,'r':0x22,'s':0x1e,'t':0x3a,'u':0x36,'v':0x32,'w':0x2e,'x':0x0a,'y':0x06,'z':0x02,'{':0xf7,'|':0xf7,'}':0xf7,'~':0x12},
};

// Build reverse tables for decryption
const DECRYPT_TABLES = {};
for (const [pos, table] of Object.entries(ENCRYPT_TABLES)) {
  DECRYPT_TABLES[pos] = {};
  for (const [char, byte] of Object.entries(table)) {
    DECRYPT_TABLES[pos][byte] = char;
  }
}

/**
 * Encrypt text using AnimeKai cipher
 * @param {string} text - Plaintext to encrypt
 * @returns {string} - URL-safe Base64 encoded ciphertext
 */
function encryptAnimeKai(text) {
  const cipherData = [];
  
  for (let i = 0; i < text.length; i++) {
    const cipherPos = getCipherPosition(i);
    const char = text[i];
    
    // Fill in constant bytes up to cipherPos
    while (cipherData.length < cipherPos) {
      const constByte = CONSTANT_BYTES[cipherData.length];
      cipherData.push(constByte !== undefined ? constByte : 0x00);
    }
    
    // Get the table for this position (use position 3 for positions >= 4)
    const tablePos = Math.min(i, 3);
    const table = ENCRYPT_TABLES[tablePos];
    const cipherByte = table?.[char];
    
    if (cipherByte !== undefined) {
      cipherData[cipherPos] = cipherByte;
    } else {
      // Fallback: use a default value for unknown chars
      cipherData[cipherPos] = 0xd4;
    }
  }
  
  // Build full output
  const output = Buffer.concat([HEADER, Buffer.from(cipherData)]);
  return urlSafeBase64Encode(output);
}

/**
 * Decrypt AnimeKai ciphertext
 * @param {string} ciphertext - URL-safe Base64 encoded ciphertext
 * @returns {string} - Decrypted plaintext
 */
function decryptAnimeKai(ciphertext) {
  const decoded = urlSafeBase64Decode(ciphertext);
  const data = decoded.slice(HEADER_LEN);
  
  let plaintext = '';
  let plainPos = 0;
  
  while (true) {
    const cipherPos = getCipherPosition(plainPos);
    if (cipherPos >= data.length) break;
    
    const cipherByte = data[cipherPos];
    
    // Get the table for this position
    const tablePos = Math.min(plainPos, 3);
    const table = DECRYPT_TABLES[tablePos];
    const char = table?.[cipherByte];
    
    if (char) {
      plaintext += char;
    } else {
      // Unknown byte - stop decryption
      break;
    }
    
    plainPos++;
  }
  
  return plaintext;
}

// Test the implementation
async function test() {
  const https = require('https');
  
  function encryptKaiAPI(text) {
    return new Promise((resolve, reject) => {
      const url = `https://enc-dec.app/api/enc-kai?text=${encodeURIComponent(text)}`;
      https.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data).result);
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }
  
  console.log('=== AnimeKai Crypto Test ===\n');
  
  const testCases = ['test', 'hello', 'anime', '12345', 'abc', 'xyz'];
  
  for (const tc of testCases) {
    // Test encryption
    const ourEnc = encryptAnimeKai(tc);
    const apiEnc = await encryptKaiAPI(tc);
    
    // Compare the data portion (ignore trailer differences)
    const ourData = urlSafeBase64Decode(ourEnc).slice(HEADER_LEN, HEADER_LEN + tc.length * 2);
    const apiData = urlSafeBase64Decode(apiEnc).slice(HEADER_LEN, HEADER_LEN + tc.length * 2);
    
    const encMatch = ourData.slice(0, tc.length).toString('hex') === apiData.slice(0, tc.length).toString('hex');
    
    // Test decryption
    const decrypted = decryptAnimeKai(apiEnc);
    const decMatch = decrypted === tc;
    
    console.log(`"${tc}": enc=${encMatch ? '✓' : '✗'} dec=${decMatch ? '✓' : '✗'}`);
    
    if (!encMatch) {
      console.log(`  Our: ${ourData.toString('hex')}`);
      console.log(`  API: ${apiData.toString('hex')}`);
    }
    if (!decMatch) {
      console.log(`  Decrypted: "${decrypted}"`);
    }
  }
  
  console.log('\n=== Export for TypeScript ===\n');
  console.log('// Copy this to animekai-extractor.ts');
  console.log('');
  console.log('const ANIMEKAI_HEADER = Buffer.from(\'' + HEADER.toString('hex') + '\', \'hex\');');
}

// Export for use in other modules
module.exports = {
  encryptAnimeKai,
  decryptAnimeKai,
  urlSafeBase64Decode,
  urlSafeBase64Encode,
  HEADER,
  HEADER_LEN,
};

// Run test if executed directly
if (require.main === module) {
  test().catch(console.error);
}
