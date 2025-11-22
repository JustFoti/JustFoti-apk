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
        if (url.includes('main.js')) {
            console.log(`Intercepted ${url}`);
            try {
                const buffer = await response.buffer();
                const text = buffer.toString('utf8');
                console.log(`Captured ${text.length} bytes.`);
                fs.writeFileSync(path.join(__dirname, 'main_intercepted.js'), text);
                console.log('Saved to main_intercepted.js');
            } catch (e) {
                console.error('Error reading buffer:', e);
            }
        }
    });

    // We need to go to the inner page to get main.js
    // But the inner page is an iframe.
    // So we go to the embed page, then click the server to load the iframe.

    const embedUrl = 'https://vidsrc-embed.ru/embed/movie/550';
    console.log(`Navigating to ${embedUrl}...`);
    await page.goto(embedUrl, { waitUntil: 'networkidle2' });

    // Click "Superembed" to load the inner page
    // We need to find the server element with data-hash corresponding to Superembed.
    // Or just click the one with text "Superembed" or "Vidplay" (often same).
    // Actually, the user said "Superembed" is the provider.

    // Let's try to find the server element.
    const serverClicked = await page.evaluate(() => {
        const servers = Array.from(document.querySelectorAll('.server'));
        console.log('Servers found:', servers.map(s => s.innerText));
        const target = servers.find(s => s.innerText.includes('Superembed') || s.innerText.includes('Vidplay'));
        if (target) {
            target.click();
            return true;
        }
        return false;
    });

    if (serverClicked) {
        console.log('Clicked server. Waiting for network...');
        await page.waitForTimeout(5000); // Wait for iframe to load and scripts to fetch
    } else {
        console.log('Server not found.');
    }

    await browser.close();
})();
