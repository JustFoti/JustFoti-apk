const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-player.js');
const content = fs.readFileSync(filePath, 'utf8');

const index = 181971;
const start = Math.max(0, index - 5000);
const end = index;

console.log('Context before class _0x488316:');
console.log(content.substring(start, end));
