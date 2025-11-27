const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dlhd-script-formatted.js');
const code = fs.readFileSync(filePath, 'utf8');

const regex = /window\[\s*['"]([^'"]+)['"]\s*\]\s*=/g;
let match;

console.log(`Analyzing ${filePath} for window assignments...`);

while ((match = regex.exec(code)) !== null) {
    const start = Math.max(0, match.index - 50);
    const end = Math.min(code.length, match.index + 100);
    const context = code.substring(start, end);
    console.log(`\nFound assignment to window['${match[1]}'] at index ${match.index}:`);
    console.log(`...${context.replace(/\n/g, ' ')}...`);
}

// Also check for dot notation if possible, though less likely with obfuscation
const regexDot = /window\.([a-zA-Z0-9_$]+)\s*=/g;
while ((match = regexDot.exec(code)) !== null) {
    const start = Math.max(0, match.index - 50);
    const end = Math.min(code.length, match.index + 100);
    const context = code.substring(start, end);
    console.log(`\nFound assignment to window.${match[1]} at index ${match.index}:`);
    console.log(`...${context.replace(/\n/g, ' ')}...`);
}
