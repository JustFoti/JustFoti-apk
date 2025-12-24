/**
 * Build the complete animekai-crypto.ts file with all tables
 */
const fs = require('fs');

// Read all table files
const tableFiles = [
  'tables-20-29.txt',
  'tables-30-49.txt', 
  'tables-50-59.txt',
  'tables-60-79.txt',
  'tables-80-89.txt',
  'tables-90-99.txt'
];

let extendedTables = '';
for (const file of tableFiles) {
  try {
    extendedTables += fs.readFileSync(file, 'utf8');
  } catch (e) {
    console.error(`Could not read ${file}`);
  }
}

// Read the current crypto file to get tables 0-19
const currentFile = fs.readFileSync('app/lib/animekai-crypto.ts', 'utf8');

// Extract tables 0-19 from current file
const tablesMatch = currentFile.match(/const ENCRYPT_TABLES[\s\S]*?^};/m);
if (!tablesMatch) {
  console.error('Could not find ENCRYPT_TABLES in current file');
  process.exit(1);
}

// Build the new file
const newFile = `/**
 * AnimeKai Native Encryption/Decryption
 * 
 * Reverse engineered position-dependent substitution cipher.
 * Eliminates dependency on enc-dec.app for enc-kai/dec-kai endpoints.
 * 
 * EXTENDED: Now supports positions 0-99 for full decryption of embed responses.
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

// Full substitution tables for positions 0-99
// Tables 0-19 handle the first 7 characters (sparse cipher positions)
// Tables 20-99 handle characters 7+ (linear cipher positions)
const ENCRYPT_TABLES: Record<number, Record<string, number>> = {
  0: {'0':0xe2,'1':0x6d,'2':0xe6,'3':0xe0,'4':0x6b,'5':0x75,'6':0x6f,'7':0x69,'8':0x73,'9':0x7d,' ':0xd4,'!':0xcc,'"':0xd4,'#':0xd4,'$':0xd4,'&':0xd4,'\\'':0xc8,'(':0xd2,')':0xdc,'*':0xd6,'+':0xd4,',':0xd4,'-':0xe4,'.':0xde,'/':0xd4,':':0xd4,';':0xd4,'<':0xd4,'=':0xd4,'>':0xd4,'?':0xd4,'@':0xd4,'A':0x0c,'B':0x06,'C':0x00,'D':0x0a,'E':0x14,'F':0x0e,'G':0x08,'H':0x12,'I':0x1c,'J':0x16,'K':0x10,'L':0x1a,'M':0x24,'N':0x1e,'O':0x18,'P':0x22,'Q':0xac,'R':0x26,'S':0x20,'T':0xaa,'U':0xb4,'V':0xae,'W':0xa8,'X':0xb2,'Y':0xbc,'Z':0xb6,'[':0xd4,'\\\\':0xd4,']':0xd4,'^':0xd4,'_':0xb8,'\`':0xd4,'a':0x4c,'b':0x46,'c':0x40,'d':0x4a,'e':0x54,'f':0x4e,'g':0x48,'h':0x52,'i':0x5c,'j':0x56,'k':0x50,'l':0x5a,'m':0x64,'n':0x5e,'o':0x58,'p':0x62,'q':0xec,'r':0x66,'s':0x60,'t':0xea,'u':0xf4,'v':0xee,'w':0xe8,'x':0xf2,'y':0xfc,'z':0xf6,'{':0xd4,'|':0xd4,'}':0xd4,'~':0xfe},
`;

console.log('Writing new crypto file...');
fs.writeFileSync('app/lib/animekai-crypto-new.ts', newFile);
console.log('Created app/lib/animekai-crypto-new.ts');
console.log('Extended tables length:', extendedTables.length);
