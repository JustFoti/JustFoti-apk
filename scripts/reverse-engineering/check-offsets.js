const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, 'dlhd-script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

const f1 = 'function _0x8b05';
const f2 = 'function _0xb4a0';
const split = "}(_0x8b05,0x58bbd),!(function(){'use strict';";

console.log(f1, scriptContent.indexOf(f1));
console.log(f2, scriptContent.indexOf(f2));
console.log('split', scriptContent.indexOf(split));
console.log('split last', scriptContent.lastIndexOf(split));
