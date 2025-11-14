// The encoded string looks like it might be a custom Base64 variant
// Let me check the WORKING scripts to see what they did

const https = require('https');

async function fetchAndExtract() {
  const tmdbId = '1054867';
  const embedUrl = `https://vidsrc-embed.ru/embed/movie/${tmdbId}`;
  
  // Fetch embed page
  const embedPage = await new Promise((resolve, reject) => {
    https.get(embedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
  
  // Extract hash
  const hash = embedPage.match(/data-hash=["']([^"']+)["']/)[1];
  console.log('Hash:', hash);
  
  // Fetch RCP page
  const rcpUrl = `https://cloudnestra.com/rcp/${hash}`;
  const rcpPage = await new Promise((resolve, reject) => {
    https.get(rcpUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': embedUrl } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
  
  console.log('RCP page length:', rcpPage.length);
  
  // Extract prorcp
  const prorcp = rcpPage.match(/\/prorcp\/([A-Za-z0-9+\/=\-_]+)/)[1];
  console.log('ProRCP:', prorcp.substring(0, 50));
  
  // Fetch player page
  const playerUrl = `https://cloudnestra.com/prorcp/${prorcp}`;
  const playerPage = await new Promise((resolve, reject) => {
    https.get(playerUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': rcpUrl } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
  
  console.log('Player page length:', playerPage.length);
  
  // Extract hidden div
  const match = playerPage.match(/<div[^>]+id="([^"]+)"[^>]*style="display:\s*none;?"[^>]*>([^<]+)<\/div>/i);
  const divId = match[1];
  const encoded = match[2];
  
  console.log('\nDivID:', divId);
  console.log('Encoded length:', encoded.length);
  console.log('Encoded first 100:', encoded.substring(0, 100));
  
  // Save to file for analysis
  require('fs').writeFileSync('encoded-data.txt', encoded);
  console.log('\nSaved to encoded-data.txt');
}

fetchAndExtract().catch(console.error);
