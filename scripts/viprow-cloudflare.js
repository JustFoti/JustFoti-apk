/**
 * Analyze Cloudflare protection on boanki.net
 */

const fs = require('fs');

async function main() {
  const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  console.log('Testing boanki.net directly...\n');
  
  // Simple GET request
  const res = await fetch('https://boanki.net/', {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
    },
  });
  
  console.log('Status:', res.status);
  console.log('Headers:');
  for (const [key, value] of res.headers.entries()) {
    console.log(' ', key + ':', value);
  }
  
  const text = await res.text();
  console.log('\nResponse body (first 1000 chars):');
  console.log(text.substring(0, 1000));
  
  // Check for Cloudflare challenge
  if (text.includes('cf-browser-verification') || text.includes('challenge-platform')) {
    console.log('\n⚠️ Cloudflare challenge detected!');
  }
  
  // Check for cookies
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    console.log('\nCookies set:', setCookie);
  }
  
  // Try with cf_clearance cookie (if we had one)
  console.log('\n\nThe boanki.net endpoint requires:');
  console.log('1. Cloudflare clearance (cf_clearance cookie)');
  console.log('2. Valid X-CSRF-Auth header');
  console.log('3. Proper Origin/Referer from casthill.net');
  console.log('\nThis is a browser-only flow that requires JavaScript execution.');
}

main();
