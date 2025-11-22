const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'extracted-script-4.js');
const source = fs.readFileSync(inputFile, 'utf8');

const arrayEnd = source.indexOf('];');
if (arrayEnd !== -1) {
    console.log("Array end at:", arrayEnd);
    console.log("Context:", source.substring(arrayEnd, arrayEnd + 100));

    // Look for IIFE start
    const iifeStart = source.indexOf('(function', arrayEnd);
    if (iifeStart !== -1) {
        console.log("IIFE start at:", iifeStart);

        // Look for IIFE end
        // It should end with something like: }(_0x5bd0, ...));
        // We can search for `}(_0x5bd0`
        const iifeEnd = source.indexOf('}(_0x5bd0', iifeStart);
        if (iifeEnd !== -1) {
            console.log("IIFE end start at:", iifeEnd);
            console.log("Context around IIFE end:", source.substring(iifeEnd, iifeEnd + 50));
        } else {
            console.log("Could not find IIFE end with }(_0x5bd0");
        }
    }
} else {
    console.log("Array end not found.");
}
