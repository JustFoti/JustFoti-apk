const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-player.js');
const content = fs.readFileSync(filePath, 'utf8');

const index = 208358;
const start = Math.max(0, index - 500);
const end = Math.min(content.length, index + 1000);

console.log('Context around index ' + index + ':');
console.log(content.substring(start, end));
