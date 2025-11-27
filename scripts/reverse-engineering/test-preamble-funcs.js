const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'debug-preamble.js');
const content = fs.readFileSync(filePath, 'utf8');

// Find the start of the shuffle IIFE
const shuffleStart = content.indexOf('(function(_0x9dcbec');
if (shuffleStart === -1) {
    console.error("Could not find shuffle start");
    process.exit(1);
}

const funcsOnly = content.substring(0, shuffleStart);
console.log("Running functions only...");
try {
    eval(funcsOnly);
    console.log("Functions are valid.");
} catch (e) {
    console.error("Error in functions:", e);
}
