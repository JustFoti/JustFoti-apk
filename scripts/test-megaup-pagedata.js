#!/usr/bin/env node
/**
 * Test MegaUp __PAGE_DATA decoding
 */

const testUrl = 'https://megaup22.online/e/jIrrLzj-WS2JcOLzF79O5xvpCQ';

async function testMegaUp() {
  console.log('Fetching MegaUp page...');
  
  const response = await fetch(testUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      'Referer': 'https://animekai.to/',
    }
  });
  
  const html = await response.text();
  console.log(`Got ${html.length} bytes\n`);
  
  // Extract __PAGE_DATA
  const match = html.match(/window\.__PAGE_DATA\s*=\s*"([^"]+)"/);
  if (!match) {
    console.log('No __PAGE_DATA found');
    console.log('HTML preview:', html.substring(0, 2000));
    return;
  }
  
  const encoded = match[1];
  console.log('__PAGE_DATA length:', encoded.length);
  console.log('__PAGE_DATA preview:', encoded.substring(0, 100));
  console.log('');
  
  // Try base64
  console.log('=== Trying Base64 ===');
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    console.log('Base64 decoded:', decoded.substring(0, 500));
  } catch (e) {
    console.log('Base64 failed:', e.message);
  }
  
  // Try raw decode
  console.log('\n=== Raw characters ===');
  console.log('First 50 char codes:', [...encoded.substring(0, 50)].map(c => c.charCodeAt(0)));
  
  // Try atob equivalent
  console.log('\n=== Trying atob-style decode ===');
  try {
    // Check if it looks like base64
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(encoded);
    console.log('Looks like base64:', isBase64);
    
    if (!isBase64) {
      // Maybe it's a custom encoding
      console.log('Not standard base64, trying custom decode...');
      
      // Check for patterns
      const hasNumbers = /\d/.test(encoded);
      const hasLetters = /[a-zA-Z]/.test(encoded);
      const hasSpecial = /[^a-zA-Z0-9]/.test(encoded);
      console.log('Has numbers:', hasNumbers);
      console.log('Has letters:', hasLetters);
      console.log('Has special chars:', hasSpecial);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  // Try XOR with various keys
  console.log('\n=== Trying XOR decryption ===');
  const keys = ['megaup', 'player', 'stream', 'video', 'key', '123456', 'secret'];
  for (const key of keys) {
    let decoded = '';
    for (let i = 0; i < Math.min(encoded.length, 200); i++) {
      decoded += String.fromCharCode(encoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    if (decoded.includes('http') || decoded.includes('m3u8') || decoded.includes('file')) {
      console.log(`Key "${key}" might work:`, decoded.substring(0, 200));
    }
  }
  
  // Try reverse
  console.log('\n=== Trying reverse ===');
  const reversed = encoded.split('').reverse().join('');
  try {
    const decoded = Buffer.from(reversed, 'base64').toString('utf-8');
    console.log('Reversed base64:', decoded.substring(0, 200));
  } catch {}
  
  // Try URL decode
  console.log('\n=== Trying URL decode ===');
  try {
    const decoded = decodeURIComponent(encoded);
    console.log('URL decoded:', decoded.substring(0, 200));
  } catch {}
  
  // Look for any JS that processes __PAGE_DATA
  console.log('\n=== Looking for decoder in page ===');
  const scriptMatch = html.match(/<script[^>]*>([^<]*__PAGE_DATA[^<]*)<\/script>/i);
  if (scriptMatch) {
    console.log('Found script using __PAGE_DATA:', scriptMatch[1].substring(0, 500));
  }
  
  // Look for any external JS files
  const jsFiles = html.match(/src="([^"]+\.js[^"]*)"/g);
  console.log('\nExternal JS files:', jsFiles);
}

testMegaUp().catch(console.error);
