const fs = require('fs');
const path = require('path');

// Load decoded source array
const decodedSourcePath = path.join(__dirname, 'decoded-source.json');
const decodedSource = JSON.parse(fs.readFileSync(decodedSourcePath, 'utf8'));
const _0x54904b = decodedSource;

// Load extracted script
const inputFile = path.join(__dirname, 'extracted-script-4.js');
const source = fs.readFileSync(inputFile, 'utf8');

// Find usages of _0x54904b[...]
// Regex to capture the index expression: _0x54904b\[(.*?)\]
// Note: The index expression might contain nested brackets or complex math.
// For simplicity, we'll assume it doesn't contain nested brackets for now, or we'll use a loop.

const regex = /_0x54904b\[([^\]]+)\]/g;
let match;

console.log("Analyzing _0x54904b usages...");

while ((match = regex.exec(source)) !== null) {
    const indexExpr = match[1];
    const fullMatch = match[0];
    const index = match.index;

    try {
        // Eval the index expression
        // We might need to mock some variables if they are used in the expression.
        // But usually these are just math operations with hex numbers.
        const calculatedIndex = eval(indexExpr);

        if (typeof calculatedIndex === 'number') {
            const value = _0x54904b[calculatedIndex];
            // Get context
            const start = Math.max(0, index - 50);
            const end = Math.min(source.length, index + fullMatch.length + 50);
            const context = source.substring(start, end);

            console.log(`Index: ${calculatedIndex}, Value: "${value}"`);
            console.log(`Context: ...${context.replace(fullMatch, `[${value}]`)}...`);
            console.log('---');
        } else {
            console.log(`Could not calculate index for: ${indexExpr}`);
        }
    } catch (e) {
        // console.error(`Error evaluating index "${indexExpr}":`, e.message);
    }
}
