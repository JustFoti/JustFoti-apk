const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'debug-header.js');
const source = fs.readFileSync(inputFile, 'utf8');

console.log("Total length:", source.length);
console.log("Last 100 chars:", source.slice(-100));

// Check for void 0
const voidIndex = source.indexOf('void 0');
console.log("void 0 index:", voidIndex);
if (voidIndex !== -1) {
    console.log("Context around void 0:", source.substring(voidIndex - 50, voidIndex + 50));
}

// Check for unexpected semicolons
// The error was Unexpected token ';'
// Maybe there is ;; ?
const doubleSemi = source.indexOf(';;');
console.log("Double semicolon index:", doubleSemi);

// Check for ; at start of IIFE?
const iifeStart = source.indexOf('(function');
console.log("IIFE start:", iifeStart);
console.log("Context around IIFE start:", source.substring(iifeStart - 20, iifeStart + 20));
