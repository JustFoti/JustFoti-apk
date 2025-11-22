const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const htmlPath = path.join(__dirname, 'debug-srcrcp-550.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const $ = cheerio.load(html);

const scripts = $('script');
console.log(`Found ${scripts.length} script tags`);

scripts.each((i, elem) => {
    const content = $(elem).html() || '';
    const src = $(elem).attr('src') || 'inline';
    console.log(`Script ${i}: src=${src}, length=${content.length}`);

    if (content.length > 10000) {
        const outputPath = path.join(__dirname, `extracted-script-${i}.js`);
        fs.writeFileSync(outputPath, content);
        console.log(`Extracted script ${i} to ${outputPath}`);
    }
});
