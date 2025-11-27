const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dlhd-stream-fresh.html');
const content = fs.readFileSync(filePath, 'utf8');

// Find the start of the dictionary
// The dictionary contains `FK:"ruxfqd"`
const startMarker = 'FK:"ruxfqd"';
const startIndex = content.indexOf(startMarker);

if (startIndex === -1) {
    console.log("Could not find the obfuscated dictionary pattern.");
    process.exit(1);
}

console.log("Found dictionary start at index:", startIndex);

// Find the end of the dictionary
// It ends with `}).reduce`
const endMarker = '}).reduce';
const endIndex = content.indexOf(endMarker, startIndex);

if (endIndex === -1) {
    console.log("Could not find the end of the dictionary.");
    process.exit(1);
}

console.log("Found dictionary end at index:", endIndex);

// Extract the dictionary content
// It's likely wrapped in `{...}` but we found `FK:"ruxfqd"...` which is inside.
// We need to find the opening brace `{` before `FK`.
const openBraceIndex = content.lastIndexOf('{', startIndex);
if (openBraceIndex === -1) {
    console.log("Could not find the opening brace.");
    process.exit(1);
}

const dictionaryString = content.substring(openBraceIndex, endIndex + 1); // +1 to include '}'

// Clean up the string to make it valid JSON if possible
// The keys are not quoted? `FK:"ruxfqd"`. Yes they are unquoted identifiers.
// We need to quote them to parse as JSON, or just use regex.
// Regex is safer as the values might contain quotes.

function rotate(str) {
    if (typeof str !== 'string') return str;
    return str.split("").map(i => {
        let w = i.charCodeAt(0);
        // (w-65+26-12)%26+65 -> (w-65+14)%26+65
        if (w >= 65 && w <= 90) {
            return String.fromCharCode((w - 65 + 14) % 26 + 65);
        }
        if (w >= 97 && w <= 122) {
            return String.fromCharCode((w - 97 + 14) % 26 + 97);
        }
        return i;
    }).join("");
}

const regex = /([a-zA-Z0-9_]+):"([^"]+)"/g;
let match;
const decoded = {};

while ((match = regex.exec(dictionaryString)) !== null) {
    const key = match[1];
    const val = match[2];
    decoded[key] = rotate(val);
}

console.log("Decoded strings count:", Object.keys(decoded).length);
console.log("Decoded strings (sample):");
Object.keys(decoded).slice(0, 10).forEach(k => console.log(`${k}: ${decoded[k]}`));

// Check for m3u8 or http links in decoded values
console.log("\nPotential URLs:");
Object.values(decoded).forEach(v => {
    if (v.includes('http') || v.includes('.m3u8') || v.includes('source') || v.includes('token')) {
        console.log(v);
    }
});

// Save decoded dictionary to file
fs.writeFileSync(path.join(__dirname, 'decoded-dictionary.json'), JSON.stringify(decoded, null, 2));
