const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-player.js');
const content = fs.readFileSync(filePath, 'utf8');

const index = 181971;
const start = index;
const end = Math.min(content.length, index + 2000);
const extracted = content.substring(start, end);

fs.writeFileSync(path.join(__dirname, 'constructor_code.txt'), extracted);
