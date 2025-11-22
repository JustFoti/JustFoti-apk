const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'extracted-script-4.js');
const source = fs.readFileSync(inputFile, 'utf8');

const regex = /\}\(_0x5bd0,.*?\)\)+/;
const match = source.match(regex);

if (match) {
    console.log("Match found!");
    console.log("Match length:", match[0].length);
    console.log("Match start:", match.index);
    console.log("Match end:", match.index + match[0].length);
    console.log("Match content (last 100 chars):", match[0].slice(-100));
    console.log("Next 20 chars:", source.substring(match.index + match[0].length, match.index + match[0].length + 20));
} else {
    console.log("No match found.");
}
