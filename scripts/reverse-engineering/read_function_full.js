const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-player.js');
const content = fs.readFileSync(filePath, 'utf8');

const index = 28750;
const start = Math.max(0, index);
const end = Math.min(content.length, index + 2000);

console.log('---START---');
console.log(content.substring(start, end));
console.log('---END---');
