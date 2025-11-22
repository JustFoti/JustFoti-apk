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

    const url = 'https://cloudnestra.com/sources.js?t=1745104089';
    console.log(`Fetching ${url}...`);

    try {
        const response = await page.goto(url, { waitUntil: 'networkidle2' });
        const text = await response.text();
        console.log(`Fetched ${text.length} bytes.`);
        fs.writeFileSync(path.join(__dirname, 'sources.js'), text);
        console.log('Saved to sources.js');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
})();
