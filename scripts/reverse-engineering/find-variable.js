const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'extracted-script-4.js');
const source = fs.readFileSync(inputFile, 'utf8');

const searchString = '_0x54904b';
let pos = source.indexOf(searchString);
while (pos !== -1) {
    console.log(`Found at ${pos}`);
    const start = Math.max(0, pos - 50);
    const end = Math.min(source.length, pos + 50);
    console.log(`Context: ${source.substring(start, end)}`);
    pos = source.indexOf(searchString, pos + 1);
}
