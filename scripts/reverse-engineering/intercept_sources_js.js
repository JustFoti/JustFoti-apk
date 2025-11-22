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

    // Intercept responses
    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('sources.js')) {
            console.log(`Intercepted ${url}`);
            try {
                const buffer = await response.buffer();
                const text = buffer.toString('utf8');
                console.log(`Captured ${text.length} bytes.`);
                fs.writeFileSync(path.join(__dirname, 'sources_intercepted.js'), text);
                console.log('Saved to sources_intercepted.js');
            } catch (e) {
                console.error('Error reading buffer:', e);
            }
        }
    });

    const embedUrl = 'https://vidsrc-embed.ru/embed/movie/550';
    console.log(`Navigating to ${embedUrl}...`);
    await page.goto(embedUrl, { waitUntil: 'networkidle2' });

    await browser.close();
})();
