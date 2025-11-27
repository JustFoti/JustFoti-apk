const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-player.js');
const fd = fs.openSync(filePath, 'r');
const buffer = Buffer.alloc(3100);
fs.readSync(fd, buffer, 0, 3100, 181900);
console.log(buffer.toString('utf8'));
fs.closeSync(fd);
