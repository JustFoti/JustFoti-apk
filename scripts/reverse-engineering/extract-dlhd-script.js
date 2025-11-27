const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dlhd-stream-fresh.html');
const content = fs.readFileSync(filePath, 'utf8');

const startMarker = 'window[\'x4G9Tq2Kw6R7v1Dy3P0B5N8Lc9M2zF\']';
const startIndex = content.indexOf(startMarker);

if (startIndex === -1) {
    console.log("Could not find the script start.");
    process.exit(1);
}

// Find the end of the script tag
const scriptEndMarker = '</script>';
const endIndex = content.indexOf(scriptEndMarker, startIndex);

if (endIndex === -1) {
    console.log("Could not find the script end.");
    process.exit(1);
}

const scriptContent = content.substring(startIndex, endIndex);
fs.writeFileSync(path.join(__dirname, 'dlhd-script.js'), scriptContent);
console.log("Extracted script to dlhd-script.js");
