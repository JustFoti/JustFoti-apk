// Crack the 1movies encoding by comparing browser output with our output
const { chromium } = require('playwright');
const crypto = require('crypto');

const BASE_URL = 'https://111movies.com';

// Keys from the chunk
const AES_KEY = Buffer.from([138,238,17,197,68,75,124,44,53,79,11,131,216,176,124,80,161,126,163,21,238,68,192,209,135,253,84,163,18,158,148,102]);
const AES_IV = Buffer.from([181,63,33,220,121,92,190,223,94,49,56,160,53,233,201,230]);
const XOR_KEY = Buffer.from([215,136,144,55,198]);

// Character substitution
const U_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
const D_CHARS = "c86mtuVv2EUlDgX-1YSpoiTq9WJadfzNe_Rs53kMrKHQZnxL0wGCFBhb7AP4yIOj";

const ENCODE_MAP = new Map();
const DECODE_MAP = new Map();
for (let i = 0; i < U_CHARS.length; i++) {
  ENCODE_MAP.set(U_CHARS[i], D_CHARS[i]);
  DECODE_MAP.set(D_CHARS[i], U_CHARS[i]);
}

function ourEncode(pageData) {
  // AES-256-CBC encrypt
  const cipher = crypto.createCipheriv('aes-256-cbc', AES_KEY, AES_IV);
  let encrypted = cipher.update(pageData, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // XOR each character
  let xored = '';
  for (let i = 0; i < encrypted.length; i++) {
    const charCode = encrypted.charCodeAt(i);
    const xorByte = XOR_KEY[i % XOR_KEY.length];
    xored += String.fromCharCode(charCode ^ xorByte);
  }
  
  // Base64url encode
  const base64 = Buffer.from(xored, 'binary').toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  // Character substitution
  let result = '';
  for (const char of base64) {
    result += ENCODE_MAP.get(char) || char;
  }
  
  return result;
}

function reverseEncode(encoded) {
  // Reverse character substitution
  let base64 = '';
  for (const char of encoded) {
    base64 += DECODE_MAP.get(char) || char;
  }
  
  console.log('Reversed base64:', base64.substring(0, 100));
  
  // Decode base64url
  const base64Standard = base64.replace(/-/g, '+').replace(/_/g, '/');
  const xored = Buffer.from(base64Standard, 'base64').toString('binary');
  
  console.log('XORed length:', xored.length);
  
  // Reverse XOR
  let hex = '';
  for (let i = 0; i < xored.length; i++) {
    const charCode = xored.charCodeAt(i);
    const xorByte = XOR_KEY[i % XOR_KEY.length];
    hex += String.fromCharCode(charCode ^ xorByte);
  }
  
  console.log('Hex:', hex.substring(0, 100));
  
  // Check if it's valid hex
  if (/^[0-9a-f]+$/i.test(hex)) {
    console.log('Valid hex!');
    
    // Try to decrypt
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', AES_KEY, AES_IV);
      let decrypted = decipher.update(hex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      console.log('Decrypted:', decrypted.substring(0, 100));
      return decrypted;
    } catch (e) {
      console.log('Decryption failed:', e.message);
    }
  } else {
    console.log('Not valid hex, first non-hex char at:', hex.search(/[^0-9a-f]/i));
  }
  
  return null;
}

async function crack() {
  console.log('=== Cracking 1movies Encoding ===\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  
  let capturedPageData = null;
  let capturedEncoded = null;
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/ar/') && url.includes('/sr')) {
      // Extract the encoded part from the URL
      const match = url.match(/\/ar\/([^/]+)\/sr/);
      if (match) {
        capturedEncoded = match[1];
        console.log('Captured encoded:', capturedEncoded.substring(0, 80) + '...');
      }
    }
  });
  
  console.log('Navigating to 1movies...');
  await page.goto(`${BASE_URL}/movie/550`, { waitUntil: 'networkidle', timeout: 60000 });
  
  // Get the pageData from the page
  capturedPageData = await page.evaluate(() => {
    const script = document.getElementById('__NEXT_DATA__');
    if (script) {
      const data = JSON.parse(script.textContent);
      return data.props?.pageProps?.data;
    }
    return null;
  });
  
  console.log('Captured pageData:', capturedPageData?.substring(0, 80) + '...');
  
  // Wait for API call
  await page.waitForTimeout(5000);
  
  await browser.close();
  
  if (!capturedPageData || !capturedEncoded) {
    console.log('Failed to capture data');
    return;
  }
  
  console.log('\n=== Comparing Encodings ===\n');
  
  // Our encoding
  const ourEncoded = ourEncode(capturedPageData);
  console.log('Our encoded:', ourEncoded.substring(0, 80) + '...');
  console.log('Browser encoded:', capturedEncoded.substring(0, 80) + '...');
  
  console.log('\nOur length:', ourEncoded.length);
  console.log('Browser length:', capturedEncoded.length);
  
  // Find first difference
  for (let i = 0; i < Math.min(ourEncoded.length, capturedEncoded.length); i++) {
    if (ourEncoded[i] !== capturedEncoded[i]) {
      console.log(`\nFirst difference at position ${i}:`);
      console.log(`  Our: "${ourEncoded.substring(i, i+20)}"`);
      console.log(`  Browser: "${capturedEncoded.substring(i, i+20)}"`);
      break;
    }
  }
  
  // Try to reverse the browser encoding
  console.log('\n=== Reversing Browser Encoding ===\n');
  const reversed = reverseEncode(capturedEncoded);
  
  if (reversed) {
    console.log('\nReversed pageData:', reversed.substring(0, 80) + '...');
    console.log('Original pageData:', capturedPageData.substring(0, 80) + '...');
    
    if (reversed === capturedPageData) {
      console.log('\n*** MATCH! Our reverse is correct! ***');
    } else {
      console.log('\nNo match - comparing...');
      for (let i = 0; i < Math.min(reversed.length, capturedPageData.length); i++) {
        if (reversed[i] !== capturedPageData[i]) {
          console.log(`First diff at ${i}: reversed="${reversed[i]}" original="${capturedPageData[i]}"`);
          break;
        }
      }
    }
  }
}

crack().catch(console.error);
