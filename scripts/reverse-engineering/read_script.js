const fs = require('fs');
try {
    const content = fs.readFileSync('c:/Users/Nicks/Desktop/Flyx-main/scripts/reverse-engineering/extracted-obfuscated.js', 'utf8');
    const index = content.indexOf('new ue');
    if (index !== -1) {
        console.log(content.substring(index - 100, index + 500));
    } else {
        console.log('Not found');
    }
} catch (err) {
    console.error(err);
}
