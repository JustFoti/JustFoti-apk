const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'extracted-script-4.js');
let source = fs.readFileSync(inputFile, 'utf8');

// We found _0x135a29 at index 6825.
// It is initialized as _0x135a29={};
// Then populated.
// We need to find where the population ends.
// It usually ends when _0x135a29 is assigned to another variable or used.
// In deobfuscated code we saw: var _0x22f029=_0x135a29;
// Let's search for that assignment.
// Or search for the start of the main logic which uses _0x22f029.

const assignRegex = /var _0x[a-f0-9]+=_0x135a29/;
const match = source.match(assignRegex);

if (match) {
    console.log("Found assignment:", match[0]);
    const injectionPoint = match.index;

    // Inject dump code before the assignment
    const dumpCode = `
    console.log("--- DICTIONARY DUMP START ---");
    console.log(JSON.stringify(_0x135a29, (k, v) => {
        if (typeof v === 'function') return v.toString();
        return v;
    }, 2));
    console.log("--- DICTIONARY DUMP END ---");
    process.exit(0);
    `;

    const newSource = source.slice(0, injectionPoint) + dumpCode + source.slice(injectionPoint);

    // We also need to handle the anti-tamper check in the header.
    // new _0x556ec0(_0x32e7)['ahGfRn']()
    // Replace it with void 0
    const fixedSource = newSource.replace(/new _0x556ec0\(_0x32e7\)\['ahGfRn'\]\(\)/g, 'void 0');

    const outputFile = path.join(__dirname, 'script-4-dump.js');
    fs.writeFileSync(outputFile, fixedSource);
    console.log("Created script-4-dump.js");

} else {
    console.error("Could not find assignment to inject dump code.");
    // Fallback: search for the end of the dictionary population.
    // It looks like: ... = function(_0xXXXX){return ...};
    // And then the next statement.
    // Maybe we can just search for the string "var _0x22f029=_0x135a29" manually if regex fails?
    // But we know _0x135a29 exists.

    // Let's try to find where _0x135a29 is used next.
    // It is aliased.
    // Let's print the context around 15000 chars to see.
    console.log("Context around 15000:", source.substring(14000, 16000));
}
