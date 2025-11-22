const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'debug-srcrcp-550.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Extract the big script
const scriptMatch = html.match(/<script>window\['([A-Za-z0-9]+)'\]='([^']+)';(!function\(\)\{.+?\}\(\));<\/script>/);

if (!scriptMatch) {
    console.log('Could not match the expected script pattern.');
    // Try to just find the big script block
    const bigScript = html.match(/!function\(\)\{"use strict";.+?\}\(\)/);
    if (bigScript) {
        console.log('Found big script block.');
        const content = bigScript[0];
        console.log('Length:', content.length);
        fs.writeFileSync(path.join(__dirname, 'extracted-script.js'), content);

        // Search for the variable name if we know it
        const varName = 'ZpQw9XkLmN8c3vR3';
        const index = content.indexOf(varName);
        console.log(`Variable ${varName} found at index: ${index}`);

        if (index !== -1) {
            const context = content.substring(index - 100, index + 100);
            console.log('Context:', context);
        }
    }
    return;
}

const varName = scriptMatch[1];
const encryptedData = scriptMatch[2];
const scriptCode = scriptMatch[3];

console.log('Variable Name:', varName);
console.log('Encrypted Data Length:', encryptedData.length);
console.log('Script Length:', scriptCode.length);

fs.writeFileSync(path.join(__dirname, 'extracted-script.js'), scriptCode);

// Check if the variable name is used in the script
const index = scriptCode.indexOf(varName);
console.log(`Variable ${varName} found in script at index: ${index}`);

if (index !== -1) {
    const context = scriptCode.substring(index - 100, index + 100);
    console.log('Context:', context);
} else {
    console.log('Variable name NOT found in script. Searching for generic window access...');
    // Look for window[...
    const windowAccess = [...scriptCode.matchAll(/window\[([^\]]+)\]/g)];
    console.log(`Found ${windowAccess.length} window[...] accesses.`);
    windowAccess.slice(0, 10).forEach(m => console.log(m[0]));
}
