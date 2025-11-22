const fs = require('fs');
try {
    const content = fs.readFileSync('c:/Users/Nicks/Desktop/Flyx-main/scripts/reverse-engineering/extracted-obfuscated.js', 'utf8');
    console.log(content.slice(-2000));
} catch (err) {
    console.error(err);
}
