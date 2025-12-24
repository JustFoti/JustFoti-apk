/**
 * Test AnimeKai API directly to understand the expected format
 */
const https = require('https');

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        ...headers
      }
    };
    
    https.get(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), raw: data });
        } catch {
          resolve({ status: res.statusCode, data, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const { encryptAnimeKai } = await import('../app/lib/animekai-crypto.ts');
  
  // Test with a known anime ID
  const kaiId = 'c4S88Q';
  
  console.log('=== Testing AnimeKai API ===\n');
  
  // Our encryption
  const ourEncrypted = encryptAnimeKai(kaiId);
  console.log(`kai_id: ${kaiId}`);
  console.log(`Our encrypted _: ${ourEncrypted}`);
  
  // Test the episodes endpoint
  console.log('\n--- Testing episodes endpoint ---');
  const episodesUrl = `https://animekai.to/ajax/episodes/list?ani_id=${kaiId}&_=${ourEncrypted}`;
  console.log(`URL: ${episodesUrl}`);
  
  const result = await fetchUrl(episodesUrl);
  console.log(`Status: ${result.status}`);
  console.log(`Response: ${JSON.stringify(result.data).substring(0, 300)}`);
  
  // Try without the _ parameter to see what error we get
  console.log('\n--- Testing without _ parameter ---');
  const noParamUrl = `https://animekai.to/ajax/episodes/list?ani_id=${kaiId}`;
  const noParamResult = await fetchUrl(noParamUrl);
  console.log(`Status: ${noParamResult.status}`);
  console.log(`Response: ${JSON.stringify(noParamResult.data).substring(0, 300)}`);
  
  // Try with empty _ parameter
  console.log('\n--- Testing with empty _ parameter ---');
  const emptyParamUrl = `https://animekai.to/ajax/episodes/list?ani_id=${kaiId}&_=`;
  const emptyParamResult = await fetchUrl(emptyParamUrl);
  console.log(`Status: ${emptyParamResult.status}`);
  console.log(`Response: ${JSON.stringify(emptyParamResult.data).substring(0, 300)}`);
}

main().catch(console.error);
