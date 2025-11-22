const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'debug-srcrcp-550.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Find all script tags
const scriptRegex = /<script[\s\S]*?>([\s\S]*?)<\/script>/gi;
let match;
let largestScript = '';
let largestScriptIndex = -1;

let i = 0;
while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1];
    console.log(`Script ${i}: length ${content.length}`);
    if (content.length > largestScript.length) {
        largestScript = content;
        largestScriptIndex = i;
    }
    i++;
}

if (largestScript) {
    console.log(`Saving largest script (Index ${largestScriptIndex}, Length ${largestScript.length}) to extracted-script-re.js`);
    fs.writeFileSync(path.join(__dirname, 'extracted-script-re.js'), largestScript);
} else {
    console.log("No scripts found.");
}
