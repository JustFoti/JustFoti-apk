const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'extracted-script-4.js');
const source = fs.readFileSync(inputFile, 'utf8');

const startString = 'function _0x2df43f';
const startIndex = source.indexOf(startString);

if (startIndex !== -1) {
    const funcStart = startIndex; // Starts at 'function'

    let braceCount = 0;
    let endIndex = -1;
    let foundStart = false;

    for (let i = funcStart; i < source.length; i++) {
        if (source[i] === '{') {
            braceCount++;
            foundStart = true;
        } else if (source[i] === '}') {
            braceCount--;
            if (foundStart && braceCount === 0) {
                endIndex = i + 1;
                break;
            }
        }
    }

    if (endIndex !== -1) {
        const funcCode = source.substring(funcStart, endIndex) + ';';
        const outputFile = path.join(__dirname, 'helper-function-5.js');
        fs.writeFileSync(outputFile, funcCode);
        console.log("Extracted helper function to helper-function-5.js");
    } else {
        console.error("Could not find end of helper function.");
    }
} else {
    console.error("Could not find start of helper function.");
}
