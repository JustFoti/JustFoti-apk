const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-player.js');
const content = fs.readFileSync(filePath, 'utf8');

const regex = /JSON\['(.*?)'\]\s*=/g;
let match;
while ((match = regex.exec(content)) !== null) {
    console.log(`Found assignment to JSON['${match[1]}'] at index ${match.index}`);
    const start = Math.max(0, match.index - 100);
    const end = Math.min(content.length, match.index + 200);
    console.log('Context:');
    console.log(content.substring(start, end));
}
