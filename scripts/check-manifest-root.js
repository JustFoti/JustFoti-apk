/**
 * Check what the manifest server root returns
 */

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  // Test a few manifest server hosts
  const hosts = [
    's-c1.peulleieo.net',
    's-c2.peulleieo.net',
    's-c3.peulleieo.net',
    's-c8.peulleieo.net',
    's-c10.peulleieo.net',
    's-b1.peulleieo.net',
  ];
  
  for (const host of hosts) {
    console.log(`\n=== ${host} ===`);
    
    try {
      const res = await fetch(`https://${host}/`, {
        headers: {
          'User-Agent': USER_AGENT,
          'Referer': 'https://casthill.net/',
          'Origin': 'https://casthill.net',
        },
      });
      
      console.log('Status:', res.status);
      console.log('Content-Type:', res.headers.get('content-type'));
      
      const text = await res.text();
      console.log('Body length:', text.length);
      console.log('Body preview:', text.substring(0, 200));
      
      // Check for any interesting headers
      console.log('Headers:');
      for (const [key, value] of res.headers.entries()) {
        if (!['date', 'server', 'content-type', 'content-length', 'connection'].includes(key.toLowerCase())) {
          console.log(' ', key + ':', value);
        }
      }
    } catch (e) {
      console.log('Error:', e.message);
    }
  }
  
  // Also check the main peulleieo.net domain
  console.log('\n=== peulleieo.net ===');
  try {
    const res = await fetch('https://peulleieo.net/', {
      headers: { 'User-Agent': USER_AGENT },
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body:', text.substring(0, 200));
  } catch (e) {
    console.log('Error:', e.message);
  }
}

main().catch(console.error);
