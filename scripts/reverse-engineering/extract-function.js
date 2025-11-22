const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'deobfuscated-script-4.js');
const source = fs.readFileSync(inputFile, 'utf8');

const startString = 'function _0x368952';
const startIndex = source.indexOf(startString);

if (startIndex !== -1) {
    // Find the end of the function.
    // It ends before if(_0x368952===
    const endString = 'if(_0x368952===';
    const endIndex = source.indexOf(endString, startIndex);

    if (endIndex !== -1) {
        const funcCode = source.substring(startIndex, endIndex);
        const outputFile = path.join(__dirname, 'extracted-function.js');
        fs.writeFileSync(outputFile, funcCode);
        console.log("Extracted function to extracted-function.js");
    } else {
        console.error("Could not find end of function.");
    }
} else {
    console.error("Could not find start of function.");
}
