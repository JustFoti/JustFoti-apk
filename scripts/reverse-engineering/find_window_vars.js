const fs = require('fs');
try {
    const content = fs.readFileSync('c:/Users/Nicks/Desktop/Flyx-main/scripts/reverse-engineering/debug-srcrcp-550.html', 'utf8');
    const regex = /window\s*\[\s*['"]([^'"]+)['"]\s*\]\s*=\s*/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        console.log(`Found variable: ${match[1]}`);
        // Print a bit of the value (truncated)
        const valueStart = match.index + match[0].length;
        console.log(`Value start: ${content.substring(valueStart, valueStart + 100)}...`);
        console.log('---');
    }
} catch (err) {
    console.error(err);
}
