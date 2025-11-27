const fs = require('fs');
const path = require('path');
const { _0xb4a0 } = require('./deobfuscator.js');

const filePath = path.join(__dirname, 'dlhd-stream.html');
const content = fs.readFileSync(filePath, 'utf8');

// Extract the class _0x33c685
const classStartMarker = "_0x33c685=class extends";
const classStartIndex = content.indexOf(classStartMarker);

if (classStartIndex === -1) {
    console.error("Could not find class start.");
    process.exit(1);
}

// Find the end of the class (heuristic: it ends before the next class or end of script)
// Actually, let's just take a large chunk and rely on regex replacement
// Find the end of the script tag
const scriptEndMarker = "</script>";
const scriptEndIndex = content.indexOf(scriptEndMarker, classStartIndex);

if (scriptEndIndex === -1) {
    console.error("Could not find script end.");
    process.exit(1);
}

const classContent = content.substring(classStartIndex, scriptEndIndex);

// Regex to find _0x2ee016(0x...) calls
// The variable name for the deobfuscator might vary in different scopes, 
// but in the class it seems to be _0x2ee016 assigned from _0xb4a0?
// Wait, inside the class constructor: `const _0x4252fc=_0x2ee016;`
// And `_0x2ee016` is defined globally?
// In the IIFE: `const _0x2ee016=_0xb4a0;`
// So we can look for `_0x2ee016(0x...)` or `_0x4252fc(0x...)` etc.
// But the deobfuscator function itself is `_0xb4a0`.
// The calls look like `_0x2ee016(0xc7a)`.

// We will replace any function call that looks like `_0x.....(0x...)` where the function name maps to the deobfuscator.
// But simpler: just look for `(0x[0-9a-f]+)` and try to deobfuscate it using `_0xb4a0`.
// However, we need to be careful not to replace other calls.
// The pattern is usually `_0x.....(0x...)`.

// Let's try to replace `_0x2ee016(0x...)` specifically first, as it's the main one.
// Also `_0x4252fc` in constructor.
// We can use a regex that matches `_0x[a-f0-9]+\(0x[a-f0-9]+\)` and check if the result makes sense.

let deobfuscated = classContent.replace(/_0x[a-f0-9]+\((0x[a-f0-9]+)\)/g, (match, hex) => {
    try {
        const val = parseInt(hex, 16);
        const decoded = _0xb4a0(val);
        // Escape quotes in decoded string
        const escaped = decoded.replace(/'/g, "\\'");
        return `'${escaped}'`;
    } catch (e) {
        return match;
    }
});

// Also replace `_0x2ee016` with `_0xb4a0` just in case
// deobfuscated = deobfuscated.replace(/_0x2ee016/g, '_0xb4a0');

fs.writeFileSync(path.join(__dirname, 'deobfuscated-player.js'), deobfuscated);
console.log("Deobfuscated player class to deobfuscated-player.js");
