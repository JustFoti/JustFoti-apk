const fs = require('fs');
const path = require('path');

// Use absolute paths from script location
const rootDir = path.join(__dirname, '..');
const dataPath = path.join(rootDir, 'data', 'dlhd-channels.json');
const tsPath = path.join(rootDir, 'cloudflare-proxy', 'src', 'tv-proxy.ts');

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Filter only topembed channels with valid channel keys
const topembed = data.filter(c => c.source === 'topembed' && c.channelKey);

console.log('Found', topembed.length, 'topembed channels');

// Generate the map entries
const entries = topembed.map(c => {
  const serverKey = c.serverKey ? `'${c.serverKey}'` : 'null';
  const name = (c.topembedName || '').replace(/'/g, "\\'");
  const channelKey = c.channelKey.trim();
  return `  '${c.id}': { channelKey: '${channelKey}', serverKey: ${serverKey}, name: '${name}' },`;
}).join('\n');

// Read the current file
let content = fs.readFileSync(tsPath, 'utf8');

// Find the DLHD_CHANNEL_MAP and replace it
const mapStart = content.indexOf('const DLHD_CHANNEL_MAP: Record<string, DLHDChannelInfo> = {');
if (mapStart === -1) {
  console.error('Could not find DLHD_CHANNEL_MAP in file');
  process.exit(1);
}

const mapEnd = content.indexOf('};', mapStart) + 2;
console.log('Found map at positions', mapStart, '-', mapEnd);

const newMap = `// COMPLETE DLHD Channel Mapping - Auto-generated from data/dlhd-channels.json
// Total topembed channels: ${topembed.length}
const DLHD_CHANNEL_MAP: Record<string, DLHDChannelInfo> = {
${entries}
};`;

content = content.substring(0, mapStart) + newMap + content.substring(mapEnd);

fs.writeFileSync(tsPath, content);
console.log('Successfully updated DLHD_CHANNEL_MAP with', topembed.length, 'channels');
