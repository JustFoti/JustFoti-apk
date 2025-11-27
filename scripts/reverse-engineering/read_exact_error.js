const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-player.js');
const content = fs.readFileSync(filePath, 'utf8');

const index = 45724; // Based on previous find
const start = Math.max(0, index - 20);
const end = Math.min(content.length, index + 50);

console.log('---START---');
console.log(content.substring(start, end));
console.log('---END---');
console.log('Hex dump of substring:');
const sub = content.substring(start, end);
for (let i = 0; i < sub.length; i++) {
    process.stdout.write(sub.charCodeAt(i).toString(16) + ' ');
}
console.log();
