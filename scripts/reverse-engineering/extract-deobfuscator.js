const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dlhd-stream.html');
const content = fs.readFileSync(filePath, 'utf8');

// Find the start of the array
const arrayStartMarker = "const _0x21580f=['";
const arrayStartIndex = content.indexOf(arrayStartMarker);

if (arrayStartIndex === -1) {
    console.error("Could not find array start.");
    process.exit(1);
}

// Find the end of the array
const arrayEndMarker = "];_0x8b05=function";
const arrayEndIndex = content.indexOf(arrayEndMarker, arrayStartIndex);

if (arrayEndIndex === -1) {
    console.error("Could not find array end.");
    process.exit(1);
}

const arrayContent = content.substring(arrayStartIndex, arrayEndIndex + 2); // Include ];

// Find the deobfuscator function
const funcStartMarker = "function _0xb4a0(_0x447697,_0x51a3a4){";
const funcStartIndex = content.indexOf(funcStartMarker);

if (funcStartIndex === -1) {
    console.error("Could not find function start.");
    process.exit(1);
}

// Find the end of the function (heuristic: it ends before the IIFE)
const funcEndMarker = "}(function(_0x9dcbec,_0x4ab1b0){";
const funcEndIndex = content.indexOf(funcEndMarker, funcStartIndex);

if (funcEndIndex === -1) {
    console.error("Could not find function end.");
    process.exit(1);
}

const funcContent = content.substring(funcStartIndex, funcEndIndex);

// Combine them into a file
const outputFile = path.join(__dirname, 'deobfuscator.js');
const outputContent = `
${arrayContent}
_0x8b05=function(){return _0x21580f;};
${funcContent}

module.exports = { _0xb4a0, _0x8b05 };
`;

fs.writeFileSync(outputFile, outputContent);
console.log("Extracted deobfuscator to", outputFile);
