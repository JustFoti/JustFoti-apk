#!/usr/bin/env node
/**
 * Fetch fresh MegaUp page and try to decode with enc-dec.app
 */

const embedUrl = 'https://megaup22.online/e/jIrrLzj-WS2JcOLzF79O5xvpCQ';
const testUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  console.log('Fetching MegaUp page with UA:', testUA);
  
  const response = await fetch(embedUrl, {
    headers: {
      'User-Agent': testUA,
      'Referer': 'https://animekai.to/',
    }
  });
  
  const html = await response.text();
  
  // Extract __PAGE_DATA
  const match = html.match(/window\.__PAGE_DATA\s*=\s*"([^"]+)"/);
  if (!match) {
    console.log('No __PAGE_DATA found');
    return;
  }
  
  const pageData = match[1];
  console.log('__PAGE_DATA:', pageData);
  
  // Extract UA from page
  const uaMatch = html.match(/var ua\s*=\s*'([^']+)'/);
  const pageUA = uaMatch ? uaMatch[1] : testUA;
  console.log('Page UA:', pageUA);
  
  // Try dec-mega with the page's UA
  console.log('\n=== Trying dec-mega ===');
  const decResponse = await fetch('https://enc-dec.app/api/dec-mega', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: pageData, agent: pageUA }),
  });
  
  const result = await decResponse.json();
  console.log('Status:', result.status);
  console.log('Result:', result.result);
  if (result.error) console.log('Error:', result.error);
  
  // If that fails, try with the request UA
  if (result.status !== 200) {
    console.log('\n=== Trying with request UA ===');
    const decResponse2 = await fetch('https://enc-dec.app/api/dec-mega', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: pageData, agent: testUA }),
    });
    
    const result2 = await decResponse2.json();
    console.log('Status:', result2.status);
    console.log('Result:', result2.result);
    if (result2.error) console.log('Error:', result2.error);
  }
}

main().catch(console.error);
