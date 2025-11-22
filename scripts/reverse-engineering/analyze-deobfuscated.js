const fs = require('fs');
const path = require('path');

// Read the deobfuscated script
const scriptPath = path.join(__dirname, 'deobfuscated-script-5.js');
let scriptContent = fs.readFileSync(scriptPath, 'utf8');

console.log("File size:", scriptContent.length);
console.log("First 200 chars:", scriptContent.substring(0, 200));
console.log("\nLast 200 chars:", scriptContent.substring(scriptContent.length - 200));

// Count occurrences of key strings
const zpqwCount = (scriptContent.match(/ZpQw/g) || []).length;
const windowCount = (scriptContent.match(/window/g) || []).length;
const atobCount = (scriptContent.match(/atob/g) || []).length;

console.log("\nString occurrences:");
console.log("  'ZpQw':", zpqwCount);
console.log("  'window':", windowCount);
console.log("  'atob':", atobCount);

// Check if it starts with "function"
if (scriptContent.trim().startsWith('function')) {
    console.log("\nScript starts with 'function' - it's a function statement");
    console.log("Needs to be wrapped or the 'function' keyword needs to be removed");
}
