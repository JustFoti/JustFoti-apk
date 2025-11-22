const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const dom = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`);
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.location = dom.window.location;
global.history = dom.window.history;
global.screen = dom.window.screen;

// Mock other globals if needed
global.self = global.window;
global.top = global.window;
global.parent = global.window;

// Mock ZpQw9XkLmN8c3vR3 if it's expected to be on window
// But we don't know if it's expected to be there or if the script puts it there.
// The script likely reads it.
// Let's put a dummy value to see if it crashes or uses it.
global.window['ZpQw9XkLmN8c3vR3'] = 'DUMMY_VALUE';

try {
    require('./deobfuscated-script-5.js');
} catch (e) {
    console.error("Error running script:", e);
}

if (global.debugArray) {
    console.log("Captured Array:", global.debugArray);
    // Search for the config key in the array
    const key = 'ZpQw9XkLmN8c3vR3';
    const found = global.debugArray.find(s => s.includes(key) || key.includes(s));
    if (found) {
        console.log("Found key in array:", found);
    } else {
        console.log("Key not found in array.");
    }
} else {
    console.log("global.debugArray is not defined.");
}
