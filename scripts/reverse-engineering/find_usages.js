const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-player.js');
const content = fs.readFileSync(filePath, 'utf8');

function findAndLog(query) {
    let pos = 0;
    let found = false;
    while ((pos = content.indexOf(query, pos)) !== -1) {
        found = true;
        console.log(`Found '${query}' at index ${pos}`);
        const start = Math.max(0, pos - 100);
        const end = Math.min(content.length, pos + 100);
        console.log('Context:');
        console.log(content.substring(start, end));
        pos += 1;
    }
    if (!found) {
        console.log(`'${query}' not found.`);
    }
}

console.log('--- Searching for #f ---');
findAndLog('#f');

console.log('--- Searching for new _0x488316 ---');
findAndLog('new _0x488316');
