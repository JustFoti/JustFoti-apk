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

// We look for the end of the shuffler IIFE.
// It looks like: ...}(_0x5bd0, ...),func
const splitString = '),func';
const splitIndex = source.indexOf(splitString);

if (splitIndex === -1) {
    console.error("Could not find split point ),func");
    process.exit(1);
}

// Include the ) and add );
let header = source.substring(0, splitIndex + 1) + ');';
header = header.replace(/new _0x556ec0\(_0x32e7\)\['ahGfRn'\]\(\)/g, 'void 0');

console.log("Header extracted, length:", header.length);

// Split header into parts to isolate error
const arrayEnd = header.indexOf('];');
const iifeStart = header.indexOf('(function', arrayEnd);

if (arrayEnd === -1 || iifeStart === -1) {
    console.error("Could not parse header structure");
    process.exit(1);
}

const part1 = header.substring(0, arrayEnd + 2); // var _0x5bd0=[...];
const part2 = header.substring(arrayEnd + 2, iifeStart); // var _0x32e7=...;
const part3 = header.substring(iifeStart); // (function...);

console.log("Eval part 1 (Array)...");
try { eval(part1); } catch (e) { console.error("Part 1 error:", e); process.exit(1); }

console.log("Eval part 2 (Decoder)...");
try { eval(part2); } catch (e) { console.error("Part 2 error:", e); process.exit(1); }

console.log("Checking _0x5bd0...");
try { console.log("Type of _0x5bd0:", typeof _0x5bd0); } catch (e) { console.error("_0x5bd0 check error:", e); }

console.log("Eval part 3 (IIFE)...");
// Remove trailing ;
const part3Clean = part3.trim().replace(/;$/, '');
try { eval(part3Clean); } catch (e) {
    console.error("Part 3 error:", e);
    console.log("Part 3 content:", part3Clean);
    process.exit(1);
}

// Define wrappers globally
global._0x5725c2 = function (_0x93fd07, _0x542cd3, _0x177182, _0x41237b) { return _0x32e7(_0x41237b - 0x19, _0x542cd3); };
global._0x5288ab = function (_0x28dd15, _0xb5588d, _0x24cbbc, _0x158cf1) { return _0x32e7(_0x158cf1 - 0x19, _0xb5588d); };

// Load dictionary
const dictPath = path.join(__dirname, 'decoded-dictionary.json');
const dictContent = fs.readFileSync(dictPath, 'utf8');
const _0x22f029 = JSON.parse(dictContent);

// Mock dictionary functions
for (const key in _0x22f029) {
    const val = _0x22f029[key];
    if (typeof val === 'string' && val.startsWith('function') && val.endsWith('}')) {
        try {
            _0x22f029[key] = eval(`(${val})`);
        } catch (e) {
            console.error(`Failed to eval function for key ${key}:`, e);
        }
    }
}

// Load extracted helper function
const helperPath = path.join(__dirname, 'helper-function.js');
const helperCode = fs.readFileSync(helperPath, 'utf8');
eval(helperCode);

// Load extracted helper function 2
const helper2Path = path.join(__dirname, 'helper-function-2.js');
const helper2Code = fs.readFileSync(helper2Path, 'utf8');
eval(helper2Code);

// Load extracted helper function 3
const helper3Path = path.join(__dirname, 'helper-function-3.js');
const helper3Code = fs.readFileSync(helper3Path, 'utf8');
eval(helper3Code);

// Load extracted helper function 4
const helper4Path = path.join(__dirname, 'helper-function-4.js');
const helper4Code = fs.readFileSync(helper4Path, 'utf8');
eval(helper4Code);

// Load extracted helper function 5
const helper5Path = path.join(__dirname, 'helper-function-5.js');
const helper5Code = fs.readFileSync(helper5Path, 'utf8');
eval(helper5Code);

// Load extracted helper function 6
const helper6Path = path.join(__dirname, 'helper-function-6.js');
const helper6Code = fs.readFileSync(helper6Path, 'utf8');
eval(helper6Code);

// Load extracted helper function 7
const helper7Path = path.join(__dirname, 'helper-function-7.js');
const helper7Code = fs.readFileSync(helper7Path, 'utf8');
eval(helper7Code);

// Load extracted helper function 8
const helper8Path = path.join(__dirname, 'helper-function-8.js');
const helper8Code = fs.readFileSync(helper8Path, 'utf8');
eval(helper8Code);

// Load extracted helper function 9
const helper9Path = path.join(__dirname, 'helper-function-9.js');
const helper9Code = fs.readFileSync(helper9Path, 'utf8');
eval(helper9Code);

// Load extracted helper function 10
const helper10Path = path.join(__dirname, 'helper-function-10.js');
const helper10Code = fs.readFileSync(helper10Path, 'utf8');
eval(helper10Code);

// Load extracted function code
const funcPath = path.join(__dirname, 'extracted-function.js');
const funcCode = fs.readFileSync(funcPath, 'utf8');

// Eval function code to define _0x368952
eval(funcCode);

// Call it
const nrYcg = _0x22f029['nrYcg'];
const number = -0x3146e + -0x7ce3f + 0x169b0 * 0xb;

console.log("Calling _0x368952 with:");
console.log("String length:", nrYcg.length);
console.log("Number:", number);

try {
    const decodedSource = _0x368952(nrYcg, number);
    console.log("Result:");
    console.log("Decoded source:", decodedSource);

    let outputData = decodedSource;
    if (typeof decodedSource === 'object') {
        outputData = JSON.stringify(decodedSource, null, 2);
    }

    const outputPath = path.join(__dirname, 'decoded-source.json');
    fs.writeFileSync(outputPath, outputData);
    console.log("Decoded source saved to decoded-source.json");

} catch (e) {
    console.error("Error calling function:", e);
}
