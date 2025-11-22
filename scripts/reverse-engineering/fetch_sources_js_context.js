const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();

    // Go to the embed page first to set cookies/referer
    const embedUrl = 'https://vidsrc-embed.ru/embed/movie/550';
    console.log(`Navigating to ${embedUrl}...`);
    await page.goto(embedUrl, { waitUntil: 'networkidle2' });

    // Now try to fetch sources.js from the page context
    console.log('Fetching sources.js from page context...');
    const sourcesJsContent = await page.evaluate(async () => {
        try {
            // Try to find the script tag
            const scripts = Array.from(document.querySelectorAll('script'));
            const sourcesScript = scripts.find(s => s.src && s.src.includes('sources.js'));

            let url = 'https://cloudnestra.com/sources.js';
            if (sourcesScript) {
                url = sourcesScript.src;
                console.log(`Found script src: ${url}`);
            }

            const response = await fetch(url);
            return await response.text();
        } catch (e) {
            return `Error: ${e.toString()}`;
        }
    });

    console.log(`Fetched ${sourcesJsContent.length} bytes.`);
    fs.writeFileSync(path.join(__dirname, 'sources_extracted.js'), sourcesJsContent);
    console.log('Saved to sources_extracted.js');

    await browser.close();
})();
