const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-player.js');
const content = fs.readFileSync(filePath, 'utf8');

const query = 'class _0x488316';
const index = content.indexOf(query);

if (index !== -1) {
    console.log(`Found '${query}' at index ${index}`);
    const start = index;
    const end = Math.min(content.length, index + 2000);
    console.log('Context:');
    console.log(content.substring(start, end));
} else {
    console.log(`'${query}' not found.`);
}
