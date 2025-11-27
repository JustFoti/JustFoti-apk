const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dlhd-script.js');
const content = fs.readFileSync(filePath, 'utf8');

const shuffleStart = content.indexOf('(function(_0x9dcbec');
console.log("Shuffle start index:", shuffleStart);

// Also check where _0xb4a0 ends
const b4a0End = content.indexOf('return _0x1b0aad?(_0x180ea8=_0xb4a0[\'Wfzvij\'](_0x180ea8),_0x447697[_0x4e371f]=_0x180ea8):_0x180ea8=_0x1b0aad,_0x180ea8;},_0xb4a0(_0x447697,_0x51a3a4);');
console.log("b4a0 end index:", b4a0End);
