const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'dict-dump.txt');
let content;
try {
    content = fs.readFileSync(inputFile, 'utf8');
    if (content.indexOf('--- DICTIONARY DUMP START ---') === -1) {
        throw new Error("Not found in utf8");
    }
} catch (e) {
    content = fs.readFileSync(inputFile, 'utf16le');
}

const startMarker = '--- DICTIONARY DUMP START ---';
const endMarker = '--- DICTIONARY DUMP END ---';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const jsonString = content.substring(startIndex + startMarker.length, endIndex).trim();
    // The dump has functions as strings "function(...){...}".
    // We want to keep them as strings in the JSON for now.
    // The dump was created with JSON.stringify(..., replacer).
    // So it is valid JSON.

    const outputFile = path.join(__dirname, 'decoded-dictionary.json');
    fs.writeFileSync(outputFile, jsonString);
    console.log("Saved decoded-dictionary.json");
} else {
    console.error("Could not find dump markers.");
}
