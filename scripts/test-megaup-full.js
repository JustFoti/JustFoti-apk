#!/usr/bin/env node
/**
 * Full MegaUp page analysis
 */

const testUrl = 'https://megaup22.online/e/jIrrLzj-WS2JcOLzF79O5xvpCQ';

async function main() {
  console.log('Fetching MegaUp page...');
  
  const response = await fetch(testUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      'Referer': 'https://animekai.to/',
    }
  });
  
  const html = await response.text();
  console.log(`Got ${html.length} bytes\n`);
  console.log('=== FULL HTML ===');
  console.log(html);
  console.log('\n=== END HTML ===');
  
  // Extract all scripts
  const scripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi);
  if (scripts) {
    console.log(`\nFound ${scripts.length} script tags:`);
    scripts.forEach((s, i) => {
      console.log(`\n--- Script ${i + 1} ---`);
      console.log(s);
    });
  }
}

main().catch(console.error);
