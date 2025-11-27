const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('DLHD Improved Decoder - Extracting and deobfuscating...\n');

// Read the obfuscated DLHD script
const inputFile = path.join(__dirname, 'dlhd-script.js');
if (!fs.existsSync(inputFile)) {
    console.error(`Error: Input file not found at ${inputFile}`);
    process.exit(1);
}

let source = fs.readFileSync(inputFile, 'utf8');

// Remove BOM if present
if (source.charCodeAt(0) === 0xFEFF) {
    source = source.slice(1);
}

console.log(`Source file loaded: ${source.length} bytes`);

// Helper to extract a code block (function or IIFE) using brace counting
function extractBlock(source, startIndex) {
    let openBraces = 0;
    let closeBraces = 0;
    let endIndex = -1;
    let foundStart = false;
    let inString = false;
    let stringChar = '';

    for (let i = startIndex; i < source.length; i++) {
        const char = source[i];

        if (inString) {
            if (char === stringChar && source[i - 1] !== '\\') {
                inString = false;
            }
            continue;
        }

        if (char === '"' || char === "'") {
            inString = true;
            stringChar = char;
            continue;
        }

        if (char === '{') {
            openBraces++;
            foundStart = true;
        } else if (char === '}') {
            closeBraces++;
        }

        if (foundStart && openBraces > 0 && openBraces === closeBraces) {
            endIndex = i + 1;
            break;
        }
    }

    if (endIndex !== -1) {
        return source.substring(startIndex, endIndex);
    }
    return null;
}

// 1. Extract Array Function _0x8b05
const arrayFuncStartMarker = 'function _0x8b05';
const arrayFuncStartIndex = source.indexOf(arrayFuncStartMarker);

if (arrayFuncStartIndex === -1) {
    console.error('Could not find _0x8b05 array function start');
    process.exit(1);
}

const arrayFuncCode = extractBlock(source, arrayFuncStartIndex);
if (!arrayFuncCode) {
    console.error('Failed to extract _0x8b05 function block');
    process.exit(1);
}
console.log('Extracted _0x8b05 function.');

// 2. Extract Decoder Function _0xb4a0
const decoderStartMarker = 'function _0xb4a0';
const decoderStartIndex = source.indexOf(decoderStartMarker);

if (decoderStartIndex === -1) {
    console.error('Could not find _0xb4a0 decoder function start');
    process.exit(1);
}

const decoderCode = extractBlock(source, decoderStartIndex);
if (!decoderCode) {
    console.error('Failed to extract _0xb4a0 function block');
    process.exit(1);
}
console.log('Extracted _0xb4a0 function.');

// 3. Extract Shuffle IIFE
const shuffleCallMarker = '(_0x8b05,';
const shuffleCallIndex = source.indexOf(shuffleCallMarker, decoderStartIndex);

let shuffleCode = null;

if (shuffleCallIndex !== -1) {
    const iifeStartMarker = '(function';
    const iifeStartIndex = source.lastIndexOf(iifeStartMarker, shuffleCallIndex);

    if (iifeStartIndex !== -1) {
        const iifeEndIndex = source.indexOf(')', shuffleCallIndex);
        if (iifeEndIndex !== -1) {
            let end = iifeEndIndex + 1;
            if (source[end] === ';') end++;
            shuffleCode = source.substring(iifeStartIndex, end);
        }
    }
}

if (!shuffleCode) {
    console.log('Warning: Could not isolate shuffle IIFE. Decoding might fail.');
} else {
    console.log('Extracted shuffle IIFE.');
}

// 4. Setup Sandbox
const sandbox = {
    window: {},
    document: {
        write: () => { },
        getElementById: () => null,
        createElement: () => ({ style: {}, appendChild: () => { } }),
        head: { appendChild: () => { } }
    },
    navigator: { userAgent: 'NodeJS' },
    console: console,
    location: { href: 'http://localhost' },
    _0x8b05: null,
    _0xb4a0: null
};

vm.createContext(sandbox);

// 5. Execute Extracted Code
try {
    console.log('Executing extracted components...');
    vm.runInContext(arrayFuncCode, sandbox);
    vm.runInContext(decoderCode, sandbox);
    if (shuffleCode) {
        try {
            vm.runInContext(shuffleCode, sandbox);
        } catch (e) {
            console.log('First attempt to run shuffle failed:', e.message);
            console.log('Trying to append ")" ...');
            try {
                vm.runInContext(shuffleCode + ')', sandbox);
            } catch (e2) {
                console.error('Second attempt failed:', e2.message);
            }
        }
    }
} catch (e) {
    console.error('Error executing components:', e);
    process.exit(1);
}

const decoderFn = sandbox._0xb4a0;
if (typeof decoderFn !== 'function') {
    console.error('FATAL: _0xb4a0 is not a function after execution.');
    process.exit(1);
}

console.log('Decoder function ready!');

// 6. Decode
console.log('\n=== DECODING ALL STRINGS ===\n');

const decodedMap = {};
let successCount = 0;
let failCount = 0;

console.log('Decoding indices from 0x0 to 0x2000...');

for (let i = 0x0; i <= 0x2000; i++) {
    try {
        const decoded = decoderFn(i);
        if (decoded && typeof decoded === 'string') {
            const hexIndex = '0x' + i.toString(16);
            decodedMap[hexIndex] = decoded;
            successCount++;

            if (successCount <= 10 || successCount % 100 === 0) {
                console.log(`  [${hexIndex}] => "${decoded.substring(0, 50)}${decoded.length > 50 ? '...' : ''}"`);
            }
        }
    } catch (e) {
        failCount++;
    }
}

console.log(`\nDecoding complete: ${successCount} successful, ${failCount} failed`);

// Save the decoded map
const mapPath = path.join(__dirname, 'dlhd-decoded-map.json');
fs.writeFileSync(mapPath, JSON.stringify(decodedMap, null, 2), 'utf8');
console.log(`\nDecoded map saved to: ${mapPath}`);

// Generate deobfuscated script
console.log('\n=== GENERATING DEOBFUSCATED SCRIPT ===\n');

let deobfuscated = source;
let replacements = 0;

// Match any function call with a hex or integer argument: func(0x123) or func('0x123')
const callPattern = /(_0x[a-f0-9]+)\s*\(\s*(?:'|")?(0x[0-9a-fA-F]+|[0-9]+)(?:'|")?\s*\)/g;

deobfuscated = deobfuscated.replace(callPattern, (match, funcName, arg) => {
    let index;
    if (arg.startsWith('0x')) {
        index = parseInt(arg, 16);
    } else {
        index = parseInt(arg, 10);
    }

    const hexIndex = '0x' + index.toString(16);
    const value = decodedMap[hexIndex];

    if (value !== undefined) {
        replacements++;
        const escaped = value
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
        return `'${escaped}'`;
    }

    return match;
});

console.log(`Made ${replacements} replacements`);

const deobfPath = path.join(__dirname, 'dlhd-fully-deobfuscated.js');
fs.writeFileSync(deobfPath, deobfuscated, 'utf8');
console.log(`Deobfuscated script saved to: ${deobfPath}`);

// Find M3U8 and video-related strings
console.log('\n=== SEARCHING FOR M3U8/VIDEO PATTERNS ===\n');

const keywords = ['m3u8', 'stream', 'video', 'source', 'player', 'cdn', 'http', 'blob', 'jwplayer', 'mp4', 'hls', 'clappr'];
const relevantStrings = {};

for (const [index, value] of Object.entries(decodedMap)) {
    const lowerValue = value.toLowerCase();
    for (const keyword of keywords) {
        if (lowerValue.includes(keyword)) {
            if (!relevantStrings[keyword]) {
                relevantStrings[keyword] = [];
            }
            relevantStrings[keyword].push({ index, value });
        }
    }
}

console.log('Found relevant strings by keyword:');
for (const [keyword, strings] of Object.entries(relevantStrings)) {
    console.log(`\n${keyword.toUpperCase()} (${strings.length} matches):`);
    strings.slice(0, 5).forEach(({ index, value }) => {
        console.log(`  [${index}] "${value.substring(0, 80)}${value.length > 80 ? '...' : ''}"`);
    });
    if (strings.length > 5) {
        console.log(`  ... and ${strings.length - 5} more`);
    }
}

const relevantPath = path.join(__dirname, 'dlhd-relevant-strings.json');
fs.writeFileSync(relevantPath, JSON.stringify(relevantStrings, null, 2), 'utf8');
console.log(`\nRelevant strings saved to: ${relevantPath}`);

console.log('\n=== EXTRACTION COMPLETE ===');
