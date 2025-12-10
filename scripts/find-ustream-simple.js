const https = require('https');

const start = parseInt(process.argv[2]) || 365;
const end = parseInt(process.argv[3]) || 400;

console.log('Scanning', start, 'to', end);

function fetch(url) {
  return new Promise((resolve) => {
    https.get(url, {timeout: 8000}, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ok: res.statusCode === 200, data: d}));
    }).on('error', () => resolve({ok: false}));
  });
}

async function check(id) {
  const ch = 'premium' + id;
  const lookup = await fetch('https://epicplayplay.cfd/server_lookup.js?channel_id=' + ch);
  if (!lookup.ok) return null;
  
  let sk;
  try { sk = JSON.parse(lookup.data).server_key; } catch { return null; }
  if (!sk) return null;
  
  const m3u8 = await fetch('https://' + sk + 'new.giokko.ru/' + sk + '/' + ch + '/mono.css');
  if (!m3u8.ok) return null;
  
  const hasKey = m3u8.data.includes('EXT-X-KEY');
  return {
    id,
    sk,
    ustream: m3u8.data.includes('uSTREAM') && !hasKey,  // uSTREAM AND no encryption
    encrypted: hasKey
  };
}

(async () => {
  const ustream = [];
  for (let i = start; i <= end; i++) {
    const r = await check(i);
    if (r && r.ustream) {
      console.log('USTREAM:', 'premium' + r.id, '(' + r.sk + ')');
      ustream.push(r.id);
    }
  }
  console.log('\nDone. uStream channels:', ustream.join(', ') || 'none');
})();
