const fs = require('fs');
const path = require('path');

// Mock browser environment
const window = {
    location: { href: 'https://example.com' },
    navigator: { userAgent: 'Mozilla/5.0' },
    document: {}
};
const document = window.document;
const navigator = window.navigator;
const self = window;
global.window = window;
global.document = document;
global.navigator = navigator;
global.self = self;

// Extract header from extracted-script-4.js
const inputFile = path.join(__dirname, 'extracted-script-4.js');
const source = fs.readFileSync(inputFile, 'utf8');

const splitString = '),func';
const splitIndex = source.indexOf(splitString);

if (splitIndex === -1) {
    console.error("Could not find split point ),func");
    process.exit(1);
}

let header = source.substring(0, splitIndex + 1) + ');';
header = header.replace(/new _0x556ec0\(_0x32e7\)\['ahGfRn'\]\(\)/g, 'void 0');

const arrayEnd = header.indexOf('];');
const iifeStart = header.indexOf('(function', arrayEnd);
const part1 = header.substring(0, arrayEnd + 2);
const part2 = header.substring(arrayEnd + 2, iifeStart);
const part3 = header.substring(iifeStart);

try { eval(part1); } catch (e) { }
try { eval(part2); } catch (e) { }
const part3Clean = part3.trim().replace(/;$/, '');
try { eval(part3Clean); } catch (e) { }

global._0x5725c2 = function (_0x93fd07, _0x542cd3, _0x177182, _0x41237b) { return _0x32e7(_0x41237b - 0x19, _0x542cd3); };
global._0x5288ab = function (_0x28dd15, _0xb5588d, _0x24cbbc, _0x158cf1) { return _0x32e7(_0x158cf1 - 0x19, _0xb5588d); };

// Decode specific strings
// Context: x24a,0x2be)](_0x368952,_0x22f029[_0x5288ab(0x26a,0x2be,0x290,0x2d9)],-0x3146e+-0x7ce3f+0x169b0*0xb)
// The function call seems to be: _0x22f029[KEY](_0x368952, KEY2, NUMBER)

// I need to find the exact arguments for the function key.
// The context snippet was: x24a,0x2be)](
// This implies the last two args were 0x24a and 0x2be.
// I need the full call to _0x5288ab or _0x5725c2.
// Since I don't have the full string, I will try to find it in the source using the snippet.

const snippet = 'x24a,0x2be)](_0x368952';
const snippetIndex = source.indexOf(snippet);

if (snippetIndex !== -1) {
    // Look backwards to find the start of the function call
    const start = source.lastIndexOf('_0x22f029', snippetIndex);
    const end = source.indexOf(';', snippetIndex);
    const fullCall = source.substring(start, end);
    console.log("Full call:", fullCall);

    // Extract the decoder calls
    // _0x22f029[_0x5288ab(A,B,C,D)]
    // I'll use regex to find _0x5288ab(...) and _0x5725c2(...) calls
    const regex = /(_0x5288ab|_0x5725c2)\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(fullCall)) !== null) {
        const funcName = match[1];
        const args = match[2].split(',').map(s => parseInt(s.trim()));
        console.log(`Decoding ${funcName} args:`, args);
        try {
            const decoded = global[funcName](...args);
            console.log("Decoded:", decoded);
        } catch (e) {
            console.error("Error decoding:", e);
        }
    }
} else {
    console.log("Snippet not found");
}
