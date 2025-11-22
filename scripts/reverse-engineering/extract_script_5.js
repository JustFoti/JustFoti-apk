const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'debug-srcrcp-fetched.html');
const html = fs.readFileSync(filePath, 'utf8');

const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let i = 0;
let match;
while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1];
    if (!content.trim()) continue;

    i++;
    if (i === 4) {
        console.log('Found Script #4. Saving to extracted-script-5.js');
        fs.writeFileSync(path.join(__dirname, 'extracted-script-5.js'), content);
        break;
    }
}
