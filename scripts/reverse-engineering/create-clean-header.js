const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'debug-header.js');
const source = fs.readFileSync(inputFile, 'utf8');

// Extract array
const arrayRegex = /var _0x5bd0=\[.*?\];/;
const arrayMatch = source.match(arrayRegex);

// Extract decoder function
// It starts with var _0x32e7=function
// And ends with }; before the IIFE
const decoderStart = source.indexOf('var _0x32e7=function');
const iifeStart = source.indexOf('(function');
const decoder = source.substring(decoderStart, iifeStart);

// Extract IIFE
const iife = source.substring(iifeStart);

if (arrayMatch && decoder && iife) {
    const cleanContent = `
${arrayMatch[0]}
${decoder}
${iife}

module.exports = {
    _0x5bd0: _0x5bd0,
    _0x32e7: _0x32e7
};
`;
    const outputFile = path.join(__dirname, 'clean-header.js');
    fs.writeFileSync(outputFile, cleanContent);
    console.log("Created clean-header.js");
} else {
    console.error("Failed to extract parts.");
    console.log("Array match:", !!arrayMatch);
    console.log("Decoder found:", decoderStart !== -1);
    console.log("IIFE found:", iifeStart !== -1);
}
