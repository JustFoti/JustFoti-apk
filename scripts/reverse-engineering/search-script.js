const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'extracted-script-4.js');
const content = fs.readFileSync(filePath, 'utf8');

const terms = ['ajax', 'fetch', 'XMLHttpRequest', 'post', 'get'];

terms.forEach(term => {
    const index = content.indexOf(term);
    if (index !== -1) {
        console.log(`Found '${term}' at index ${index}`);
        const start = Math.max(0, index - 100);
        const end = Math.min(content.length, index + 100);
        console.log(`Context: ...${content.substring(start, end)}...`);
    } else {
        console.log(`'${term}' not found`);
    }
});
