const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-player.js');
const content = fs.readFileSync(filePath, 'utf8');

const startIndex = 181971;
// Estimate length, or use brace counting to find end
let braceCount = 0;
let endIndex = -1;
let inString = false;
let stringChar = '';

for (let i = startIndex + 'class _0x488316{'.length - 1; i < content.length; i++) {
    const char = content[i];

    if (inString) {
        if (char === stringChar && content[i - 1] !== '\\') {
            inString = false;
        }
    } else {
        if (char === '"' || char === "'" || char === '`') {
            inString = true;
            stringChar = char;
        } else if (char === '{') {
            braceCount++;
        } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
                endIndex = i;
                break;
            }
        }
    }
}

if (endIndex !== -1) {
    const classBody = content.substring(startIndex, endIndex + 1);
    fs.writeFileSync(path.join(__dirname, 'class_0x488316.js'), classBody);
    console.log('Class dumped to class_0x488316.js');
} else {
    console.log('Could not find end of class');
}
