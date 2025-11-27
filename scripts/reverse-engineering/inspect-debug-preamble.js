const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'debug-preamble.js');
const fd = fs.openSync(filePath, 'r');
const buffer = Buffer.alloc(1000);
// Read around the end of _0xb4a0
fs.readSync(fd, buffer, 0, 1000, 76000);
console.log(buffer.toString());
fs.closeSync(fd);
