const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-player.js');
const content = fs.readFileSync(filePath, 'utf8');

const query = "class _0x400da7";
const pos = content.indexOf(query);

if (pos !== -1) {
    console.log(`Found '${query}' at index ${pos}`);
    const start = Math.max(0, pos);
    const end = Math.min(content.length, pos + 1000);
    console.log('Context:');
    console.log(content.substring(start, end));
} else {
    console.log(`'${query}' not found.`);
}
