const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const TMDB_ID = process.argv[2] || '550';
const TYPE = process.argv[3] || 'movie';
const SEASON = process.argv[4];
const EPISODE = process.argv[5];

const EMBED_URL = TYPE === 'movie'
    ? `https://vidsrc-embed.ru/embed/movie/${TMDB_ID}`
    : `https://vidsrc-embed.ru/embed/tv/${TMDB_ID}/${SEASON}/${EPISODE}`;

async function extractServerList() {
    console.log(`\n🔍 Extracting Server List for ${TYPE} ID: ${TMDB_ID}`);
    console.log(`📍 URL: ${EMBED_URL}`);

    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--window-size=1280,720'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Bypass DevTools detection (reusing logic from stealth extractor)
    await page.evaluateOnNewDocument(() => {
        console.clear = () => console.log("console.clear() blocked");
        window.debugger = () => { };
        Object.defineProperty(window, 'outerWidth', { get: () => window.innerWidth });
        Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight });
        if (!window.chrome) window.chrome = { runtime: {} };
        const originalToString = Function.prototype.toString;
        Function.prototype.toString = function () {
            if (this === console.clear || this === window.debugger) {
                return 'function () { [native code] }';
            }
            return originalToString.apply(this, arguments);
        };
    });

    // Capture all requests to find API calls
    const requests = [];
    await page.setRequestInterception(true);
    page.on('request', request => {
        requests.push({
            url: request.url(),
            method: request.method(),
            resourceType: request.resourceType()
        });

        // Block detection scripts
        if (request.url().includes('sbx.js') || request.url().includes('disable-devtool') || request.url().includes('dd.js')) {
            request.abort();
        } else {
            request.continue();
        }
    });

    try {
        await page.goto(EMBED_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        console.log('✅ Page loaded');

        // Dump HTML
        const html = await page.content();
        fs.writeFileSync(`debug-servers-page-${TMDB_ID}.html`, html);
        console.log(`📄 HTML saved to debug-servers-page-${TMDB_ID}.html`);

        // Screenshot
        await page.screenshot({ path: `debug-servers-page-${TMDB_ID}.png` });
        console.log(`📸 Screenshot saved to debug-servers-page-${TMDB_ID}.png`);

        // Save requests
        fs.writeFileSync(`debug-servers-requests-${TMDB_ID}.json`, JSON.stringify(requests, null, 2));
        console.log(`Networks logs saved to debug-servers-requests-${TMDB_ID}.json`);

        // Try to find server elements
        const serverElements = await page.evaluate(() => {
            const servers = [];
            // Look for common server list selectors (adjust based on inspection)
            const elements = document.querySelectorAll('.server, .server-item, [data-server], li[onclick], .btn-server');
            elements.forEach(el => {
                servers.push({
                    text: el.innerText,
                    html: el.outerHTML,
                    classes: el.className
                });
            });
            return servers;
        });

        console.log('\n🖥️  Potential Server Elements Found:', serverElements.length);
        console.log(JSON.stringify(serverElements, null, 2));

    } catch (e) {
        console.error(`❌ Error: ${e.message}`);
    } finally {
        await browser.close();
    }
}

extractServerList();
