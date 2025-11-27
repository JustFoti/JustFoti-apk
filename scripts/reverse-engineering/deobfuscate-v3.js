// deobfuscate-v3.js
// Improved script to extract obfuscation array and function from dlhd-stream.html and deobfuscate deobfuscated-player.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, 'dlhd-stream.html');
const playerPath = path.join(__dirname, 'deobfuscated-player.js');
const outputPath = path.join(__dirname, 'fully-deobfuscated-player-v3.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const player = fs.readFileSync(playerPath, 'utf8');

// 1. Extract the obfuscation array (e.g., var _0x8b05 = [ ... ];)
const arrayRegex = /var\s+(_0x[0-9a-f]+)\s*=\s*\[(.*?)\];/s;
const arrayMatch = html.match(arrayRegex);
if (!arrayMatch) {
    console.error('Failed to locate obfuscation array in HTML');
    process.exit(1);
}
const arrayName = arrayMatch[1];
const arrayContent = '[' + arrayMatch[2] + ']';
const arrayScript = `const ${arrayName} = ${arrayContent};`;

// 2. Extract the deobfuscation function (e.g., function _0xb4a0(a,b){...})
const funcRegex = /function\s+(_0x[0-9a-f]+)\s*\([^)]*\)\s*\{[\s\S]*?\}/;
const funcMatch = html.match(funcRegex);
if (!funcMatch) {
    console.error('Failed to locate deobfuscation function in HTML');
    process.exit(1);
}
const funcScript = funcMatch[0];

// 3. Prepare VM sandbox
const sandbox = { console, Buffer, atob: (s) => Buffer.from(s, 'base64').toString('binary') };
vm.createContext(sandbox);

// 4. Run extracted code in sandbox
vm.runInContext(arrayScript, sandbox);
vm.runInContext(funcScript, sandbox);

// 5. Helper to deobfuscate a hex argument using the extracted function
function deobfuscateHex(hexStr) {
    const val = parseInt(hexStr, 16);
    try {
        const result = sandbox[funcMatch[1]](val);
        return typeof result === 'string' ? result : null;
    } catch (e) {
        return null;
    }
}

// 6. Replace obfuscated calls in player script
const callRegex = /(_0x[0-9a-f]+)\((0x[0-9a-f]+)\)/g;
let replacements = 0;
const deobfuscated = player.replace(callRegex, (match, fn, arg) => {
    const decoded = deobfuscateHex(arg);
    if (decoded !== null) {
        replacements++;
        // Escape single quotes and backslashes
        const escaped = decoded.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return `'${escaped}'`;
    }
    return match;
});

fs.writeFileSync(outputPath, deobfuscated, 'utf8');
console.log(`Deobfuscation complete. Replacements made: ${replacements}`);
console.log(`Output written to ${outputPath}`);
