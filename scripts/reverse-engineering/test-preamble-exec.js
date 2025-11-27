const fs = require('fs');
const path = require('path');

const dumpPath = path.join(__dirname, 'debug-preamble-dump.js');
if (!fs.existsSync(dumpPath)) {
    console.error('Dump file not found');
    process.exit(1);
}
const preamble = fs.readFileSync(dumpPath, 'utf8');

console.log('Total length:', preamble.length);
console.log('First 100 chars:', preamble.slice(0, 100));
console.log('Last 100 chars:', preamble.slice(-100));

// Split into parts?
// The preamble usually has:
// 1. function _0x8b05() { ... }
// 2. function _0xb4a0(...) { ... }
// 3. (function(...) { ... })(...)

const func1Start = preamble.indexOf('function _0x8b05');
const func2Start = preamble.indexOf('function _0xb4a0');
const iifeStart = preamble.indexOf('(function(_0x9dcbec'); // Based on dump view

console.log('Indices:', { func1Start, func2Start, iifeStart });

if (func1Start === -1 || func2Start === -1 || iifeStart === -1) {
    console.error('Could not identify all 3 parts');
}

// Try to construct a valid script
let cleanPreamble = preamble.trim();
if (cleanPreamble.endsWith(',')) {
    console.log('Removing trailing comma');
    cleanPreamble = cleanPreamble.slice(0, -1);
}

// Add a semicolon at the end just in case
cleanPreamble += ';';

console.log('Cleaned end:', cleanPreamble.slice(-20));

try {
    console.log('Attempting eval...');
    eval(cleanPreamble);
    console.log('Eval success!');

    if (typeof _0xb4a0 === 'function') {
        console.log('_0xb4a0 is defined');
        console.log('Test call:', _0xb4a0(0x1c8));
    } else {
        console.log('_0xb4a0 is NOT defined');
    }
} catch (e) {
    console.error('Eval failed:', e);
    console.error('Error name:', e.name);
    console.error('Error message:', e.message);
    console.error('Code end was:', cleanPreamble.slice(-50));
    if (e.stack) console.error('Stack:', e.stack);
}
