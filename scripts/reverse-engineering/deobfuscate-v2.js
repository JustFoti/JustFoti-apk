const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, 'dlhd-stream.html');
const playerPath = path.join(__dirname, 'deobfuscated-player.js');
const outputPath = path.join(__dirname, 'fully-deobfuscated-player.js');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const playerContent = fs.readFileSync(playerPath, 'utf8');

console.log('[1/5] Extracting _0x8b05 array from HTML...');
// 1. Extract _0x8b05 array
const arrayMatch = htmlContent.match(/function _0x8b05\(\)\{const _0x21580f=\[.*?\];/s);
if (!arrayMatch) {
    console.error("Could not find _0x8b05 array");
    process.exit(1);
}
const arrayScript = arrayMatch[0] + "return _0x8b05();}";

console.log('[2/5] Extracting _0xb4a0 deobfuscation function...');
// 2. Extract _0xb4a0 function
const funcStart = htmlContent.indexOf('function _0xb4a0(_0x447697,_0x51a3a4){');
if (funcStart === -1) {
    console.error("Could not find _0xb4a0 function");
    process.exit(1);
}
const funcEnd = htmlContent.indexOf('(function(_0x9dcbec,_0x4ab1b0){', funcStart);
const funcScript = htmlContent.substring(funcStart, funcEnd);

console.log('[3/5] Setting up VM context...');
// 3. Setup VM context to run the deobfuscation logic
const sandbox = {
    window: {},
    document: {},
    atob: (str) => Buffer.from(str, 'base64').toString('binary'),
    String: String,
    Array: Array,
    console: console
};
vm.createContext(sandbox);

// Execute the array definition and deobfuscation function
vm.runInContext(arrayScript, sandbox);
vm.runInContext(funcScript, sandbox);

console.log('[4/5] Deobfuscating player script...');
// 4. Deobfuscate the player script
let newContent = playerContent;
let replacementCount = 0;

// Regex to find function calls with hex arguments: identifier(0x123)
const callRegex = /(_0x[a-f0-9]+)\((0x[a-f0-9]+)\)/g;

newContent = newContent.replace(callRegex, (match, funcName, arg) => {
    try {
        const val = parseInt(arg, 16);
        const result = sandbox._0xb4a0(val);

        if (typeof result === 'string') {
            replacementCount++;
            // Escape quotes and special characters in the result
            const escaped = result.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
            return `'${escaped}'`;
        }
    } catch (e) {
        // Not a valid deobfuscation call, keep original
    }
    return match;
});

console.log(`[5/5] Made ${replacementCount} replacements`);
fs.writeFileSync(outputPath, newContent, 'utf8');
console.log(`✓ Deobfuscation complete. Saved to ${outputPath}`);
