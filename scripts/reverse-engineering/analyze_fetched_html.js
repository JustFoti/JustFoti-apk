const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'debug-srcrcp-fetched.html');
const html = fs.readFileSync(filePath, 'utf8');

console.log('--- External Scripts ---');
const srcRegex = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
let match;
while ((match = srcRegex.exec(html)) !== null) {
    console.log(match[1]);
}

console.log('\n--- Inline Scripts Analysis ---');
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let i = 0;
while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1];
    if (!content.trim()) continue;

    i++;
    console.log(`\nScript #${i} (Length: ${content.length})`);

    if (content.includes('ZpQw9XkLmN8c3vR3')) {
        console.log('  [!] Found "ZpQw9XkLmN8c3vR3" in this script!');
        const index = content.indexOf('ZpQw9XkLmN8c3vR3');
        const start = Math.max(0, index - 100);
        const end = Math.min(content.length, index + 200);
        console.log('  Context:', content.substring(start, end).replace(/\n/g, ' '));
    }

    if (content.includes('_0x')) {
        console.log('  [!] Found "_0x" (obfuscated variable) in this script!');
        console.log('  Snippet:', content.substring(0, 100).replace(/\n/g, ' ') + '...');
    }
}

// Check for the weird content at the end
const bodyEnd = html.indexOf('</body>');
const htmlEnd = html.indexOf('</html>');
console.log(`\nFile length: ${html.length}`);
console.log(`</body> position: ${bodyEnd}`);
console.log(`</html> position: ${htmlEnd}`);

if (html.length > htmlEnd + 10) {
    console.log('\n--- Content after </html> ---');
    console.log(html.substring(htmlEnd + 7, Math.min(html.length, htmlEnd + 500)));
}
