const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'extracted-script-4.js');
const source = fs.readFileSync(inputFile, 'utf8');

console.log("File size:", source.length);
console.log("First 100 chars:", source.substring(0, 100));

const varName = '_0x135a29';
const index = source.indexOf(varName);

if (index !== -1) {
    console.log(`Found ${varName} at index ${index}`);
    console.log("Context:", source.substring(index - 50, index + 50));
} else {
    console.log(`${varName} not found.`);

    // Search for object init
    // var _0xXXXXXX={};
    // Regex: var _0x[a-f0-9]+=\{
    const regex = /var _0x[a-f0-9]+=\{/g;
    let match;
    let count = 0;
    while ((match = regex.exec(source)) !== null) {
        console.log(`Found object init: ${match[0]} at ${match.index}`);
        count++;
        if (count > 5) break; // Only show first few
    }
}
