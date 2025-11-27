// Run the improved DLHD decoder on dlhd-script.js and output decoded strings
const path = require('path');
const fs = require('fs');
const decoder = require('./dlhd-improved-decoder');
const scriptPath = path.join(__dirname, 'dlhd-script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
const decoded = decoder.decodeScript(scriptContent);
console.log('Decoded strings:');
console.log(JSON.stringify(decoded, null, 2));
