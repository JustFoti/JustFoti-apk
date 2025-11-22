const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
    const fileStream = fs.createReadStream('c:/Users/Nicks/Desktop/Flyx-main/scripts/reverse-engineering/debug-srcrcp-550.html');

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let lineNum = 0;
    for await (const line of rl) {
        lineNum++;
        if (lineNum === 38) {
            console.log(`Line 38 length: ${line.length}`);
            console.log('End of line 38:');
            console.log(line.slice(-2000));
            break;
        }
    }
}

processLineByLine();
