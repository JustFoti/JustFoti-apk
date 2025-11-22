const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-script-5.js');
const content = fs.readFileSync(filePath, 'utf8');
const searchTerm = 'atob';

const index = content.indexOf(searchTerm);

if (index !== -1) {
    console.log(`Found '${searchTerm}' at index ${index}`);
    const start = Math.max(0, index - 100);
    const end = Math.min(content.length, index + 100 + searchTerm.length);
    console.log('Context:');
    console.log(content.substring(start, end));
} else {
    console.log(`'${searchTerm}' not found.`);
}
