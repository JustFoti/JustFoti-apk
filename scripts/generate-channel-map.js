const data = require('../data/dlhd-channels.json');

// Filter only topembed channels with valid channel keys
const topembed = data.filter(c => c.source === 'topembed' && c.channelKey);

console.log('// COMPLETE DLHD Channel Mapping - Auto-generated from data/dlhd-channels.json');
console.log('// Total topembed channels:', topembed.length);
console.log('');

topembed.forEach(c => {
  const serverKey = c.serverKey ? `'${c.serverKey}'` : 'null';
  const name = (c.topembedName || '').replace(/'/g, "\\'");
  const channelKey = c.channelKey.trim();
  console.log(`  '${c.id}': { channelKey: '${channelKey}', serverKey: ${serverKey}, name: '${name}' },`);
});
