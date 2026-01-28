const https = require('https');

const options = {
  hostname: 'dlhd.so',
  path: '/24-7-channels.php',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Length:', data.length);
    
    // Find all href patterns
    const hrefs = data.match(/href="[^"]+"/g) || [];
    console.log('\nSample hrefs found:', hrefs.length);
    hrefs.slice(0, 20).forEach(h => console.log(h));
    
    // Find channel/stream patterns
    const patterns = data.match(/(?:stream|channel|tv)[-_]?\d+/gi) || [];
    console.log('\nChannel patterns:', [...new Set(patterns)].slice(0, 20));
    
    // Look for data attributes or onclick handlers
    const dataAttrs = data.match(/data-[a-z]+="[^"]+"/gi) || [];
    console.log('\nData attributes:', dataAttrs.slice(0, 10));
    
    // Save a sample of the HTML
    console.log('\n--- HTML SAMPLE (first 3000 chars) ---');
    console.log(data.substring(0, 3000));
  });
}).on('error', e => console.error('Error:', e.message));
