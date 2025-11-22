const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'extracted-script-1.js');
const source = fs.readFileSync(inputFile, 'utf8');

const index = source.indexOf('const kt="x4G9Tq2Kw6R7v1Dy3P0B5N8Lc9M2zF",Et="ZpQw9XkLmN8c3vR3"');
if (index === -1) {
    console.log("Could not find the definition of Et.");
} else {
    console.log("Found definition at index:", index);
    // Print context after definition
    console.log("Context after definition:");
    console.log(source.substring(index, index + 1000));
}

// Search for other usages of Et
let pos = index + 1;
while ((pos = source.indexOf('Et', pos)) !== -1) {
    // Check if it's a standalone variable usage (heuristic)
    const charBefore = source[pos - 1];
    const charAfter = source[pos + 2];
    if (/[^a-zA-Z0-9_]/.test(charBefore) && /[^a-zA-Z0-9_]/.test(charAfter)) {
        console.log(`Found usage at ${pos}:`);
        console.log(source.substring(pos - 100, pos + 100));
    }
    pos += 1;
}
