const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, 'dlhd-fully-deobfuscated.js'), 'utf8');
const marker = 'this.#ye';
let index = source.indexOf(marker);

while (index !== -1) {
    console.log(`Found marker at ${index}`);
    const start = Math.max(0, index - 100);
    const end = Math.min(source.length, index + 200);
    console.log('Context:');
    console.log(source.substring(start, end));

    index = source.indexOf(marker, index + 1);
}
