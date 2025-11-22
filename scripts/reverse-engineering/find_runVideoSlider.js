const fs = require('fs');
try {
    const content = fs.readFileSync('c:/Users/Nicks/Desktop/Flyx-main/scripts/reverse-engineering/extracted-obfuscated.js', 'utf8');
    let pos = 0;
    while (true) {
        const index = content.indexOf('runVideoSlider', pos);
        if (index === -1) break;
        console.log(`Found at ${index}:`);
        console.log(content.substring(index - 100, index + 300));
        console.log('---');
        pos = index + 1;
    }
} catch (err) {
    console.error(err);
}
