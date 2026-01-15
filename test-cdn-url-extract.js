/**
 * CDN-LIVE URL Extractor - Extracts real m3u8 URLs from decoded JavaScript
 * 
 * The decoded JavaScript contains URLs with character substitutions (Caesar cipher).
 * This script finds and decodes them.
 */

const fs = require('fs');

// Read all decoded files
const files = fs.readdirSync('.').filter(f => f.startsWith('decoded-') && f.endsWith('.js'));
if (files.length === 0) {
  console.log('No decoded files found. Run test-cdn-live-direct.js first.');
  process.exit(1);
}

console.log(`Found ${files.length} decoded file(s)\n`);

for (const file of files.sort()) {
  const channel = file.match(/decoded-(\w+)-/)[1];
  console.log(`\n=== ${channel.toUpperCase()} ===`);
  
  const decoded = fs.readFileSync(file, 'utf-8');
  
  // Look for patterns like: $URL$ or "URL" where URL starts with eqqmp7 (https:)
  const urlPattern = /[$"'](eqqmp7[,/]+[\w*+.,/-]{20,}m\d[a-z]\d[<>^]?[^$"'\s]{0,300})[$"']/gi;
  
  const matches = decoded.matchAll(urlPattern);
  const foundUrls = [];
  
  for (const match of matches) {
    const obfuscated = match[1];
    
    // Decode using ROT-3 Caesar cipher + special character mappings
    let decodedUrl = '';
    for (let i = 0; i < obfuscated.length; i++) {
      const char = obfuscated[i];
      const code = char.charCodeAt(0);
      
      // Lowercase letters: ROT-3 (shift back by 3)
      if (code >= 97 && code <= 122) {
        decodedUrl += String.fromCharCode(((code - 97 - 3 + 26) % 26) + 97);
      }
      // Uppercase letters: ROT-3 (shift back by 3)
      else if (code >= 65 && code <= 90) {
        decodedUrl += String.fromCharCode(((code - 65 - 3 + 26) % 26) + 65);
      }
      // Special character mappings
      else if (char === '7') decodedUrl += ':';
      else if (char === ',') decodedUrl += '/';
      else if (char === '*') decodedUrl += '-';
      else if (char === '+') decodedUrl += '.';
      else if (char === '<') decodedUrl += '?';
      else if (char === '>') decodedUrl += '&';
      else if (char === '^') decodedUrl += '=';
      else decodedUrl += char;
    }
    
    // Check if it's a valid URL
    if (decodedUrl.startsWith('https://') && decodedUrl.includes('.m3u8')) {
      foundUrls.push({ obfuscated, decoded: decodedUrl });
    }
  }
  
  if (foundUrls.length === 0) {
    console.log('✗ No valid URLs found');
    continue;
  }
  
  console.log(`✓ Found ${foundUrls.length} URL(s):\n`);
  
  for (const { obfuscated, decoded: url } of foundUrls) {
    console.log('Decoded URL:', url);
    
    // Validate it's not the honeypot
    if (url.toLowerCase().includes('flyx.m3u8')) {
      console.log('⚠️  HONEYPOT DETECTED - This URL is blocked!\n');
    } else {
      // Validate pattern
      const urlObj = new URL(url);
      const validPattern = /\/api\/v1\/channels\/[a-z]{2}-[\w-]+\/(index|playlist)\.m3u8/i;
      
      if (validPattern.test(urlObj.pathname)) {
        console.log('✓ Valid URL pattern - SAFE TO USE\n');
      } else {
        console.log('⚠️  URL pattern does not match expected format\n');
      }
    }
  }
}
