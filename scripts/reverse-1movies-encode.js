const crypto = require('crypto');

const pageData = 'mFYFr2TArFBXs_Tdl_0Xr2mGrb-Kr_-Amu4Cm2r1sb0WsF0xlX-Llb-6sXQdlXQvlFmKw2TXl_iSlbV1wurSrbTdlbyFs_sFsMIFluIyw_lXlbQdl_rysMmXrF0vmGgdsMYymMSvmXYCr_eXmFgzsXlGr2TAm_lLrMm6wMTLsX4F';
const browserEncoded = 'TYwdiyr9JyrjTPffYS5-xyrbTP8diS5-Jy5ETPwf165DJ6rFTYwdo6rWfyr9TY8doSrqaSr9TP_dok5Ex6rBTP8dS65lxS52TPwdo65Exy5gTPwdiyrWLkrBTPKdSk5Vx65gTP8f1S5-LSrTTYndik5-xSrhTP8doyrWxyrBTYwf1y5-Lk5VTY_dSk5Vx6rBTPufYS52JkrTTPndik5lfyrBTY3fY6rBxy52TP8f1y5Day5UTYnfY65lJ6rFTPuf1y5DJy5ETY_f1S5DJk5ETPfdi6rFLk5lTPwfY6r9J6rWTPKdoyrFay5ETPjf1SrBx6rWTP4fYS5UfSr9TPufY65Ua65gTP_f16rhfyrjTP3dS65DxyrFTY3fYSrhJ65gTPndiyrBJ652TP8do65Va6rWTY_doSrFJ6rqTY_fYSrBJk52TPwdokr9Jk5ETPKdikrhLkrFTP4dik5DJy5ETP4dok5Dx6rBTPndi6rFxS5lTY3fYS5lLk5ETYndiy5EJkrFTPKf16rqxy5lTPffYSrqxS52TPndSk5-xyr9TP3fYkrFfSr9TP8diy5lfS52TPnfY65DL65VTPfdoy5DJyrqTPKf1652LS52TY_fYSrhfSr9TP8diSr9a6rFTY8dok5EJy5gTP3dokrqJS5ETY8f165va65lTP_fYk5EJ6rOTP8di65VayrWTPjdoy5DaS52TYndoy5DxSrBTP_fYS5-ay5UTPnfY6rFJyrFTY8fYk5VJkrTTYKdiS5VLkrTTY_fYk5DLkrWTY8f1y5UJyrTTY8f1S52xSrOTPjdSkrFx6rBTP4doy5VayrBTY_diy5lxy5ETPnfYV';

// Keys from the chunk
const AES_KEY = Buffer.from([138,238,17,197,68,75,124,44,53,79,11,131,216,176,124,80,161,126,163,21,238,68,192,209,135,253,84,163,18,158,148,102]);
const AES_IV = Buffer.from([181,63,33,220,121,92,190,223,94,49,56,160,53,233,201,230]);
const XOR_KEY = Buffer.from([215,136,144,55,198]);

// Character substitution
const U_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
const D_CHARS = 'c86mtuVv2EUlDgX-1YSpoiTq9WJadfzNe_Rs53kMrKHQZnxL0wGCFBhb7AP4yIOj';

// Build maps
const ENCODE_MAP = new Map();
const DECODE_MAP = new Map();
for (let i = 0; i < U_CHARS.length; i++) {
  ENCODE_MAP.set(U_CHARS[i], D_CHARS[i]);
  DECODE_MAP.set(D_CHARS[i], U_CHARS[i]);
}

console.log('=== Reversing Browser Encoding ===\n');

// Step 1: Reverse character substitution
let base64 = '';
for (const char of browserEncoded) {
  base64 += DECODE_MAP.get(char) || char;
}
console.log('Step 1 - Reversed char sub (base64url):');
console.log('  First 100:', base64.substring(0, 100));
console.log('  Length:', base64.length);

// Check if it's valid base64url
const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const invalidChars = [...base64].filter(c => !base64Chars.includes(c));
console.log('  Invalid chars:', invalidChars.length > 0 ? invalidChars : 'None');

// Step 2: Decode base64url
const base64Standard = base64.replace(/-/g, '+').replace(/_/g, '/');
const xored = Buffer.from(base64Standard, 'base64');
console.log('\nStep 2 - Decoded base64:');
console.log('  Length:', xored.length);
console.log('  First 50 bytes:', [...xored.slice(0, 50)]);

// Step 3: Reverse XOR
let hex = '';
for (let i = 0; i < xored.length; i++) {
  const byte = xored[i];
  const xorByte = XOR_KEY[i % XOR_KEY.length];
  hex += String.fromCharCode(byte ^ xorByte);
}
console.log('\nStep 3 - Reversed XOR:');
console.log('  First 100:', hex.substring(0, 100));
console.log('  Length:', hex.length);

// Check if it's valid hex
const isHex = /^[0-9a-f]+$/i.test(hex);
console.log('  Is valid hex:', isHex);

if (isHex) {
  // Step 4: Decrypt AES
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', AES_KEY, AES_IV);
    let decrypted = decipher.update(hex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    console.log('\nStep 4 - Decrypted:');
    console.log('  Value:', decrypted);
    console.log('  Length:', decrypted.length);
    
    if (decrypted === pageData) {
      console.log('\n*** PERFECT REVERSE! ***');
    } else {
      console.log('\nComparing with pageData:');
      console.log('  PageData:', pageData);
      console.log('  Match:', decrypted === pageData);
    }
  } catch (e) {
    console.log('\nStep 4 - Decryption failed:', e.message);
  }
} else {
  // Find first non-hex char
  for (let i = 0; i < hex.length; i++) {
    if (!/[0-9a-f]/i.test(hex[i])) {
      console.log('  First non-hex at position', i, ':', hex.charCodeAt(i), '(', hex[i], ')');
      break;
    }
  }
}
