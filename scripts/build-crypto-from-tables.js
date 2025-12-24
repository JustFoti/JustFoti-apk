/**
 * Build animekai-crypto.ts from TABLES.TXT
 * Parses the tables file and generates the complete crypto implementation
 */

const fs = require('fs');
const path = require('path');

// Read TABLES.TXT
const tablesPath = path.join(__dirname, '..', 'TABLES.TXT');
const tablesContent = fs.readFileSync(tablesPath, 'utf8');

// Parse tables from the file
function parseTables(content) {
  const tables = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('```')) continue;
    
    // Match pattern: "N: {'0':0xXX, ...},"
    const match = trimmed.match(/^(\d+):\s*(\{.+\}),?\s*$/);
    if (match) {
      const tableNum = parseInt(match[1]);
      const tableStr = match[2];
      
      // Parse the table object
      try {
        // Convert Python-style dict to JS object
        // Replace single quotes with double quotes for JSON parsing
        // But we need to handle the hex values
        const entries = {};
        const entryRegex = /'([^']+)':\s*0x([0-9a-fA-F]+)/g;
        let entryMatch;
        while ((entryMatch = entryRegex.exec(tableStr)) !== null) {
          const char = entryMatch[1] === "\\'" ? "'" : 
                       entryMatch[1] === "\\\\" ? "\\" : entryMatch[1];
          entries[char] = parseInt(entryMatch[2], 16);
        }
        tables[tableNum] = entries;
      } catch (e) {
        console.error(`Error parsing table ${tableNum}:`, e.message);
      }
    }
  }
  
  return tables;
}

const tables = parseTables(tablesContent);
console.log(`Parsed ${Object.keys(tables).length} tables`);

// Generate the TypeScript file
function generateCryptoFile(tables) {
  const tableNums = Object.keys(tables).map(n => parseInt(n)).sort((a, b) => a - b);
  console.log(`Table range: ${tableNums[0]} to ${tableNums[tableNums.length - 1]}`);
  
  let output = `/**
 * AnimeKai Native Encryption/Decryption
 * 
 * Reverse engineered position-dependent substitution cipher.
 * Eliminates dependency on enc-dec.app for enc-kai/dec-kai endpoints.
 * 
 * Generated from TABLES.TXT with ${tableNums.length} substitution tables.
 */

// URL-safe Base64 functions
function urlSafeBase64Decode(str: string): Buffer {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return Buffer.from(padded, 'base64');
}

function urlSafeBase64Encode(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\\+/g, '-')
    .replace(/\\//g, '_')
    .replace(/=/g, '');
}

// Constants
const HEADER = Buffer.from('c509bdb497cbc06873ff412af12fd8007624c29faa', 'hex');
const HEADER_LEN = 21;

// Constant padding bytes in the cipher structure
const CONSTANT_BYTES: Record<number, number> = {
  1: 0xf2, 2: 0xdf, 3: 0x9b, 4: 0x9d, 5: 0x16, 6: 0xe5,
  8: 0x67, 9: 0xc9, 10: 0xdd,
  12: 0x9c,
  14: 0x29,
  16: 0x35,
  18: 0xc8,
};

// Map plaintext position to cipher position
function getCipherPosition(plainPos: number): number {
  if (plainPos === 0) return 0;
  if (plainPos === 1) return 7;
  if (plainPos === 2) return 11;
  if (plainPos === 3) return 13;
  if (plainPos === 4) return 15;
  if (plainPos === 5) return 17;
  if (plainPos === 6) return 19;
  return 20 + (plainPos - 7);
}

// Full substitution tables for all positions
const ENCRYPT_TABLES: Record<number, Record<string, number>> = {
`;

  // Add each table
  for (const tableNum of tableNums) {
    const table = tables[tableNum];
    const entries = Object.entries(table)
      .map(([char, val]) => {
        // Escape special characters for TypeScript string
        let escapedChar = char;
        if (char === "'") escapedChar = "\\'";
        else if (char === "\\") escapedChar = "\\\\";
        return `'${escapedChar}':0x${val.toString(16).padStart(2, '0')}`;
      })
      .join(',');
    output += `  ${tableNum}: {${entries}},\n`;
  }
  
  // Close the ENCRYPT_TABLES object
  output = output.trimEnd().slice(0, -1); // Remove trailing comma from last entry

  output += `};

// Build reverse lookup tables for decryption
const DECRYPT_TABLES: Record<number, Record<number, string>> = {};
for (const [pos, table] of Object.entries(ENCRYPT_TABLES)) {
  DECRYPT_TABLES[parseInt(pos)] = {};
  for (const [char, byte] of Object.entries(table)) {
    DECRYPT_TABLES[parseInt(pos)][byte as number] = char;
  }
}

/**
 * Encrypt a plaintext string using AnimeKai's cipher
 * 
 * Structure: HEADER (21 bytes) + ENCRYPTED_BLOCK (variable length)
 * The encrypted block contains:
 * - Constant padding bytes at fixed positions
 * - Encrypted characters at cipher positions (0, 7, 11, 13, 15, 17, 19, 20+)
 */
export function encryptAnimeKai(plaintext: string): string {
  // Calculate the size of the encrypted block (not including header)
  const maxCipherPos = getCipherPosition(plaintext.length - 1);
  const encryptedBlockLen = maxCipherPos + 1;
  
  // Total buffer: header + encrypted block
  const totalLen = HEADER_LEN + encryptedBlockLen;
  const cipher = Buffer.alloc(totalLen);
  
  // Copy header at the start
  HEADER.copy(cipher, 0);
  
  // Set constant bytes in the encrypted block (offset by HEADER_LEN)
  for (const [pos, val] of Object.entries(CONSTANT_BYTES)) {
    const p = parseInt(pos);
    if (p < encryptedBlockLen) {
      cipher[HEADER_LEN + p] = val;
    }
  }
  
  // Encrypt each character into the encrypted block (offset by HEADER_LEN)
  for (let i = 0; i < plaintext.length; i++) {
    const char = plaintext[i];
    const cipherPos = getCipherPosition(i);
    const table = ENCRYPT_TABLES[i];
    
    if (table && char in table) {
      cipher[HEADER_LEN + cipherPos] = table[char];
    } else {
      // Fallback: use space encoding or raw byte
      const fallbackTable = ENCRYPT_TABLES[i];
      cipher[HEADER_LEN + cipherPos] = fallbackTable ? (fallbackTable[' '] || char.charCodeAt(0)) : char.charCodeAt(0);
    }
  }
  
  return urlSafeBase64Encode(cipher);
}

/**
 * Decrypt an AnimeKai cipher string
 * 
 * Structure: HEADER (21 bytes) + ENCRYPTED_BLOCK (variable length)
 * The encrypted block contains characters at cipher positions (0, 7, 11, 13, 15, 17, 19, 20+)
 */
export function decryptAnimeKai(ciphertext: string): string {
  const cipher = urlSafeBase64Decode(ciphertext);
  
  // Check if we have a header
  const hasHeader = cipher.length > HEADER_LEN;
  const dataOffset = hasHeader ? HEADER_LEN : 0;
  const dataLen = cipher.length - dataOffset;
  
  // Calculate plaintext length from the encrypted block length
  // Positions 0-6 map to cipher positions 0,7,11,13,15,17,19
  // Position 7+ maps to cipher position 20+
  let plaintextLen = 0;
  
  if (dataLen > 20) {
    plaintextLen = 7 + (dataLen - 20);
  } else if (dataLen > 19) {
    plaintextLen = 7;
  } else if (dataLen > 17) {
    plaintextLen = 6;
  } else if (dataLen > 15) {
    plaintextLen = 5;
  } else if (dataLen > 13) {
    plaintextLen = 4;
  } else if (dataLen > 11) {
    plaintextLen = 3;
  } else if (dataLen > 7) {
    plaintextLen = 2;
  } else if (dataLen > 0) {
    plaintextLen = 1;
  }
  
  let plaintext = '';
  
  for (let i = 0; i < plaintextLen; i++) {
    const cipherPos = getCipherPosition(i);
    const actualPos = dataOffset + cipherPos;
    if (actualPos >= cipher.length) break;
    
    const byte = cipher[actualPos];
    const table = DECRYPT_TABLES[i];
    
    if (table && byte in table) {
      plaintext += table[byte];
    } else {
      // Fallback: try to find in any table or use raw char
      plaintext += String.fromCharCode(byte);
    }
  }
  
  return plaintext;
}

// Export for testing
export { ENCRYPT_TABLES, DECRYPT_TABLES };
`;

  return output;
}

const cryptoContent = generateCryptoFile(tables);

// Write the output file
const outputPath = path.join(__dirname, '..', 'app', 'lib', 'animekai-crypto.ts');
fs.writeFileSync(outputPath, cryptoContent);
console.log(`Written to ${outputPath}`);
console.log(`File size: ${(cryptoContent.length / 1024).toFixed(1)} KB`);
