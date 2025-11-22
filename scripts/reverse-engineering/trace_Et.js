const fs = require('fs');
try {
    const content = fs.readFileSync('c:/Users/Nicks/Desktop/Flyx-main/scripts/reverse-engineering/extracted-obfuscated.js', 'utf8');
    const start = 114447;
    // Read a chunk after the definition to see usages
    console.log(content.substring(start, start + 2000));
} catch (err) {
    console.error(err);
}
