const fs = require('fs');
const path = require('path');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const dom = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`);
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.location = dom.window.location;
global.$ = require('jquery')(dom.window);

// Read the deobfuscated script
const scriptPath = path.join(__dirname, 'deobfuscated-script-5.js');
let scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Wrap the function to make it executable
scriptContent = '(' + scriptContent.trim() + ')();';

try {
    eval(scriptContent);

    if (global.debugArray) {
        console.log("Array captured! Length:", global.debugArray.length);
        console.log("First 10 elements:");
        global.debugArray.slice(0, 10).forEach((item, i) => {
            console.log(`  [${i}]:`, item.substring(0, 100));
        });

        // Search for ZpQw or similar
        const found = global.debugArray.filter(s =>
            s.includes('ZpQw') ||
            s.includes('window') ||
            s.includes('document') ||
            s.includes('atob') ||
            s.includes('base64')
        );
        console.log("\nFound relevant strings:", found.length);
        found.forEach(s => console.log("  ->", s.substring(0, 150)));
    } else {
        console.log("debugArray not exposed");
    }
} catch (e) {
    console.error("Error executing script:", e.message);
    console.error("Stack:", e.stack.substring(0, 500));
}
