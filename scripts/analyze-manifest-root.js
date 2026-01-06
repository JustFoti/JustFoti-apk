/**
 * Analyze the manifest server root page
 */

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const fs = require('fs');

async function main() {
  const res = await fetch('https://s-c1.peulleieo.net/', {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
    },
  });
  
  const html = await res.text();
  fs.writeFileSync('manifest-server-root.html', html);
  console.log('Saved to manifest-server-root.html');
  console.log('Length:', html.length);
  
  // Look for scripts
  const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let scriptNum = 0;
  
  console.log('\n=== Scripts ===');
  while ((match = scriptPattern.exec(html)) !== null) {
    scriptNum++;
    const content = match[1].trim();
    if (content.length > 0) {
      console.log(`\nScript ${scriptNum} (${content.length} chars):`);
      console.log(content.substring(0, 300));
    }
  }
  
  // Look for external scripts
  const extScriptPattern = /<script[^>]*src="([^"]+)"[^>]*>/gi;
  console.log('\n\n=== External Scripts ===');
  while ((match = extScriptPattern.exec(html)) !== null) {
    console.log(match[1]);
  }
  
  // Look for any auth-related content
  console.log('\n\n=== Auth-related content ===');
  if (html.includes('token')) console.log('Contains "token"');
  if (html.includes('auth')) console.log('Contains "auth"');
  if (html.includes('cookie')) console.log('Contains "cookie"');
  if (html.includes('session')) console.log('Contains "session"');
  if (html.includes('verify')) console.log('Contains "verify"');
  
  // Look for any API endpoints
  const apiPattern = /["'](\/[a-z0-9/_-]+)["']/gi;
  const apis = new Set();
  while ((match = apiPattern.exec(html)) !== null) {
    if (match[1].length > 3 && match[1].length < 50) {
      apis.add(match[1]);
    }
  }
  console.log('\n\n=== API paths ===');
  [...apis].slice(0, 20).forEach(a => console.log(a));
}

main().catch(console.error);
