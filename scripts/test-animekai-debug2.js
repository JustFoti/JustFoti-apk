/**
 * Debug test for AnimeKai native encryption - detailed
 */

async function main() {
  const { encryptAnimeKai, decryptAnimeKai, ENCRYPT_TABLES, DECRYPT_TABLES } = await import('../app/lib/animekai-crypto.ts');
  
  console.log('=== ANIMEKAI DETAILED DEBUG ===\n');
  
  // Test with known kai_id
  const kaiId = 'c4S88Q';
  console.log(`Input: "${kaiId}" (length: ${kaiId.length})`);
  
  // Show character-by-character encryption
  console.log('\n--- Character-by-character encryption ---');
  for (let i = 0; i < kaiId.length; i++) {
    const char = kaiId[i];
    const table = ENCRYPT_TABLES[i];
    const encrypted = table ? table[char] : null;
    console.log(`  [${i}] '${char}' -> 0x${encrypted?.toString(16).padStart(2, '0') || 'N/A'}`);
  }
  
  // Encrypt
  const encrypted = encryptAnimeKai(kaiId);
  console.log(`\nEncrypted: ${encrypted}`);
  
  // Decode the encrypted base64 to see raw bytes
  const base64 = encrypted.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const buffer = Buffer.from(padded, 'base64');
  console.log(`Raw bytes (${buffer.length}): ${Array.from(buffer).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
  
  // Try to decrypt
  const decrypted = decryptAnimeKai(encrypted);
  console.log(`\nDecrypted: "${decrypted}" (length: ${decrypted?.length})`);
  
  // Show character-by-character decryption
  console.log('\n--- Character-by-character decryption ---');
  const cipherPositions = [0, 7, 11, 13, 15, 17, 19];
  for (let i = 0; i < 6; i++) {
    const cipherPos = cipherPositions[i];
    const byte = buffer[cipherPos];
    const table = DECRYPT_TABLES[i];
    const decryptedChar = table ? table[byte] : null;
    console.log(`  [${i}] pos ${cipherPos} byte 0x${byte?.toString(16).padStart(2, '0')} -> '${decryptedChar || 'N/A'}'`);
  }
  
  // Check if tables have the right mappings
  console.log('\n--- Table verification ---');
  for (let i = 0; i < kaiId.length; i++) {
    const char = kaiId[i];
    const encTable = ENCRYPT_TABLES[i];
    const decTable = DECRYPT_TABLES[i];
    
    if (encTable && encTable[char] !== undefined) {
      const encByte = encTable[char];
      const decChar = decTable ? decTable[encByte] : null;
      const match = decChar === char;
      console.log(`  [${i}] '${char}' -> 0x${encByte.toString(16).padStart(2, '0')} -> '${decChar}' ${match ? '✓' : '✗'}`);
    } else {
      console.log(`  [${i}] '${char}' -> NOT IN TABLE`);
    }
  }
}

main().catch(console.error);
