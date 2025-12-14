/**
 * Test the RPI proxy /animekai endpoint directly
 * Run on Pi: node test-rpi-animekai-endpoint.js
 */

const http = require('http');

const RPI_PORT = 3001; // Default RPI proxy port
const API_KEY = process.env.API_KEY || 'change-this-secret-key';

const TEST_URL = 'https://rrr.code29wave.site/pz78/c5/h6a90f70b8d237f94866b6cfc246349bddedc7dc1328a917ca76e37756fa661eea100899eb0e27ac0c102a43593daa3423043341b3a9c0feb0784d09d53a146e35d/list,Ktm0Vt9-cJyXbGG_O3gV_5vGK-kpiQ.m3u8';

console.log('Testing RPI proxy /animekai endpoint...');
console.log(`URL: ${TEST_URL.substring(0, 80)}...`);
console.log(`API Key: ${API_KEY.substring(0, 8)}...`);

const params = new URLSearchParams({
  url: TEST_URL,
  key: API_KEY,
});

const reqUrl = `http://localhost:${RPI_PORT}/animekai?${params.toString()}`;
console.log(`\nRequest: ${reqUrl.substring(0, 100)}...`);

http.get(reqUrl, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`\nStatus: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    if (res.statusCode === 200) {
      console.log(`\n✓ SUCCESS!`);
      console.log(`Content (first 500 chars):\n${data.substring(0, 500)}`);
    } else {
      console.log(`\n✗ FAILED!`);
      console.log(`Response: ${data}`);
    }
  });
}).on('error', (err) => {
  console.log(`\n✗ ERROR: ${err.message}`);
  console.log('Is the RPI proxy running? Try: pm2 status');
});
