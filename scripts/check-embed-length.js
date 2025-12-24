const https = require('https');

function urlSafeBase64Decode(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return Buffer.from(padded, 'base64');
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

// Simple encrypt for testing
const HEADER = Buffer.from('c509bdb497cbc06873ff412af12fd8007624c29faa', 'hex');
function encryptSimple(text) {
  // Just use the API for this test
  return new Promise((resolve, reject) => {
    https.get(`https://enc-dec.app/api/enc-kai?text=${encodeURIComponent(text)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data).result));
    }).on('error', reject);
  });
}

async function main() {
  const kaiId = 'c4S88Q';
  const encKaiId = await encryptSimple(kaiId);
  
  const episodes = await fetchJson(`https://animekai.to/ajax/episodes/list?ani_id=${kaiId}&_=${encKaiId}`);
  const token = episodes.result.match(/token="([^"]+)"/)[1];
  
  const encToken = await encryptSimple(token);
  const servers = await fetchJson(`https://animekai.to/ajax/links/list?token=${token}&_=${encToken}`);
  const lid = servers.result.match(/data-lid="([^"]+)"/)[1];
  
  const encLid = await encryptSimple(lid);
  const embed = await fetchJson(`https://animekai.to/ajax/links/view?id=${lid}&_=${encLid}`);
  
  console.log('Embed result (base64):', embed.result);
  console.log('Base64 length:', embed.result.length);
  
  const decoded = urlSafeBase64Decode(embed.result);
  console.log('Decoded total length:', decoded.length);
  console.log('Data length (after 21-byte header):', decoded.length - 21);
  
  // The data length tells us how many table positions we need
  // Position mapping: 0-6 use sparse positions, 7+ use linear (20+)
  // So for data length N, we need tables up to position 7 + (N - 20) = N - 13
  const dataLen = decoded.length - 21;
  const maxPlainPos = 7 + (dataLen - 20);
  console.log('Max plaintext position needed:', maxPlainPos);
}

main().catch(console.error);
