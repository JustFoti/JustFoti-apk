const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'extracted-script-4.js');
const source = fs.readFileSync(inputFile, 'utf8');

const iifeStart = source.indexOf('(function(_0x');
if (iifeStart !== -1) {
    console.log("IIFE start at:", iifeStart);
    console.log("Context before:", source.substring(iifeStart - 20, iifeStart));
} else {
    // Try searching for just (function
    const iifeStart2 = source.indexOf('(function');
    if (iifeStart2 !== -1) {
        console.log("IIFE start at:", iifeStart2);
        console.log("Context before:", source.substring(iifeStart2 - 20, iifeStart2));
    }
}
