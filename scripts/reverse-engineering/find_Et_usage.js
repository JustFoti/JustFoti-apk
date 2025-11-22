const fs = require('fs');
try {
    const content = fs.readFileSync('c:/Users/Nicks/Desktop/Flyx-main/scripts/reverse-engineering/extracted-obfuscated.js', 'utf8');
    const start = 114447 + 20;
    let pos = start;
    const regex = /[^a-zA-Z0-9_$]Et[^a-zA-Z0-9_$]/g;
    regex.lastIndex = pos;

    let match;
    while ((match = regex.exec(content)) !== null) {
        console.log(`Found at ${match.index}:`);
        console.log(content.substring(match.index - 50, match.index + 100));
        console.log('---');
        if (match.index > start + 10000) break; // Limit search range
    }
} catch (err) {
    console.error(err);
}
