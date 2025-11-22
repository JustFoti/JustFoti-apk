const fs = require('fs');
try {
    const content = fs.readFileSync('c:/Users/Nicks/Desktop/Flyx-main/scripts/reverse-engineering/extracted-obfuscated.js', 'utf8');
    let pos = 0;
    while (true) {
        const index = content.indexOf('ZpQw9XkLmN8c3vR3', pos);
        if (index === -1) break;
        console.log(`Found at ${index}:`);
        console.log(content.substring(index - 50, index + 100));
        console.log('---');
        pos = index + 1;
    }
} catch (err) {
    console.error(err);
}
