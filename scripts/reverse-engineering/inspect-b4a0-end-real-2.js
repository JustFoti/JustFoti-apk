const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dlhd-script.js');
const fd = fs.openSync(filePath, 'r');
const buffer = Buffer.alloc(500);
fs.readSync(fd, buffer, 0, 500, 77500);
console.log(buffer.toString());
fs.closeSync(fd);
