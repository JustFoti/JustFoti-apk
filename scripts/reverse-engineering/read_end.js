const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-player.js');
const content = fs.readFileSync(filePath, 'utf8');

const end = content.length;
const start = Math.max(0, end - 2000);

console.log('Last 2000 characters:');
console.log(content.substring(start, end));
