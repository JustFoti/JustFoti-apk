const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-player.js');
const content = fs.readFileSync(filePath, 'utf8');

const query = "[' mis";
const pos = content.indexOf(query);

if (pos !== -1) {
    console.log(`Found '${query}' at index ${pos}`);
    const start = Math.max(0, pos - 50);
    const end = Math.min(content.length, pos + 100);
    console.log('Context:');
    console.log(content.substring(start, end));
} else {
    console.log(`'${query}' not found.`);
}
