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

// Mock jQuery ($)
const handlers = {};
const elements = {};

const $ = function (selector) {
    if (!elements[selector]) {
        elements[selector] = {
            click: function (handler) {
                if (handler) {
                    handlers[selector] = handler;
                } else if (handlers[selector]) {
                    // Trigger click
                    handlers[selector]({
                        pageX: 100,
                        pageY: 200,
                        which: 1,
                        originalEvent: { isTrusted: true }
                    });
                }
                return this;
            },
            val: function (value) {
                if (value !== undefined) {
                    console.log(`Set value of ${selector} to:`, value);
                    this.value = value;
                }
                return this.value;
            },
            submit: function () {
                console.log(`Submitted form ${selector}`);
            },
            text: function (t) {
                console.log(`Set text of ${selector} to:`, t);
            },
            addClass: function (c) {
                console.log(`Added class ${c} to ${selector}`);
            },
            unbind: function () {
                console.log(`Unbound events from ${selector}`);
            }
        };
    }
    return elements[selector];
};
$.now = function () {
    return Date.now();
};
global.$ = $;

// Load extracted helpers
const helpers = [
    'helper-function.js', 'helper-function-2.js', 'helper-function-3.js',
    'helper-function-4.js', 'helper-function-5.js', 'helper-function-6.js',
    'helper-function-7.js', 'helper-function-8.js', 'helper-function-9.js',
    'helper-function-10.js'
];

helpers.forEach(helper => {
    const helperPath = path.join(__dirname, helper);
    if (fs.existsSync(helperPath)) {
        const code = fs.readFileSync(helperPath, 'utf8');
        // Indirect eval to execute in global scope
        (0, eval)(code);
    }
});

// Load dictionary
const dictPath = path.join(__dirname, 'decoded-dictionary.json');
const dictContent = fs.readFileSync(dictPath, 'utf8');
global._0x22f029 = JSON.parse(dictContent);

// Mock dictionary functions
for (const key in global._0x22f029) {
    const val = global._0x22f029[key];
    if (typeof val === 'string' && val.startsWith('function') && val.endsWith('}')) {
        try {
            global._0x22f029[key] = eval(`(${val})`);
        } catch (e) {
            // console.error(`Failed to eval function for key ${key}:`, e);
        }
    }
}

// Define wrappers globally
global._0x5725c2 = function (_0x93fd07, _0x542cd3, _0x177182, _0x41237b) { return _0x32e7(_0x41237b - 0x19, _0x542cd3); };
global._0x5288ab = function (_0x28dd15, _0xb5588d, _0x24cbbc, _0x158cf1) { return _0x32e7(_0x158cf1 - 0x19, _0xb5588d); };

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

eval(part1);
eval(part2);
const part3Clean = part3.trim().replace(/;$/, '');
eval(part3Clean);

// Load extracted function code (to define _0x368952)
const funcPath = path.join(__dirname, 'extracted-function.js');
const funcCode = fs.readFileSync(funcPath, 'utf8');
eval(funcCode);

// Now we need to execute the part of the script that sets up the click handler.
// This is the code AFTER the header.
// But the script is huge and obfuscated.
// Instead of eval-ing the whole script (which might fail), we can try to locate the click handler setup code.
// It looks like: _0x22f029['wGQAv']($, ['.play-button'])['click'](_0x14b603)
// We can search for this pattern and extract the function _0x14b603.

// Actually, we can just eval the relevant part if we can isolate it.
// The relevant part is where _0x54904b is defined and used.
// We know _0x54904b is defined as: var _0x54904b=_0x22f029[_0x5725c2(...)](...)
// And then the click handler is attached.

// Let's try to find the definition of _0x14b603 (the click handler).
// In the previous analysis, we saw: function _0x14b603(_0x5ddbce){...}
// We can extract this function.

const startFunc = source.indexOf('function _0x14b603');
if (startFunc !== -1) {
    // Find end of function
    let braceCount = 0;
    let endFunc = -1;
    let foundStart = false;
    for (let i = startFunc; i < source.length; i++) {
        if (source[i] === '{') {
            braceCount++;
            foundStart = true;
        } else if (source[i] === '}') {
            braceCount--;
            if (foundStart && braceCount === 0) {
                endFunc = i + 1;
                break;
            }
        }
    }

    if (endFunc !== -1) {
        const handlerCode = source.substring(startFunc, endFunc);
        eval(handlerCode);
        console.log("Extracted and evaled _0x14b603");

        // Extract _0x31d499
        const start31d = source.indexOf('function _0x31d499');
        if (start31d !== -1) {
            let bc = 0;
            let ef = -1;
            let fs = false;
            for (let i = start31d; i < source.length; i++) {
                if (source[i] === '{') { bc++; fs = true; }
                else if (source[i] === '}') { bc--; if (fs && bc === 0) { ef = i + 1; break; } }
            }
            if (ef !== -1) {
                (0, eval)(source.substring(start31d, ef));
                console.log("Extracted and evaled _0x31d499");
            }
        }

        // Extract _0x3d5c48
        const start3d5 = source.indexOf('function _0x3d5c48');
        if (start3d5 !== -1) {
            let bc = 0;
            let ef = -1;
            let fs = false;
            for (let i = start3d5; i < source.length; i++) {
                if (source[i] === '{') { bc++; fs = true; }
                else if (source[i] === '}') { bc--; if (fs && bc === 0) { ef = i + 1; break; } }
            }
            if (ef !== -1) {
                (0, eval)(source.substring(start3d5, ef));
                console.log("Extracted and evaled _0x3d5c48");
            }
        }

        // We also need _0x54904b defined.
        const decodedSourcePath = path.join(__dirname, 'decoded-source.json');
        const decodedSource = JSON.parse(fs.readFileSync(decodedSourcePath, 'utf8'));
        global._0x54904b = decodedSource;

        // Now call the handler
        console.log("Calling _0x14b603 with mock event...");
        try {
            _0x14b603({
                pageX: 100,
                pageY: 200,
                which: 1,
                originalEvent: { isTrusted: true }
            });
        } catch (e) {
            console.error("Error executing handler:", e);
        }
    } else {
        console.error("Could not find end of _0x14b603");
    }
} else {
    console.error("Could not find _0x14b603");
}
