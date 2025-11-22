const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'extracted-script-4.js');
const source = fs.readFileSync(inputFile, 'utf8');

const end = 15920;
console.log("Chars around 15920:", source.substring(end - 20, end + 20));
console.log("Char at 15920:", source[15920]);
console.log("Char at 15921:", source[15921]);
