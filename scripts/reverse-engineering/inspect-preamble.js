const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'debug-preamble.js');
const content = fs.readFileSync(filePath, 'utf8');

console.log("Total length:", content.length);
console.log("Last 500 chars:");
console.log(content.slice(-500));
