const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'extracted-script-re.js');
const source = fs.readFileSync(inputFile, 'utf8');

const index = source.indexOf('suurl5.php');
if (index === -1) {
    console.log("Could not find 'suurl5.php'.");
} else {
    console.log("Found 'suurl5.php' at index:", index);
    // Print context around the match
    const start = Math.max(0, index - 500);
    const end = Math.min(source.length, index + 1000);
    console.log("Context:");
    console.log(source.substring(start, end));
}
