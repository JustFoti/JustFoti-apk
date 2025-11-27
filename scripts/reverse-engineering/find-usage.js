const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dlhd-stream.html');
const content = fs.readFileSync(filePath, 'utf8');

const variableName = "ZpQw9XkLmN8c3vR3";
let index = content.indexOf(variableName);

while (index !== -1) {
    console.log(`Found '${variableName}' at index ${index}`);
    const start = Math.max(0, index - 200);
    const end = Math.min(content.length, index + 300);
    console.log("Context:");
    console.log(content.substring(start, end));
    console.log("-".repeat(50));

    index = content.indexOf(variableName, index + 1);
}
