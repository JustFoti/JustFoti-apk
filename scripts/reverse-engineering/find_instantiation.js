const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-player.js');
const content = fs.readFileSync(filePath, 'utf8');

function findAndLog(query) {
    const index = content.indexOf(query);
    if (index !== -1) {
        console.log(`Found '${query}' at index ${index}`);
        const start = Math.max(0, index - 500);
        const end = Math.min(content.length, index + 500);
        console.log('Context:');
        console.log(content.substring(start, end));
        console.log('-----------------------------------');
    } else {
        console.log(`'${query}' not found.`);
    }
}

findAndLog('class _0x488316');
findAndLog('new _0x488316');
findAndLog('runPop');
