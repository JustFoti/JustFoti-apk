const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dlhd-script.js');
const content = fs.readFileSync(filePath, 'utf8');

// Search for a smaller chunk near the end of _0xb4a0
const searchString = "_0x180ea8;},_0xb4a0(_0x447697,_0x51a3a4);";
const b4a0End = content.indexOf(searchString);
console.log("b4a0 end index (short search):", b4a0End);

if (b4a0End !== -1) {
    console.log("End of _0xb4a0 is at:", b4a0End + searchString.length);
    // Check what follows
    console.log("Next 50 chars:", content.substring(b4a0End + searchString.length, b4a0End + searchString.length + 50));
}
