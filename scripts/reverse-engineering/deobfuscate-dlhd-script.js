const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, 'dlhd-script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// The split string we identified
const splitString = "}(_0x8b05,0x58bbd),!(function(){'use strict';";
const parts = scriptContent.split(splitString);

if (parts.length < 2) {
    console.error("Could not split the script. Marker not found.");
    process.exit(1);
}

// The preamble contains the dictionary and the shuffle logic
// We need to append the split string back to the preamble to make it valid JS (the IIFE close)
// But wait, the split string includes the start of the next IIFE `!(function...`
// So the preamble is parts[0] + "}(_0x8b05,0x58bbd);"
// Find the start of the function _0x8b05
const functionStart = scriptContent.indexOf('function _0x8b05');
if (functionStart === -1) {
    console.error("Could not find function _0x8b05");
    process.exit(1);
}

// The preamble is from functionStart to the split point
// parts[0] contains everything from start to split point
// We need to slice parts[0] from functionStart
const preambleContent = parts[0].substring(functionStart);

// The split point was "}(_0x8b05,0x58bbd),!(function(){'use strict';"
// So parts[0] ends right before that.
// We need to append the IIFE call to complete the shuffle function.
// The shuffle function starts with (function... and needs to be closed with }(_0x8b05,0x58bbd);
// Wait, the split string starts with "}(_0x8b05,0x58bbd)".
// So parts[0] ends with the closing brace of the shuffle function body "}".
// So we need to append "(_0x8b05,0x58bbd);" to call it.
// BUT, looking at inspect-shuffle.js, parts[0] ends with ...shift']());}}
// And the split string starts with }(_0x8b05...
// So we need to append "}(_0x8b05,0x58bbd));"
const preamble = preambleContent + "}(_0x8b05,0x58bbd));";

fs.writeFileSync(path.join(__dirname, 'debug-preamble.js'), preamble);
console.log("Dumped preamble to debug-preamble.js");

// The rest is the main logic, starting with "!(function(){'use strict';"
// We need to add the `!` back because it was part of the split string
// Actually, the split string was "}(_0x8b05,0x58bbd),!(function(){'use strict';"
// So parts[1] starts AFTER that.
// The main script should start with "!(function(){'use strict';"
// So we reconstruct:
const mainScript = "!(function(){'use strict';" + parts[1];

console.log("Preamble length:", preamble.length);
console.log("Main script length:", mainScript.length);

// Create a sandbox to run the preamble
const sandbox = {
    window: {},
    document: {},
    console: console
};
vm.createContext(sandbox);

// Run the preamble to define _0x8b05 and _0xb4a0 and shuffle the array
try {
    vm.runInContext(preamble, sandbox, { filename: 'preamble.js' });
    console.log("Preamble executed successfully.");
} catch (e) {
    console.error("Error executing preamble:", e);
    process.exit(1);
}

// Now we have _0xb4a0 available in the sandbox
// We use a heuristic: match ANY function call with hex arguments like _0x...(0x...)
// and try to decode it using _0xb4a0.
const regex = /(\w+)\((0x[0-9a-f]+)(?:,\s*(0x[0-9a-f]+))?\)/g;

let replacementCount = 0;
const deobfuscatedScript = mainScript.replace(regex, (match, funcName, p1, p2) => {
    try {
        // We ignore the function name and always use _0xb4a0
        const callCode = `_0xb4a0(${p1}${p2 ? ',' + p2 : ''})`;
        const result = vm.runInContext(callCode, sandbox, { filename: 'deobfuscate.js' });

        if (typeof result === 'string') {
            // Escape single quotes and newlines for insertion into code
            const escaped = result.replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
            replacementCount++;
            return `'${escaped}'`;
        } else {
            return match;
        }
    } catch (e) {
        // If it fails (e.g. index out of bounds, or not a deobfuscation call), keep original
        return match;
    }
});

console.log(`Replaced ${replacementCount} obfuscated strings.`);

// Save the result
const outputPath = path.join(__dirname, 'dlhd-script-deobfuscated.js');
fs.writeFileSync(outputPath, deobfuscatedScript);
console.log(`Saved deobfuscated script to ${outputPath}`);
