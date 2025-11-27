const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-player.js');
const content = fs.readFileSync(filePath, 'utf8');

function findAndLog(query) {
    const index = content.indexOf(query);
    if (index !== -1) {
        console.log(`Found '${query}' at index ${index}`);
        const start = Math.max(0, index - 200);
        const end = Math.min(content.length, index + 200);
        console.log('Context:');
        console.log(content.substring(start, end));
    } else {
        console.log(`'${query}' not found.`);
    }
}

findAndLog('.#b=');
findAndLog('.#b =');
