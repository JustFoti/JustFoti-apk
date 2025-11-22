const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'extracted-script-4.js');
const source = fs.readFileSync(inputFile, 'utf8');

// Find the split point between the header (array + decoder + shuffle) and the rest.
// Based on analysis, it looks like: ...)])){function
const splitString = ')])){function';
const splitIndex = source.indexOf(splitString);

if (splitIndex === -1) {
    console.error("Could not find split point.");
    process.exit(1);
}

// Extract header
// Include the closing parens: )]))
let header = source.substring(0, splitIndex + 4);

// Remove anti-tamper
// new _0x556ec0(_0x32e7)['ahGfRn']()
header = header.replace(/new _0x556ec0\(_0x32e7\)\['ahGfRn'\]\(\)/g, 'void 0');

// Append export
header += ';\nmodule.exports = { decoder: _0x32e7, array: _0x5bd0 };';

// Write header to file
const headerFile = path.join(__dirname, 'temp-header.js');
fs.writeFileSync(headerFile, header);

console.log("Header written to temp-header.js");

try {
    // Require the header to execute it and get the decoder
    const { decoder } = require('./temp-header.js');
    console.log("Header executed successfully. Decoder obtained.");

    // Process the rest of the file
    // The rest starts after the split point
    // But we need to handle the {function part.
    // The split string was )])){function
    // We took up to )]))
    // So the rest is {function...
    let body = source.substring(splitIndex + 4);

    // Regex to find decoder calls: _0x32e7(num, string)
    // The decoder takes 2 args.
    // Example: _0x32e7(0x1b3,0x13b) or _0x32e7(0x174, '...')?
    // Looking at extracted-script-4.js, calls look like: _0x32e7(0x1b3,0x13b)
    // Wait, the decoder signature is function(_0x37e429,_0x42b790)
    // But inside it does _0x37e429 = _0x37e429 - ...
    // And uses _0x5bd0[_0x37e429].
    // So it takes an index.
    // The second arg might be unused or used for something else?
    // In the file: _0x32e7(0x1b3,0x13b)
    // So 2 args.

    const callRegex = /_0x32e7\((-?0x[0-9a-f]+|-?[0-9]+),\s*(-?0x[0-9a-f]+|-?[0-9]+)\)/g;

    let replaceCount = 0;
    const deobfuscated = body.replace(callRegex, (match, p1, p2) => {
        try {
            // Evaluate arguments
            // They are numbers or hex
            const arg1 = parseInt(p1);
            const arg2 = parseInt(p2); // This might be string? No, regex matches numbers.

            // Call decoder
            const result = decoder(arg1, arg2);
            replaceCount++;
            return JSON.stringify(result);
        } catch (e) {
            console.error(`Error decoding ${match}:`, e.message);
            return match;
        }
    });

    console.log(`Replaced ${replaceCount} calls.`);

    // Save deobfuscated file
    const outputFile = path.join(__dirname, 'deobfuscated-script-4.js');
    fs.writeFileSync(outputFile, deobfuscated);
    console.log(`Deobfuscated script saved to ${outputFile}`);

} catch (e) {
    console.error("Error executing header:", e);
}
