const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dlhd-script-formatted.js');
const code = fs.readFileSync(filePath, 'utf8');
const lines = code.split('\n');

const target = 'class _0x1685e0 extends _0x244498';

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(target)) {
        console.log(`Found on line ${i + 1}`);
        break;
    }
}
