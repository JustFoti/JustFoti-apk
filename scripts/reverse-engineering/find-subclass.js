const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dlhd-script-formatted.js');
const code = fs.readFileSync(filePath, 'utf8');

const regex = /class\s+([a-zA-Z0-9_$]+)\s+extends\s+([a-zA-Z0-9_$]+)/g;
let match;

console.log(`Searching for subclasses in ${filePath}...`);

while ((match = regex.exec(code)) !== null) {
    console.log(`Found subclass: ${match[1]} extends ${match[2]} at index ${match.index}`);
    // Print context
    const start = Math.max(0, match.index - 50);
    const end = Math.min(code.length, match.index + 100);
    console.log(`Context: ...${code.substring(start, end).replace(/\n/g, ' ')}...`);
}
