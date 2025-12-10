const https = require('https');

// Compare encrypted vs unencrypted channels
const channels = ['premium303', 'premium371', 'premium380'];

async function getServerKey(channel) {
  return new Promise((resolve) => {
    https.get('https://epicplayplay.cfd/server_lookup.js?channel_id=' + channel, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({channel, ...JSON.parse(data)}); }
        catch { resolve({channel, error: 'parse error'}); }
      });
    }).on('error', (e) => resolve({channel, error: e.message}));
  });
}

async function getM3U8(serverKey, channel) {
  const url = 'https://' + serverKey + 'new.giokko.ru/' + serverKey + '/' + channel + '/mono.css';
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({
        channel,
        serverKey,
        status: res.statusCode,
        hasKey: data.includes('EXT-X-KEY'),
        keyUrl: data.match(/URI="([^"]+)"/)?.[1] || null,
        preview: data.substring(0, 500)
      }));
    }).on('error', (e) => resolve({channel, error: e.message}));
  });
}

(async () => {
  for (const ch of channels) {
    const lookup = await getServerKey(ch);
    console.log('\n=== ' + ch + ' ===');
    console.log('Server key:', lookup.server_key);
    
    if (lookup.server_key) {
      const m3u8 = await getM3U8(lookup.server_key, ch);
      console.log('Encrypted:', m3u8.hasKey);
      if (m3u8.keyUrl) console.log('Key URL:', m3u8.keyUrl);
      console.log('Preview:\n' + m3u8.preview);
    }
  }
})();
