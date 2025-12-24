/**
 * Analyze the encryption structure
 */

async function main() {
  // API result for "c4S88Q"
  const apiResult = 'xQm9tJfLwGhz_0Eq8S_YAHYkwp-qQPLfm50W5fxnyd2OnAspzTW2';
  
  // Decode
  const base64 = apiResult.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const buffer = Buffer.from(padded, 'base64');
  
  console.log('API result bytes:');
  console.log(`Total length: ${buffer.length}`);
  
  // Print in groups
  for (let i = 0; i < buffer.length; i += 10) {
    const slice = buffer.slice(i, Math.min(i + 10, buffer.length));
    const hex = Array.from(slice).map(b => b.toString(16).padStart(2, '0')).join(' ');
    const ascii = Array.from(slice).map(b => b >= 32 && b < 127 ? String.fromCharCode(b) : '.').join('');
    console.log(`  ${i.toString().padStart(2)}: ${hex.padEnd(30)} ${ascii}`);
  }
  
  // Known header
  const header = Buffer.from('c509bdb497cbc06873ff412af12fd8007624c29faa', 'hex');
  console.log(`\nKnown header (${header.length} bytes):`);
  console.log(`  ${Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
  
  // Check if header matches
  const headerMatch = buffer.slice(0, 21).equals(header);
  console.log(`\nHeader matches: ${headerMatch ? 'YES' : 'NO'}`);
  
  // The encrypted data starts at position 21
  console.log(`\nData after header (position 21+):`);
  const data = buffer.slice(21);
  console.log(`  Length: ${data.length}`);
  console.log(`  Bytes: ${Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
  
  // Our encryption result
  const { encryptAnimeKai } = await import('../app/lib/animekai-crypto.ts');
  const ourResult = encryptAnimeKai('c4S88Q');
  const ourBase64 = ourResult.replace(/-/g, '+').replace(/_/g, '/');
  const ourPadded = ourBase64 + '='.repeat((4 - ourBase64.length % 4) % 4);
  const ourBuffer = Buffer.from(ourPadded, 'base64');
  
  console.log(`\nOur encryption result:`);
  console.log(`  Length: ${ourBuffer.length}`);
  console.log(`  Bytes: ${Array.from(ourBuffer).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
  
  // Compare our bytes with the data after header
  console.log(`\nComparison:`);
  console.log(`  API data after header: ${Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
  console.log(`  Our encryption:        ${Array.from(ourBuffer).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
  
  // Check specific positions
  console.log(`\nPosition analysis for "c4S88Q":`);
  const input = 'c4S88Q';
  const cipherPositions = [0, 7, 11, 13, 15, 17, 19];
  
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const cipherPos = cipherPositions[i];
    const ourByte = ourBuffer[cipherPos];
    const apiByte = data[cipherPos];
    console.log(`  [${i}] '${char}' -> cipher pos ${cipherPos}: our=0x${ourByte?.toString(16).padStart(2, '0')} api=0x${apiByte?.toString(16).padStart(2, '0')} ${ourByte === apiByte ? '✓' : '✗'}`);
  }
}

main().catch(console.error);
