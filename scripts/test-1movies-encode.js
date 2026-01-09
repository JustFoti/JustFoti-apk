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

// Our encoding
function encode(data) {
  // AES-256-CBC encrypt
  const cipher = crypto.createCipheriv('aes-256-cbc', AES_KEY, AES_IV);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  console.log('AES encrypted (hex):', encrypted.substring(0, 100));
  console.log('AES encrypted length:', encrypted.length);
  
  // XOR each character
  let xored = '';
  for (let i = 0; i < encrypted.length; i++) {
    const charCode = encrypted.charCodeAt(i);
    const xorByte = XOR_KEY[i % XOR_KEY.length];
    xored += String.fromCharCode(charCode ^ xorByte);
  }
  
  console.log('XORed (first 50 bytes):', [...xored.substring(0, 50)].map(c => c.charCodeAt(0)));
  
  // Base64url encode
  const base64 = Buffer.from(xored, 'binary').toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  console.log('Base64url:', base64.substring(0, 100));
  console.log('Base64url length:', base64.length);
  
  // Character substitution
  let result = '';
  for (const char of base64) {
    result += ENCODE_MAP.get(char) || char;
  }
  
  return result;
}

console.log('PageData:', pageData);
console.log('PageData length:', pageData.length);
console.log('');

const ourEncoded = encode(pageData);
console.log('');
console.log('Our encoded:', ourEncoded.substring(0, 100) + '...');
console.log('Our length:', ourEncoded.length);
console.log('');
console.log('Browser encoded:', browserEncoded.substring(0, 100) + '...');
console.log('Browser length:', browserEncoded.length);
console.log('');

// Compare
if (ourEncoded === browserEncoded) {
  console.log('*** PERFECT MATCH! ***');
} else {
  console.log('Mismatch!');
  for (let i = 0; i < Math.min(ourEncoded.length, browserEncoded.length); i++) {
    if (ourEncoded[i] !== browserEncoded[i]) {
      console.log('First diff at position', i);
      console.log('  Our:', ourEncoded.substring(i, i+30));
      console.log('  Browser:', browserEncoded.substring(i, i+30));
      break;
    }
  }
}
