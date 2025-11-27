const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dlhd-script.js');
const fd = fs.openSync(filePath, 'r');
const buffer = Buffer.alloc(1000);
// Read after the split point (78274)
fs.readSync(fd, buffer, 0, 1000, 78300);
console.log(buffer.toString());
fs.closeSync(fd);
