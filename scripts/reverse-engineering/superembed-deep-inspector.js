const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const TMDB_ID = process.argv[2] || '550';
const TYPE = process.argv[3] || 'movie';
const SEASON = process.argv[4];
const EPISODE = process.argv[5];

let embedUrl = `https://vidsrc-embed.ru/embed/${TYPE}/${TMDB_ID}`;
if (TYPE === 'tv') {
    embedUrl += `/${SEASON}/${EPISODE}`;
}

console.log(`Target: ${embedUrl}`);

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920,1080',
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();

    // Anti-detection
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        window.chrome = { runtime: {} };
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: 'denied' }) :
                originalQuery(parameters)
        );
    });

    // Block known bad scripts
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        const url = req.url();
        if (url.includes('sbx.js') || url.includes('disable-devtool') || url.includes('dd.js')) {
            req.abort();
        } else {
            req.continue();
        }
    });

    // Capture responses
    page.on('response', async (response) => {
        const url = response.url();
        const status = response.status();
        const contentType = response.headers()['content-type'] || '';

        // console.log(`Response: ${status} ${url} (${contentType})`);

        if (url.includes('cloudnestra') || url.includes('vidsrc')) {
            if (contentType.includes('json') || contentType.includes('html') || contentType.includes('text')) {
                try {
                    const buffer = await response.buffer();
                    const text = buffer.toString('utf8');

                    if (text.includes('sources-list') || text.includes('server-name') || text.includes('Vidplay') || text.includes('MyCloud')) {
                        console.log(`\n[INTERESTING RESPONSE] ${url}`);
                        const filename = `response-${Date.now()}-${Math.floor(Math.random() * 1000)}.txt`;
                        fs.writeFileSync(path.join(__dirname, filename), `URL: ${url}\n\n${text}`);
                        console.log(`Saved to ${filename}`);
                    }
                } catch (e) {
                    // ignore
                }
            }
        }
    });

    try {
        console.log('Navigating to embed page...');
        await page.goto(embedUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        // Click Play on initial page if needed
        try {
            const playBtn = await page.waitForSelector('#pl_but', { timeout: 5000 });
            if (playBtn) {
                console.log('Clicking initial Play button...');
                await playBtn.click();
            }
        } catch (e) { }

        // Wait for frames to load
        await new Promise(r => setTimeout(r, 5000));

        // Recursive function to find and click toggle
        async function findAndClickToggle(frames) {
            for (const frame of frames) {
                try {
                    const toggle = await frame.$('.sources-toggle, .sources-toggle-2');
                    if (toggle) {
                        console.log(`Found toggle in frame: ${frame.url()}`);
                        await toggle.click();
                        console.log('Clicked toggle!');
                        await new Promise(r => setTimeout(r, 2000)); // Wait for animation/load

                        // Dump frame content
                        const content = await frame.content();
                        fs.writeFileSync(path.join(__dirname, `frame-after-click-${Date.now()}.html`), content);
                        console.log('Saved frame content after click.');

                        // Check for list
                        const list = await frame.$('.sources-list');
                        if (list) {
                            console.log('FOUND .sources-list!');
                            // Extract
                            const servers = await frame.evaluate(() => {
                                const items = document.querySelectorAll('.sources-list li');
                                return Array.from(items).map(li => ({
                                    name: li.querySelector('.server-name')?.innerText,
                                    hash: li.getAttribute('data-hash'),
                                    onclick: li.getAttribute('onclick'),
                                    class: li.className
                                }));
                            });
                            console.log('Extracted servers:', servers);
                            fs.writeFileSync(path.join(__dirname, 'extracted_inner_servers_deep.json'), JSON.stringify(servers, null, 2));
                        } else {
                            console.log('Toggle clicked but .sources-list NOT found immediately.');
                        }
                    }
                } catch (e) {
                    // ignore frame access errors
                }
                await findAndClickToggle(frame.childFrames());
            }
        }

        // Loop to handle redirects/clicks
        for (let i = 0; i < 5; i++) {
            console.log(`\n--- Iteration ${i} ---`);
            await findAndClickToggle(page.frames());

            // Also look for Play buttons in frames
            for (const frame of page.frames()) {
                try {
                    const play = await frame.$('#pl_but, .play-button, [id*="play"]');
                    if (play) {
                        const isVisible = await frame.evaluate(el => {
                            const style = window.getComputedStyle(el);
                            return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetHeight > 0;
                        }, play);

                        if (isVisible) {
                            console.log(`Found visible Play button in frame ${frame.url()}`);
                            await play.click();
                            await new Promise(r => setTimeout(r, 3000));
                        }
                    }
                } catch (e) { }
            }

            await new Promise(r => setTimeout(r, 2000));
        }

        // Final dump of all frames
        console.log('\nDumping all frames...');
        let frameIdx = 0;
        for (const frame of page.frames()) {
            try {
                const content = await frame.content();
                fs.writeFileSync(path.join(__dirname, `final-frame-${frameIdx}.html`), content);
                console.log(`Saved final-frame-${frameIdx}.html (${frame.url()})`);
                frameIdx++;
            } catch (e) { }
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
})();
