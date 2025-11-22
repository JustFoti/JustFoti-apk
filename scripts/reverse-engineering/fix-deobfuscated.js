const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-script-5.js');
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
if (lines.length >= 2) {
    let found = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('function(){')) {
            console.log(`Found function at line ${i + 1}. Fixing...`);
            lines[i] = '(' + lines[i] + ')';
            found = true;
            break;
        }
    }
    if (found) {
        fs.writeFileSync(filePath, lines.join('\n'));
        console.log("File fixed.");
    } else {
        console.log("Could not find line starting with function(){");
    }
} else {
    console.log("File has fewer than 2 lines.");
}
