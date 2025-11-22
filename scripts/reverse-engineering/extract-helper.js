const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'extracted-script-4.js');
const source = fs.readFileSync(inputFile, 'utf8');

const startString = '_0x599da4=function';
const startIndex = source.indexOf(startString);

if (startIndex !== -1) {
    // It is likely `var _0x599da4=function...` or `,_0x599da4=function...`
    // We want to extract the function body.
    // It starts at `function`.
    const funcStart = source.indexOf('function', startIndex);

    // We need to find the matching closing brace.
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
        const funcCode = 'var _0x599da4=' + source.substring(funcStart, endIndex) + ';';
        const outputFile = path.join(__dirname, 'helper-function.js');
        fs.writeFileSync(outputFile, funcCode);
        console.log("Extracted helper function to helper-function.js");
    } else {
        console.error("Could not find end of helper function.");
    }
} else {
    console.error("Could not find start of helper function.");
}
