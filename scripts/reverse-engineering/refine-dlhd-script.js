const fs = require('fs');
const path = require('path');
const vm = require('vm');

const inputPath = path.join(__dirname, 'dlhd-script.js');
const outputPath = path.join(__dirname, 'dlhd-script-refined.js');
const debugDumpPath = path.join(__dirname, 'debug-preamble-dump.js');

const rawCode = fs.readFileSync(inputPath, 'utf8');

// The file starts with a large object assignment: window['...'] = { ... }
// Then the obfuscation preamble starts.
// We need to find where the preamble starts.
// It seems to start with `function _0x8b05`.

const preambleStart = rawCode.indexOf('function _0x8b05');
const mainCodeStart = rawCode.indexOf('!(function(){\'use strict\';');

if (preambleStart === -1 || mainCodeStart === -1) {
    console.error('Could not find preamble or main code start.');
    process.exit(1);
}

const preamble = rawCode.substring(preambleStart, mainCodeStart);
const mainCode = rawCode.substring(mainCodeStart);

console.log('Preamble length:', preamble.length);

// Evaluate the preamble
try {
    global.window = {};
    global.document = {};

    // Remove trailing comma if present
    let safePreamble = preamble.trim();
    if (safePreamble.endsWith(',')) {
        safePreamble = safePreamble.slice(0, -1);
    }

    // Fix balance
    let pCount = 0;
    let bCount = 0;
    for (const char of safePreamble) {
        if (char === '{') bCount++;
        else if (char === '}') bCount--;
        else if (char === '(') pCount++;
        else if (char === ')') pCount--;
    }

    while (pCount > 0) {
        safePreamble += ')';
        pCount--;
    }
    while (bCount > 0) {
        safePreamble += '}';
        bCount--;
    }

    // Add semicolon
    safePreamble += ';';

    // Use vm.runInThisContext to execute the preamble in the global scope
    vm.runInThisContext(safePreamble);
} catch (e) {
    console.error('Error evaluating preamble:', e);
    fs.writeFileSync(debugDumpPath, preamble);
    process.exit(1);
}

if (typeof _0xb4a0 !== 'function') {
    console.error('_0xb4a0 is not defined after eval.');
    process.exit(1);
}

console.log('Obfuscation function _0xb4a0 loaded.');

// 3. Find all aliases of _0xb4a0 (recursive)
console.log('Identifying aliases for _0xb4a0...');
const knownAliases = new Set(['_0xb4a0']);
let foundNew = true;

// We'll loop until no new aliases are found
while (foundNew) {
    foundNew = false;
    // Regex to find "const X = Y" or "var X = Y" or "let X = Y" or just "X = Y"
    // Create a regex that matches assignment from any known alias
    const aliasPattern = Array.from(knownAliases).map(a => a.replace('$', '\\$')).join('|');
    const regex = new RegExp(`(?:const|let|var)?\\s*([a-zA-Z0-9_$]+)\\s*=\\s*(${aliasPattern})[;,]`, 'g');

    let match;
    while ((match = regex.exec(mainCode)) !== null) {
        const newAlias = match[1];
        if (!knownAliases.has(newAlias)) {
            knownAliases.add(newAlias);
            foundNew = true;
        }
    }
}

console.log(`Found ${knownAliases.size} aliases:`, Array.from(knownAliases));

// 4. Replace all obfuscated calls
console.log('Replacing obfuscated calls...');
let replaceCount = 0;

// Construct a regex to match any alias call: alias(0x...)
// We sort aliases by length (descending) to avoid partial matches
const sortedAliases = Array.from(knownAliases).sort((a, b) => b.length - a.length);
const aliasCallPattern = new RegExp(`\\b(${sortedAliases.map(a => a.replace('$', '\\$')).join('|')})\\s*\\(\\s*(0x[0-9a-fA-F]+)\\s*\\)`, 'g');

let refinedCode = mainCode.replace(aliasCallPattern, (match, alias, hexArg) => {
    try {
        const result = _0xb4a0(parseInt(hexArg, 16));
        replaceCount++;
        // Escape single quotes and newlines for the replacement string
        const safeResult = result.replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
        return `'${safeResult}'`;
    } catch (e) {
        console.error(`Error decoding ${match}: ${e.message}`);
        return match;
    }
});

console.log(`Replaced ${replaceCount} obfuscated calls.`);

// Concatenate string literals
let prevCode;
do {
    prevCode = refinedCode;
    refinedCode = refinedCode.replace(/'([^']*)'\s*\+\s*'([^']*)'/g, (match, s1, s2) => {
        return `'${s1}${s2}'`;
    });
} while (refinedCode !== prevCode);

// Write output
fs.writeFileSync(outputPath, refinedCode, 'utf8');
console.log(`Refined code written to ${outputPath}`);
