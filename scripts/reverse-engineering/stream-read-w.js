const fs = require('fs');
const readline = require('readline');

const fileStream = fs.createReadStream('scripts/reverse-engineering/debug-srcrcp-550.html');

const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
});

rl.on('line', (line) => {
    if (line.includes('var w=btoa')) {
        const match = line.match(/var w=btoa\("([^"]+)"\)/);
        if (match) {
            console.log("Found w:", match[1]);
            process.exit(0);
        }
    }
});
