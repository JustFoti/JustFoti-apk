const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const TMDB_ID = process.argv[2];
const TYPE = process.argv[3] || 'movie'; // 'movie' or 'tv'
const SEASON = process.argv[4];
const EPISODE = process.argv[5];

if (!TMDB_ID) {
    console.error('Usage: node superembed-stealth-extractor.js <tmdb_id> [type] [season] [episode]');
    process.exit(1);
}

const EMBED_URL = TYPE === 'movie'
    ? `https://vidsrc-embed.ru/embed/movie/${TMDB_ID}`
    : `https://vidsrc-embed.ru/embed/tv/${TMDB_ID}/${SEASON}/${EPISODE}`;

const capturedSources = {
    m3u8: [],
    mp4: [],
    innerServers: [],
    allRequests: []
};

async function extractSources() {
    console.log(`\n🎬 Stealth Extraction for ${TYPE} ID: ${TMDB_ID}`);
    console.log(`📍 Initial URL: ${EMBED_URL}`);

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

    // Bypass DevTools detection
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

    // Console log capture
    page.on('console', msg => {
        const text = msg.text();
        if (!text.includes('console.clear')) {
            // console.log('PAGE LOG:', text);
        }
    });

    // Request interception
    await page.setRequestInterception(true);
    page.on('request', request => {
        const url = request.url();

        if (url.includes('.m3u8') || url.includes('.mp4')) {
            console.log(`\n🔥 FOUND SOURCE: ${url}`);
            if (url.includes('.m3u8')) capturedSources.m3u8.push(url);
            if (url.includes('.mp4')) capturedSources.mp4.push(url);
        }

        if (url.includes('sbx.js') || url.includes('disable-devtool') || url.includes('dd.js')) {
            // console.log(`🚫 Blocking detection script: ${url}`);
            request.abort();
            return;
        }

        request.continue();
    });

    try {
        console.log('⏳ Navigating...');
        await page.goto(EMBED_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        console.log('✅ Embed page loaded');

        // Recursive clicking loop
        let maxIterations = 20;
        let videoFound = false;

        for (let i = 0; i < maxIterations; i++) {
            console.log(`\n🔄 Iteration ${i + 1}/${maxIterations}`);

            // Wait for frames to load/stabilize
            await new Promise(r => setTimeout(r, 3000));

            const frames = page.frames();
            console.log(`   ℹ️  Frames detected: ${frames.length}`);

            // 1. Check for Inner Server List (NEW LOGIC)
            for (const frame of frames) {
                try {
                    // Check for toggle button first
                    const toggleBtn = await frame.$('.sources-toggle, .sources-toggle-2');
                    if (toggleBtn) {
                        console.log(`   🖱️  Found Sources Toggle in frame: ${frame.url()}. Clicking...`);
                        await toggleBtn.click();
                        await new Promise(r => setTimeout(r, 1000)); // Wait for list to open
                    }

                    const hasServerList = await frame.evaluate(() => {
                        return document.querySelector('.sources-list') !== null ||
                            document.querySelector('.server-name') !== null;
                    });

                    if (hasServerList) {
                        console.log(`\n📋 FOUND SERVER LIST in frame: ${frame.url()}`);

                        // Extract servers
                        const servers = await frame.evaluate(() => {
                            const items = document.querySelectorAll('.sources-list li');
                            return Array.from(items).map(li => ({
                                name: li.querySelector('.server-name')?.innerText?.trim() || li.innerText.trim(),
                                dataHash: li.getAttribute('data-hash'),
                                className: li.className,
                                onclick: li.getAttribute('onclick')
                            })).filter(s => s.name); // Filter empty
                        });

                        if (servers.length > 0) {
                            console.log('[SUCCESS] Extracted Inner Servers:', JSON.stringify(servers, null, 2));
                            capturedSources.innerServers = servers;

                            // Save HTML for analysis
                            const html = await frame.content();
                            fs.writeFileSync(`found-server-list-${Date.now()}.html`, html);
                        }
                    }
                } catch (e) { /* Ignore */ }
            }

            // 2. Check for Video Element
            for (const frame of frames) {
                try {
                    const video = await frame.$('video');
                    if (video) {
                        const src = await frame.evaluate(v => v.src || v.currentSrc, video);
                        if (src) {
                            console.log(`\n🎉 VIDEO ELEMENT FOUND in frame ${frame.url()}`);
                            console.log(`   Src: ${src}`);
                            if (src.includes('.m3u8')) capturedSources.m3u8.push(src);
                            if (src.includes('.mp4')) capturedSources.mp4.push(src);
                            videoFound = true;
                        }
                    }
                } catch (e) { /* Ignore */ }
            }

            if (videoFound) {
                console.log('✅ Video source found! Stopping loop.');
                break;
            }

            // 3. Find and Click Play Button
            let clicked = false;
            for (const frame of frames) {
                try {
                    const playBtn = await frame.$('#pl_but_background, #pl_but, .play-button');
                    if (playBtn) {
                        const isVisible = await frame.evaluate(el => {
                            const style = window.getComputedStyle(el);
                            return style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                        }, playBtn);

                        if (isVisible) {
                            console.log(`   🖱️  Clicking play button in frame: ${frame.url()}`);
                            await playBtn.click();
                            clicked = true;
                            await new Promise(r => setTimeout(r, 2000)); // Wait for reaction
                            break; // Click only one button per iteration
                        }
                    }
                } catch (e) { /* Ignore */ }
            }

            if (!clicked) {
                console.log('   ℹ️  No clickable play button found this iteration.');
                if (i > 5 && !videoFound && capturedSources.innerServers.length === 0) {
                    // If stuck and haven't found anything, maybe dump frames
                    console.log('   ⚠️  Stuck? Dumping HTML...');
                    // ... (dump logic if needed)
                }
            }
        }

    } catch (e) {
        console.error(`❌ Error: ${e.message}`);
        const html = await page.content();
        fs.writeFileSync(`debug-error-${Date.now()}.html`, html);
    } finally {
        await browser.close();

        // Save results
        const timestamp = Date.now();
        const filename = `superembed-stealth-${TMDB_ID}-${timestamp}.json`;
        fs.writeFileSync(filename, JSON.stringify(capturedSources, null, 2));
        console.log(`\n💾 Results saved to ${filename}`);
    }
}

extractSources();
