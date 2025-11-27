const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-player.js');
const content = fs.readFileSync(filePath, 'utf8');

let pos = 0;
while ((pos = content.indexOf('runPop', pos)) !== -1) {
    console.log(`Found 'runPop' at index ${pos}`);
    const start = Math.max(0, pos - 100);
    const end = Math.min(content.length, pos + 100);
    console.log('Context:');
    console.log(content.substring(start, end));
    pos += 1;
}
