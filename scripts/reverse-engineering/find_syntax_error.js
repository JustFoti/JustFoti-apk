const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-player.js');
const content = fs.readFileSync(filePath, 'utf8');

const query = "_0x2359c0='descriptor'";
const pos = content.indexOf(query);

if (pos !== -1) {
    console.log(`Found '${query}' at index ${pos}`);
    const start = Math.max(0, pos - 100);
    const end = Math.min(content.length, pos + 200);
    console.log('Context:');
    console.log(content.substring(start, end));
} else {
    console.log(`'${query}' not found.`);
    // Try shorter query
    const shortQuery = "_0x2359c0";
    const shortPos = content.indexOf(shortQuery);
    if (shortPos !== -1) {
        console.log(`Found '${shortQuery}' at index ${shortPos}`);
        const start = Math.max(0, shortPos - 100);
        const end = Math.min(content.length, shortPos + 200);
        console.log('Context:');
        console.log(content.substring(start, end));
    }
}
