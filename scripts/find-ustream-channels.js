#!/usr/bin/env node
/**
 * Quick scan to find uStream (unencrypted) channels
 * Only checks the M3U8 header to see if it says "Powered by uSTREAM"
 */

const https = require('https');

async function getServerKey(channel) {
  return new Promise((resolve) => {
    https.get('https://epicplayplay.cfd/server_lookup.js?channel_id=' + channel, {timeout: 5000}, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data).server_key); }
        catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function checkUStream(serverKey, channel) {
  const url = 'https://' + serverKey + 'new.giokko.ru/' + serverKey + '/' + channel + '/mono.css';
  return new Promise((resolve) => {
    const req = https.get(url, {timeout: 5000}, (res) => {
      let data = '';
      res.on('data', c => {
        data += c;
        // Only need first 200 bytes to check
        if (data.length > 200) req.destroy();
      });
      res.on('end', () => resolve({
        channel,
        serverKey,
        isUStream: data.includes('uSTREAM'),
        hasKey: data.includes('EXT-X-KEY'),
        status: res.statusCode
      }));
    });
    req.on('error', () => resolve({channel, error: true}));
  });
}

async function main() {
  const args = process.argv.slice(2);
  const start = parseInt(args[0]) || 300;
  const end = parseInt(args[1]) || 400;
  
  console.log(`Scanning channels ${start}-${end} for uStream...`);
  
  const uStreamChannels = [];
  const encryptedChannels = [];
  
  // Process in batches of 5 for speed
  for (let i = start; i <= end; i += 5) {
    const batch = [];
    for (let j = i; j < Math.min(i + 5, end + 1); j++) {
      batch.push(j);
    }
    
    const results = await Promise.all(batch.map(async (id) => {
      const channel = 'premium' + id;
      const serverKey = await getServerKey(channel);
      if (!serverKey) return null;
      const result = await checkUStream(serverKey, channel);
      return result.error ? null : {...result, id};
    }));
    
    for (const result of results) {
      if (!result) continue;
      if (result.isUStream) {
        uStreamChannels.push({id: result.id, serverKey: result.serverKey});
        console.log(`✓ premium${result.id} (${result.serverKey}) - uSTREAM`);
      } else if (result.hasKey) {
        encryptedChannels.push({id: result.id, serverKey: result.serverKey});
      }
    }
  }
  
  console.log('\n\n=== RESULTS ===');
  console.log(`uStream (unencrypted): ${uStreamChannels.length}`);
  console.log(`Encrypted: ${encryptedChannels.length}`);
  
  if (uStreamChannels.length > 0) {
    console.log('\nuStream channel IDs:');
    uStreamChannels.forEach(c => console.log(`  premium${c.id} (${c.serverKey})`));
  }
}

main().catch(console.error);
