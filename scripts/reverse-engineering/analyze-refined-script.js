const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dlhd-script-formatted.js');
const code = fs.readFileSync(filePath, 'utf8');

const keywords = ['atob', 'fetch', 'XMLHttpRequest', '.m3u8', 'Clappr', 'jwplayer', 'player', 'hls', 'source', 'src'];

console.log(`Analyzing ${filePath} (${code.length} bytes)...`);

keywords.forEach(keyword => {
    let index = code.indexOf(keyword);
    let count = 0;
    while (index !== -1) {
        count++;
        if (count <= 10) { // Limit output to first 10 matches per keyword
            const start = Math.max(0, index - 100);
            const end = Math.min(code.length, index + 100 + keyword.length);
            const context = code.substring(start, end);
            console.log(`\nFound '${keyword}' at index ${index}:`);
            console.log(`...${context.replace(/\n/g, ' ')}...`);
        }
        index = code.indexOf(keyword, index + 1);
    }
    if (count === 0) {
        console.log(`\nNo matches found for '${keyword}'`);
    } else {
        console.log(`\nTotal matches for '${keyword}': ${count}`);
    }
});
